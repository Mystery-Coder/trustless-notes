import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/supabase"
import { getSessionUser } from "@/lib/auth"

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const username = await getSessionUser()
    const { id } = await params

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

    await supabase.from("notes").delete().eq("id", id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
