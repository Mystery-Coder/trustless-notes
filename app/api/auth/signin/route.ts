import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/supabase";

/**
 * Generates fake sentinel data for anti-enumeration.
 * Always returns deterministic-looking random bytes so timing
 * is indistinguishable from a real user lookup.
 */
function fakeSentinel() {
	// Generate random hex salt (32 chars = 16 bytes)
	const saltBytes = new Uint8Array(16);
	crypto.getRandomValues(saltBytes);
	const salt = Array.from(saltBytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

	// Random base64-ish sentinel cipher (simulate AES-GCM output ~32 bytes + 16 tag = 48 bytes)
	const cipherBytes = new Uint8Array(48);
	crypto.getRandomValues(cipherBytes);
	const sentinel_cipher = Buffer.from(cipherBytes).toString("base64");

	// Random 12-byte IV
	const ivBytes = new Uint8Array(12);
	crypto.getRandomValues(ivBytes);
	const sentinel_iv = Buffer.from(ivBytes).toString("base64");

	return { salt, sentinel_cipher, sentinel_iv };
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { username } = body;

		if (!username) {
			// Even for missing username, return fake data (no enumeration)
			return NextResponse.json(fakeSentinel());
		}

		const { data, error } = await supabase
			.from("users")
			.select("salt, sentinel_cipher, sentinel_iv")
			.eq("username", username)
			.single();

		if (error || !data) {
			// User not found — return fake sentinel to prevent enumeration
			return NextResponse.json(fakeSentinel());
		}

		return NextResponse.json({
			salt: data.salt,
			sentinel_cipher: data.sentinel_cipher,
			sentinel_iv: data.sentinel_iv,
		});
	} catch (err) {
		console.error("Signin route error:", err);
		return NextResponse.json(fakeSentinel());
	}
}
