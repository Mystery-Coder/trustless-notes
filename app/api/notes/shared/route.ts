import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/supabase";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    console.log("🔵 Shared notes API called");
    
    const username = await getSessionUser();
    console.log("🔵 Username:", username);

    // Get current user's ID
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .single();

    if (userError || !user) {
      console.log("🔴 User not found:", userError);
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    console.log("🔵 User ID:", user.id);

    // Fetch all shared notes where current user is the receiver
    const { data: sharedNotes, error: shareError } = await supabase
      .from("shared_notes")
      .select("*")
      .eq("receiver_id", user.id)
      .order("created_at", { ascending: false });

    if (shareError) {
      console.error("🔴 Fetch shared notes error:", shareError);
      return NextResponse.json(
        { error: "Failed to fetch shared notes" },
        { status: 500 }
      );
    }

    console.log("🔵 Raw shared notes from DB:", JSON.stringify(sharedNotes, null, 2));
    console.log("🔵 Number of shared notes found:", sharedNotes?.length || 0);

    if (!sharedNotes || sharedNotes.length === 0) {
      console.log("🔵 No shared notes found, returning empty array");
      return NextResponse.json({ sharedNotes: [] });
    }

    // Manually fetch sender usernames and note data
    const formattedNotes = await Promise.all(
      sharedNotes.map(async (shared) => {
        console.log("🔵 Processing shared note:", shared.id);
        
        // Fetch sender username
        const { data: sender } = await supabase
          .from("users")
          .select("username")
          .eq("id", shared.sender_id)
          .single();
        console.log("🔵 Sender:", sender?.username);

        // Fetch note data
        const { data: note } = await supabase
          .from("notes")
          .select("id, title_cipher, title_iv, content_cipher, content_iv, attachments_cipher, attachments_iv, created_at")
          .eq("id", shared.note_id)
          .single();
        console.log("🔵 Note found:", !!note);

        return {
          shareId: shared.id,
          noteId: shared.note_id,
          wrappedKeyCipher: shared.wrapped_notes,
          wrappedKeyIv: shared.wrapped_notes_iv,
          sharedAt: shared.created_at,
          sender: {
            username: sender?.username || "Unknown",
          },
          note: note ? {
            titleCipher: note.title_cipher,
            titleIv: note.title_iv,
            contentCipher: note.content_cipher,
            contentIv: note.content_iv,
            attachmentsCipher: note.attachments_cipher ?? null,   // new
            attachmentsIv: note.attachments_iv ?? null,           // new
            createdAt: note.created_at,
          } : null,
        };
      })
    );

    // Filter out any notes that failed to fetch
    const validNotes = formattedNotes.filter(n => n.note !== null);
    console.log("🔵 Final valid notes count:", validNotes.length);
    console.log("🔵 Returning:", JSON.stringify(validNotes, null, 2));
    
    return NextResponse.json({ 
      sharedNotes: validNotes 
    });

  } catch (err) {
    console.error("🔴 Get shared notes error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}