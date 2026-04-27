"use client";

import { useRef, useState } from "react";
import { DecryptedAttachment } from "@/store/notes";

interface ImageDockProps {
    attachments: DecryptedAttachment[];
    onAttachmentsChange?: (updated: DecryptedAttachment[]) => void;
    readOnly?: boolean;
}

export default function ImageDock({ attachments, onAttachmentsChange, readOnly = false }: ImageDockProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [lightbox, setLightbox] = useState<DecryptedAttachment | null>(null);

    // Hide dock entirely if read-only and nothing to show
    if (readOnly && attachments.length === 0) return null;

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        if (files.length === 0) return;

        const tooBig = files.filter((f) => f.size > 500 * 1024);
        if (tooBig.length > 0) {
            alert(`Some images are over 500 KB and may be too large:\n${tooBig.map((f) => f.name).join("\n")}`);
            return;
        }

        Promise.all(
            files.map(
                (file) =>
                    new Promise<DecryptedAttachment>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const blobUrl = reader.result as string;
                            resolve({ name: file.name, mimeType: file.type, blobUrl });
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    }),
            ),
        ).then((newAttachments) => {
            onAttachmentsChange?.([...attachments, ...newAttachments]);
            if (fileInputRef.current) fileInputRef.current.value = "";
        });
    }

    function handleRemove(index: number) {
        const updated = attachments.filter((_, i) => i !== index);
        onAttachmentsChange?.(updated);
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
                {attachments.map((a, i) => (
                    <div key={i} style={{ position: "relative", flexShrink: 0 }}>
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
                        {/* Remove button — only in edit mode */}
                        {!readOnly && (
                            <button
                                onClick={() => handleRemove(i)}
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
                        style={{
                            width: 60,
                            height: 60,
                            borderRadius: 6,
                            border: "1px dashed var(--border)",
                            background: "transparent",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--text-muted)",
                            fontSize: 20,
                            flexShrink: 0,
                        }}
                        title="Attach image"
                    >
                        +
                    </button>
                )}

                {/* Empty label — only in edit mode */}
                {!readOnly && attachments.length === 0 && (
                    <span
                        className="font-mono"
                        style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em" }}
                    >
                        No attachments · click + to add
                    </span>
                )}

                {/* Hidden file input */}
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