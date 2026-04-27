import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/supabase"
import { getSessionUser } from "@/lib/auth"

// GET — fetch all attachment metadata rows for a note (owner or shared recipient)
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const username = await getSessionUser()
    const { noteId } = await params

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .single()

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const { data: note } = await supabase
      .from("notes")
      .select("user_id")
      .eq("id", noteId)
      .single()

    if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 })

    const isOwner = note.user_id === user.id

    // If not owner, check if note is shared with this user
    if (!isOwner) {
      const { data: sharedRow } = await supabase
        .from("shared_notes")
        .select("id")
        .eq("note_id", noteId)
        .eq("receiver_id", user.id)
        .single()

      if (!sharedRow) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    const { data: attachments } = await supabase
      .from("attachments")
      .select("id, storage_path, iv, name, mime_type, created_at")
      .eq("note_id", noteId)
      .order("created_at", { ascending: true })

    return NextResponse.json({ attachments })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

// DELETE — remove attachment from Storage + DB (owner only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const username = await getSessionUser()
    const { noteId } = await params
    const { attachmentId, storagePath } = await req.json()

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .single()

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const { data: note } = await supabase
      .from("notes")
      .select("user_id")
      .eq("id", noteId)
      .single()

    if (!note || note.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { error: storageError } = await supabase.storage
      .from("attachments")
      .remove([storagePath])

    if (storageError) {
      console.error("Storage delete error:", storageError)
      return NextResponse.json({ error: "Storage delete failed" }, { status: 500 })
    }

    await supabase
      .from("attachments")
      .delete()
      .eq("id", attachmentId)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}