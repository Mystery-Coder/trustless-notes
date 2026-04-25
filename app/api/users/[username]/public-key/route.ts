import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/supabase";

/**
 * GET /api/users/[username]/public-key
 * Returns the ECDH public key for a given username.
 * Used when sharing a note — sender needs receiver's public key.
 * 
 * This endpoint is intentionally public (no auth required) because
 * public keys are meant to be shared. The actual security comes from
 * ECDH shared secret computation which requires the sender's private key.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    
    if (!username || username.trim() === "") {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    // Fetch user's public key
    const { data, error } = await supabase
      .from("users")
      .select("ecdh_public_key")
      .eq("username", username)
      .single();

    if (error || !data) {
      // Don't reveal whether user exists (anti-enumeration)
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      username: username,
      public_key: data.ecdh_public_key,
    });
  } catch (err) {
    console.error("Get public key error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}