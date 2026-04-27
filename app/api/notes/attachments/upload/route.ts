import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/supabase"
import { getSessionUser } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const username = await getSessionUser()

    const formData = await req.formData()
    const noteId = formData.get("noteId") as string
    const iv = formData.get("iv") as string
    const name = formData.get("name") as string
    const mimeType = formData.get("mimeType") as string
    const file = formData.get("file") as File

    if (!noteId || !iv || !name || !mimeType || !file) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    // Verify the note belongs to this user
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

    // Upload encrypted blob to Supabase Storage
    // Path: {userId}/{noteId}/{timestamp}_{filename}
    const storagePath = `${user.id}/${noteId}/${Date.now()}_${name}`
    const arrayBuffer = await file.arrayBuffer()

    const { error: uploadError } = await supabase.storage
      .from("attachments")
      .upload(storagePath, arrayBuffer, {
        contentType: "application/octet-stream", // always octet-stream — it's encrypted bytes
        upsert: false,
      })

    if (uploadError) {
      console.error("Storage upload error:", uploadError)
      return NextResponse.json({ error: "Upload failed" }, { status: 500 })
    }

    // Save metadata row to attachments table
    const { data: attachment } = await supabase
      .from("attachments")
      .insert({
        note_id: noteId,
        storage_path: storagePath,
        iv,
        name,
        mime_type: mimeType,
      })
      .select()
      .single()

    return NextResponse.json({ attachment })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}