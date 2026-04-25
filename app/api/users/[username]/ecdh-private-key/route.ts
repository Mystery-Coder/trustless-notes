import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/supabase";
import { getSessionUser } from "@/lib/auth";

/**
 * GET /api/users/[username]/ecdh-private-key
 * Returns the encrypted ECDH private key for the authenticated user.
 * Users can only fetch their OWN private key.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const authenticatedUser = await getSessionUser();
    const { username } = await params;

    // Users can only fetch their own encrypted private key
    if (authenticatedUser !== username) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("users")
      .select("ecdh_private_key_cipher, ecdh_private_key_iv")
      .eq("username", username)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ecdh_private_key_cipher: data.ecdh_private_key_cipher,
      ecdh_private_key_iv: data.ecdh_private_key_iv,
    });
  } catch (err) {
    console.error("Get ECDH private key error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}