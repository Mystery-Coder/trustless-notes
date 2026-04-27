import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/supabase"
import { getSessionUser } from "@/lib/auth"

export async function GET() {
  try {
    const username = await getSessionUser()

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .single()

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const { data: notes } = await supabase
      .from("notes")
      .select("id, title_cipher, title_iv, content_cipher, content_iv, wrapped_key_cipher, wrapped_key_iv, attachments_cipher, attachments_iv, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    return NextResponse.json({ notes })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
