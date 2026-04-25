"use client";

import { useState } from "react";
import {
  unwrapNoteKey,
  wrapNoteKeyForReceiver,
} from "@/lib/crypto";
import { useSessionStore } from "@/store/session";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteId: string;
  noteTitle: string;
  onShareSuccess: () => void;
}

export default function ShareModal({ 
  isOpen, 
  onClose, 
  noteId, 
  noteTitle,
  onShareSuccess 
}: ShareModalProps) {
  const { derivedKey, username: senderUsername } = useSessionStore();
  const [receiverUsername, setReceiverUsername] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  async function handleShare() {
    if (!receiverUsername.trim()) {
      setError("Please enter a username");
      return;
    }

    if (receiverUsername.trim() === senderUsername) {
      setError("You cannot share a note with yourself");
      return;
    }

    if (!derivedKey) {
      setError("Not authenticated");
      return;
    }

    setIsSharing(true);
    setError(null);

    try {
      // Step 1: Fetch receiver's public key
      const pubKeyRes = await fetch(`/api/users/${encodeURIComponent(receiverUsername.trim())}/public-key`);
      if (!pubKeyRes.ok) {
        throw new Error("User not found");
      }
      const { public_key: receiverPublicKey } = await pubKeyRes.json();

      // Step 2: Fetch the note to get its wrapped key
      const notesRes = await fetch("/api/notes");
      const { notes } = await notesRes.json();
      const note = notes.find((n: { id: string }) => n.id === noteId);
      
      if (!note) {
        throw new Error("Note not found");
      }

      // Step 3: Unwrap the note key using user's derived key
      const noteKey = await unwrapNoteKey(
        note.wrapped_key_cipher,
        note.wrapped_key_iv,
        derivedKey
      );

      // Step 4: Fetch sender's encrypted ECDH private key from DB
      const userRes = await fetch(`/api/users/${encodeURIComponent(senderUsername!)}/ecdh-private-key`);
      if (!userRes.ok) {
        throw new Error("Failed to fetch your ECDH keys");
      }
      const { ecdh_private_key_cipher, ecdh_private_key_iv } = await userRes.json();

      // Step 6: Compute shared secret and wrap note key for receiver
      const { wrappedKeyCipher, wrappedKeyIv } = await wrapNoteKeyForReceiver(
        noteKey,
        derivedKey,
        ecdh_private_key_cipher,
        ecdh_private_key_iv,
        receiverPublicKey
      );

      // Step 7: Save to shared_notes table
      const shareRes = await fetch("/api/notes/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverUsername: receiverUsername.trim(),
          noteId,
          wrappedNoteKeyCipher: wrappedKeyCipher,
          wrappedNoteKeyIv: wrappedKeyIv,
        }),
      });

      if (!shareRes.ok) {
        const errorData = await shareRes.json();
        throw new Error(errorData.error || "Failed to share note");
      }
      // After the shareRes.ok check
      console.log("✅ Share successful! Response:", await shareRes.json());

      setSuccess(true);
      onShareSuccess();
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setReceiverUsername("");
      }, 1500);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to share note";
      console.error("Share error:", err);
      setError(errorMessage);
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Share Note</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <p className="note-title-preview">“{noteTitle}”</p>
          
          <label className="label-mono">Recipient Username</label>
          <input
            type="text"
            className="input-field"
            placeholder="Enter username to share with"
            value={receiverUsername}
            onChange={(e) => setReceiverUsername(e.target.value)}
            disabled={isSharing}
            autoComplete="off"
          />

          {error && (
            <div className="badge-error" style={{ marginTop: 12 }}>
              {error}
            </div>
          )}

          {success && (
            <div className="badge-success" style={{ marginTop: 12 }}>
              ✓ Note shared successfully!
            </div>
          )}

          <div className="modal-footer">
            <button 
              className="btn btn-secondary" 
              onClick={onClose}
              disabled={isSharing}
            >
              Cancel
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleShare}
              disabled={isSharing || !receiverUsername.trim()}
            >
              {isSharing ? "Sharing..." : "Share Note"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}