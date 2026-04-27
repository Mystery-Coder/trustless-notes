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

    // Fetch all attachment storage paths for this note
    const { data: attachments } = await supabase
      .from("attachments")
      .select("storage_path")
      .eq("note_id", id)

    // Delete files from Storage if any exist
    if (attachments && attachments.length > 0) {
      const paths = attachments.map((a) => a.storage_path)
      const { error: storageError } = await supabase.storage
        .from("attachments")
        .remove(paths)

      if (storageError) {
        console.error("Storage cleanup error:", storageError)
        // Don't block note deletion if storage cleanup fails
      }
    }

    // Delete note — attachments rows cascade automatically
    await supabase.from("notes").delete().eq("id", id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}