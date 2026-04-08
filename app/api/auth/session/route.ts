import { NextRequest, NextResponse } from "next/server";
import { signValue } from "@/lib/auth";
import { supabase } from "@/lib/supabase/supabase";
import { createHash } from "crypto";

/**
 * POST — verifies sentinel proof and sets the signed username cookie.
 *
 * The client must send { username, sentinel_plaintext }.
 * The server hashes sentinel_plaintext with SHA-256 and compares
 * it against the stored sentinel_hash. Cookie is only issued
 * if the hashes match — proving the client decrypted the sentinel
 * (and therefore knows the password) without revealing the password.
 *
 * DELETE — clears the cookie (sign-out)
 */
export async function POST(req: NextRequest) {
	try {
		const { username, sentinel_plaintext } = await req.json();
		if (!username || !sentinel_plaintext) {
			return NextResponse.json(
				{ error: "Missing username or sentinel proof" },
				{ status: 400 },
			);
		}

		// Look up the stored sentinel_hash for this user
		const { data, error } = await supabase
			.from("users")
			.select("sentinel_hash")
			.eq("username", username)
			.single();

		if (error || !data?.sentinel_hash) {
			return NextResponse.json(
				{ error: "Invalid credentials" },
				{ status: 401 },
			);
		}

		// Hash the submitted plaintext and compare
		const submittedHash = createHash("sha256")
			.update(sentinel_plaintext)
			.digest("hex");

		// Constant-time comparison to prevent timing attacks
		if (submittedHash.length !== data.sentinel_hash.length) {
			return NextResponse.json(
				{ error: "Invalid credentials" },
				{ status: 401 },
			);
		}
		let mismatch = 0;
		for (let i = 0; i < submittedHash.length; i++) {
			mismatch |=
				submittedHash.charCodeAt(i) ^ data.sentinel_hash.charCodeAt(i);
		}
		if (mismatch !== 0) {
			return NextResponse.json(
				{ error: "Invalid credentials" },
				{ status: 401 },
			);
		}

		// Proof verified — issue signed session cookie
		const signed = signValue(username);

		const response = NextResponse.json({ ok: true });
		response.cookies.set("username", signed, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
			maxAge: 60 * 60 * 24 * 7, // 7 days
		});

		return response;
	} catch {
		return NextResponse.json({ error: "Bad request" }, { status: 400 });
	}
}

export async function DELETE() {
	const response = NextResponse.json({ ok: true });
	response.cookies.set("username", "", {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: 0, // expire immediately
	});
	return response;
}
