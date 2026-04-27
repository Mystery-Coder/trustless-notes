import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/supabase"
import { getSessionUser } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const username = await getSessionUser()
    const body = await req.json()
    const { 
      title_cipher, title_iv, 
      content_cipher, content_iv, 
      wrapped_key_cipher, wrapped_key_iv,
      attachments_cipher, attachments_iv  // new
    } = body

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .single()

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const { data: note } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        title_cipher,
        title_iv,
        content_cipher,
        content_iv,
        wrapped_key_cipher,
        wrapped_key_iv,
        attachments_cipher: attachments_cipher ?? null,  // new
        attachments_iv: attachments_iv ?? null
      })
      .select()
      .single()

    return NextResponse.json({ note })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
