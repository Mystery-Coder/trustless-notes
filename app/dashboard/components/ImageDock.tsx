"use client";

import { useRef, useState } from "react";
import { DecryptedAttachment } from "@/store/notes";
import { encryptBuffer } from "@/lib/crypto";

interface ImageDockProps {
    noteId: string
    noteKey: CryptoKey
    attachments: DecryptedAttachment[];
    onAttachmentAdded: (attachment: DecryptedAttachment) => void;
    onAttachmentRemoved: (attachmentId: string) => void;
    readOnly?: boolean;
}

export default function ImageDock({
    noteId,
    noteKey,
    attachments,
    onAttachmentAdded,
    onAttachmentRemoved,
    readOnly = false,
}: ImageDockProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [lightbox, setLightbox] = useState<DecryptedAttachment | null>(null);
    const [uploading, setUploading] = useState(false);

    if (readOnly && attachments.length === 0) return null;

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        if (files.length === 0) return;

        const tooBig = files.filter((f) => f.size > 5 * 1024 * 1024); // 5MB limit
        if (tooBig.length > 0) {
            alert(`Some images exceed 5 MB:\n${tooBig.map((f) => f.name).join("\n")}`);
            return;
        }

        setUploading(true);
        try {
            for (const file of files) {
                // 1. Read as ArrayBuffer — no base64
                const arrayBuffer = await file.arrayBuffer();

                // 2. Encrypt raw bytes with note key
                const { cipher, iv } = await encryptBuffer(noteKey, arrayBuffer);

                // 3. Build FormData and upload to our API
                const formData = new FormData();
                formData.append("noteId", noteId);
                formData.append("iv", iv);
                formData.append("name", file.name);
                formData.append("mimeType", file.type);
                formData.append("file", new Blob([cipher], { type: "application/octet-stream" }), file.name);

                const res = await fetch("/api/notes/attachments/upload", {
                    method: "POST",
                    body: formData,
                });

                if (!res.ok) {
                    console.error("Upload failed for", file.name);
                    continue;
                }

                const { attachment } = await res.json();

                // 4. Create blob URL from original (unencrypted) bytes for display
                const blobUrl = URL.createObjectURL(new Blob([arrayBuffer], { type: file.type }));

                onAttachmentAdded({
                    id: attachment.id,
                    name: file.name,
                    mimeType: file.type,
                    storagePath: attachment.storage_path,
                    blobUrl,
                });
            }
        } catch (err) {
            console.error("Failed to upload attachment:", err);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    async function handleRemove(attachment: DecryptedAttachment) {
        try {
            await fetch(`/api/notes/attachments/${noteId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    attachmentId: attachment.id,
                    storagePath: attachment.storagePath,
                }),
            });

            // Revoke blob URL to free memory
            URL.revokeObjectURL(attachment.blobUrl);
            onAttachmentRemoved(attachment.id);
        } catch (err) {
            console.error("Failed to remove attachment:", err);
        }
    }

    return (
        <>
            {/* Dock */}
            <div
                style={{
                    borderTop: "1px solid var(--border)",
                    padding: "10px 28px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    minHeight: 80,
                    background: "rgba(255,255,255,0.02)",
                    flexWrap: "wrap",
                }}
            >
                {/* Thumbnails */}
                {attachments.map((a) => (
                    <div key={a.id} style={{ position: "relative", flexShrink: 0 }}>
                        <img
                            src={a.blobUrl}
                            alt={a.name}
                            onClick={() => setLightbox(a)}
                            style={{
                                width: 80,
                                height: 80,
                                objectFit: "cover",
                                borderRadius: 6,
                                border: "1px solid var(--border)",
                                cursor: "pointer",
                                display: "block",
                            }}
                        />
                        {!readOnly && (
                            <button
                                onClick={() => handleRemove(a)}
                                style={{
                                    position: "absolute",
                                    top: -5,
                                    right: -5,
                                    width: 16,
                                    height: 16,
                                    borderRadius: "50%",
                                    background: "var(--accent)",
                                    border: "none",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 9,
                                    color: "#fff",
                                    lineHeight: 1,
                                }}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                ))}

                {/* Add button — only in edit mode */}
                {!readOnly && (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        style={{
                            width: 80,
                            height: 80,
                            borderRadius: 6,
                            border: "1px dashed var(--border)",
                            background: "transparent",
                            cursor: uploading ? "not-allowed" : "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--text-muted)",
                            fontSize: uploading ? 10 : 24,
                            flexShrink: 0,
                            gap: 4,
                            opacity: uploading ? 0.5 : 1,
                        }}
                        title="Attach image"
                    >
                        {uploading ? (
                            <>
                                <div className="spinner" />
                                <span style={{ fontSize: 9 }}>uploading</span>
                            </>
                        ) : "+"}
                    </button>
                )}

                {/* Empty label */}
                {!readOnly && attachments.length === 0 && !uploading && (
                    <span
                        className="font-mono"
                        style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em" }}
                    >
                        No attachments · click + to add
                    </span>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                />
            </div>

            {/* Lightbox */}
            {lightbox && (
                <div
                    onClick={() => setLightbox(null)}
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.85)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1000,
                        cursor: "zoom-out",
                    }}
                >
                    <img
                        src={lightbox.blobUrl}
                        alt={lightbox.name}
                        style={{
                            maxWidth: "90vw",
                            maxHeight: "90vh",
                            objectFit: "contain",
                            borderRadius: 8,
                            boxShadow: "0 0 60px rgba(0,0,0,0.8)",
                        }}
                    />
                    <span
                        className="font-mono"
                        style={{
                            position: "absolute",
                            bottom: 24,
                            fontSize: 12,
                            color: "rgba(255,255,255,0.4)",
                            letterSpacing: "0.06em",
                        }}
                    >
                        {lightbox.name} · click anywhere to close
                    </span>
                </div>
            )}
        </>
    );
}