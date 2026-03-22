import { NextRequest, NextResponse } from "next/server";
import { signValue } from "@/lib/auth";

/**
 * POST — sets the signed username cookie (called AFTER successful client-side decryption)
 * DELETE — clears the cookie (sign-out)
 */
export async function POST(req: NextRequest) {
	try {
		const { username } = await req.json();
		if (!username) {
			return NextResponse.json({ error: "Missing username" }, { status: 400 });
		}

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
