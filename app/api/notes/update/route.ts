import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/supabase"
import { getSessionUser } from "@/lib/auth"

export async function PATCH(req: NextRequest) {
  try {
    const username = await getSessionUser()
    const body = await req.json()
    const { id, ...updates } = body

    // verify ownership
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .single()

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const { data: note } = await supabase
      .from("notes")
      .select("user_id")
      .eq("id", id)
      .single()

    if (!note || note.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: updated } = await supabase
      .from("notes")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    return NextResponse.json({ note: updated })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
