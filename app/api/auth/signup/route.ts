import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/supabase";

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const {
			username,
			salt,
			sentinel_cipher,
			sentinel_iv,
			ecdh_public_key,
			ecdh_private_key_cipher,
			ecdh_private_key_iv,
		} = body;

		if (!username || !salt || !sentinel_cipher || !sentinel_iv) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 },
			);
		}

		const { data, error } = await supabase
			.from("users")
			.insert({
				username,
				salt,
				sentinel_cipher,
				sentinel_iv,
				ecdh_public_key,
				ecdh_private_key_cipher,
				ecdh_private_key_iv,
			})
			.select("id, username")
			.single();

		if (error) {
			// Postgres unique violation code
			if (error.code === "23505") {
				return NextResponse.json(
					{ error: "Username taken" },
					{ status: 409 },
				);
			}
			console.error("Supabase insert error:", error);
			return NextResponse.json(
				{ error: "Server error" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ id: data.id, username: data.username });
	} catch (err) {
		console.error("Signup route error:", err);
		return NextResponse.json({ error: "Server error" }, { status: 500 });
	}
}
