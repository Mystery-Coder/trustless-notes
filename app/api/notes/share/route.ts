import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/supabase";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const senderUsername = await getSessionUser();
    
    const body = await req.json();
    const { 
      receiverUsername, 
      noteId, 
      wrappedNoteKeyCipher,
      wrappedNoteKeyIv 
    } = body;

    console.log("🔵 Share API - Request body:", { receiverUsername, noteId, wrappedNoteKeyCipher, wrappedNoteKeyIv });
    console.log("🔵 Share API - Sender username:", senderUsername);

    // Validate required fields
    if (!receiverUsername || !noteId || !wrappedNoteKeyCipher || !wrappedNoteKeyIv) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Cannot share with yourself
    if (senderUsername === receiverUsername) {
      return NextResponse.json(
        { error: "Cannot share a note with yourself" },
        { status: 400 }
      );
    }

    // Get sender's user ID
    const { data: sender, error: senderError } = await supabase
      .from("users")
      .select("id")
      .eq("username", senderUsername)
      .single();

    if (senderError || !sender) {
      console.error("Sender not found:", senderError);
      return NextResponse.json(
        { error: "Sender not found" },
        { status: 404 }
      );
    }
    console.log("🔵 Sender ID:", sender.id);

    // Get receiver's user ID
    const { data: receiver, error: receiverError } = await supabase
      .from("users")
      .select("id")
      .eq("username", receiverUsername)
      .single();

    if (receiverError || !receiver) {
      console.error("Receiver not found:", receiverError);
      return NextResponse.json(
        { error: "Receiver not found" },
        { status: 404 }
      );
    }
    console.log("🔵 Receiver ID:", receiver.id);

    // Verify that the note belongs to sender
    const { data: note, error: noteError } = await supabase
      .from("notes")
      .select("id, user_id")
      .eq("id", noteId)
      .single();

    if (noteError || !note) {
      console.error("Note not found:", noteError);
      return NextResponse.json(
        { error: "Note not found" },
        { status: 404 }
      );
    }

    if (note.user_id !== sender.id) {
      console.error("Note does not belong to sender. Note user_id:", note.user_id, "Sender ID:", sender.id);
      return NextResponse.json(
        { error: "You can only share notes you own" },
        { status: 403 }
      );
    }
    console.log("🔵 Note verified, belongs to sender");

    // Check if already shared with this receiver
    const { data: existingShare, error: existingError } = await supabase
      .from("shared_notes")
      .select("id")
      .eq("note_id", noteId)
      .eq("receiver_id", receiver.id)
      .maybeSingle(); // Use maybeSingle instead of single to avoid errors

    if (existingShare) {
      console.log("Note already shared with this user");
      return NextResponse.json(
        { error: "Note already shared with this user" },
        { status: 409 }
      );
    }

    // Store the shared note
    const { data: sharedNote, error: shareError } = await supabase
      .from("shared_notes")
      .insert({
        note_id: noteId,
        sender_id: sender.id,
        receiver_id: receiver.id,
        wrapped_notes: wrappedNoteKeyCipher,
        wrapped_notes_iv: wrappedNoteKeyIv,
      })
      .select()
      .single();

    if (shareError) {
      console.error("Share insert error:", shareError);
      return NextResponse.json(
        { error: "Failed to share note: " + shareError.message },
        { status: 500 }
      );
    }

    console.log("🔵 Share successful! Shared note ID:", sharedNote.id);
    return NextResponse.json({ 
      success: true, 
      shared: true,
      sharedNoteId: sharedNote.id 
    });
    
  } catch (err) {
    console.error("🔴 Share note error:", err);
    return NextResponse.json(
      { error: "Server error: " + (err instanceof Error ? err.message : "Unknown error") },
      { status: 500 }
    );
  }
}