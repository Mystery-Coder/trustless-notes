"use client";

import { useEffect, useState } from "react";
import { decrypt } from "@/lib/crypto";
import { SharedDecryptedNote } from "@/store/sharedNotes";

function SharedNoteEditor({
  activeNote,
}: {
  activeNote: SharedDecryptedNote;
}) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  // Decrypt content when active note changes
  useEffect(() => {
    let cancelled = false;

    async function decryptContent() {
      setLoading(true);

      try {
        const plaintext = await decrypt(
          activeNote.noteKey,
          activeNote.content_cipher,
          activeNote.content_iv,
        );

        if (!cancelled) {
          setContent(plaintext);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setContent("[Failed to decrypt content]");
          setLoading(false);
        }
      }
    }

    decryptContent();

    return () => {
      cancelled = true;
    };
  }, [activeNote.noteId, activeNote.content_cipher, activeNote.content_iv, activeNote.noteKey]);

  if (loading) {
    return (
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="badge-loading">
          <div className="spinner" />
          Decrypting shared note…
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: 0,
        overflow: "hidden",
      }}
    >
      {/* Title bar with sender info */}
      <div
        style={{
          padding: "16px 28px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <h2
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: "var(--text-primary)",
            margin: 0,
            marginBottom: 8,
          }}
        >
          {activeNote.title || "Untitled"}
        </h2>
        <div
          className="font-mono"
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span>Shared by: {activeNote.senderUsername}</span>
          <span>•</span>
          <span>Shared: {new Date(activeNote.sharedAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Content editor (readonly for shared notes) */}
      <textarea
        value={content}
        readOnly
        style={{
          flex: 1,
          background: "rgba(255,255,255,0.02)",
          border: "none",
          outline: "none",
          resize: "none",
          padding: "20px 28px",
          fontSize: 14,
          lineHeight: 1.8,
          color: "var(--text-secondary)",
          fontFamily: "var(--font-sans)",
          cursor: "default",
        }}
      />
      
      {/* Read-only indicator */}
      <div
        style={{
          padding: "12px 28px",
          borderTop: "1px solid var(--border)",
          fontSize: 11,
          color: "var(--text-muted)",
          textAlign: "center",
          fontFamily: "monospace",
        }}
      >
        🔒 This note is shared with you · Read only
      </div>
    </main>
  );
}

export default SharedNoteEditor;