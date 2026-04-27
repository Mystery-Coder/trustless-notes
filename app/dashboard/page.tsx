"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Tooltip } from "@radix-ui/themes";
import { useSessionStore } from "@/store/session";
import ShareModal from "./components/ShareModal";
import { useSharedNotesStore, SharedDecryptedNote } from "@/store/sharedNotes";
import SharedNoteEditor from "./components/SharedNoteEditor";
import { encrypt, decrypt, wrapNoteKey, unwrapNoteKey, unwrapNoteKeyFromSender, encryptAttachments, decryptAttachments } from "@/lib/crypto";
import { useNotesStore, DecryptedNote, DecryptedAttachment } from "@/store/notes";
import ImageDock from "./components/ImageDock";

/* ─── Icons ──────────────────────────────────────────────────── */
function LockIcon() {
	return (
		<svg
			width="56"
			height="56"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.25"
			strokeLinecap="round"
			strokeLinejoin="round"
			style={{ color: "var(--text-muted)" }}
		>
			<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
			<path d="M7 11V7a5 5 0 0 1 10 0v4" />
		</svg>
	);
}

function PlusIcon() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.5"
			strokeLinecap="round"
		>
			<path d="M12 5v14M5 12h14" />
		</svg>
	);
}

function TrashIcon() {
	return (
		<svg
			width="13"
			height="13"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<polyline points="3 6 5 6 21 6" />
			<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
		</svg>
	);
}

function ShareIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

/* ─── Editor Component ───────────────────────────────────────── */
function NoteEditor({
	activeNote,
	derivedKey,
}: {
	activeNote: DecryptedNote;
	derivedKey: CryptoKey;
}) {
	const { updateNote } = useNotesStore();
	const [content, setContent] = useState("");
	const [title, setTitle] = useState("");
	const [loading, setLoading] = useState(true);

	// Decrypt content when active note changes
	useEffect(() => {
		let cancelled = false;
		setLoading(true);

		decrypt(
			activeNote.noteKey,
			activeNote.content_cipher,
			activeNote.content_iv,
		)
			.then((plaintext) => {
				if (!cancelled) {
					setContent(plaintext);
					setTitle(activeNote.title);
					setLoading(false);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setContent("");
					setTitle(activeNote.title);
					setLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [activeNote.id]); // eslint-disable-line react-hooks/exhaustive-deps

	// Auto-save content on change (800ms debounce)
	useEffect(() => {
		if (loading) return;
		const timer = setTimeout(async () => {
			try {
				const { cipher, iv } = await encrypt(
					activeNote.noteKey,
					content,
				);
				await fetch("/api/notes/update", {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						id: activeNote.id,
						content_cipher: cipher,
						content_iv: iv,
					}),
				});
				updateNote(activeNote.id, {
					content_cipher: cipher,
					content_iv: iv,
				});
			} catch (err) {
				console.error("Auto-save content failed:", err);
			}
		}, 800);
		return () => clearTimeout(timer);
	}, [content, loading, activeNote.id, activeNote.noteKey, updateNote]);

	// Auto-save title on change (800ms debounce)
	useEffect(() => {
		if (loading) return;
		const timer = setTimeout(async () => {
			try {
				const { cipher: title_cipher, iv: title_iv } = await encrypt(
					activeNote.noteKey,
					title,
				);
				await fetch("/api/notes/update", {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						id: activeNote.id,
						title_cipher,
						title_iv,
					}),
				});
				updateNote(activeNote.id, { title });
			} catch (err) {
				console.error("Auto-save title failed:", err);
			}
		}, 800);
		return () => clearTimeout(timer);
	}, [title, loading, activeNote.id, activeNote.noteKey, updateNote]);

	// Called by ImageDock when user adds or removes an image
    async function handleAttachmentsChange(updated: DecryptedAttachment[]) {
        try {
            // Convert blob URLs back to raw base64 for encryption
            const raw = updated.map((a) => ({
                name: a.name,
                mimeType: a.mimeType,
                data: a.blobUrl.split(",")[1], // strip the data:mime;base64, prefix
            }));

            const { cipher, iv } = await encryptAttachments(raw, activeNote.noteKey);

            await fetch("/api/notes/update", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: activeNote.id,
                    attachments_cipher: cipher,
                    attachments_iv: iv,
                }),
            });

            updateNote(activeNote.id, {
                attachments: updated,
                attachments_cipher: cipher,
                attachments_iv: iv,
            });
        } catch (err) {
            console.error("Failed to save attachments:", err);
        }
    }

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
					Decrypting note…
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
			{/* Title bar */}
			<div
				style={{
					padding: "16px 28px",
					borderBottom: "1px solid var(--border)",
				}}
			>
				<input
					id="note-title-input"
					type="text"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					className="font-mono"
					placeholder="Untitled"
					style={{
						background: "transparent",
						border: "none",
						outline: "none",
						fontSize: 18,
						fontWeight: 500,
						color: "var(--text-primary)",
						width: "100%",
						letterSpacing: "0.02em",
					}}
				/>
			</div>

			{/* Content editor */}
			<textarea
				id="note-content-editor"
				value={content}
				onChange={(e) => setContent(e.target.value)}
				placeholder="Start typing your encrypted note…"
				style={{
					flex: 1,
					maxHeight: "60vh",
					background: "transparent",
					border: "none",
					outline: "none",
					resize: "none",
					padding: "20px 28px",
					fontSize: 14,
					lineHeight: 1.8,
					color: "var(--text-primary)",
					fontFamily: "var(--font-sans)",
				}}
			/>
			{/* Image dock */}
            <ImageDock
                attachments={activeNote.attachments ?? []}
                onAttachmentsChange={handleAttachmentsChange}
			/>
		</main>
	);
}

/* ─── Dashboard Page ─────────────────────────────────────────── */
export default function DashboardPage() {
	const router = useRouter();
	const { username, derivedKey, clearSession } = useSessionStore();
	const {
		notes,
		activeNoteId,
		setNotes,
		addNote,
		deleteNote,
		setActiveNoteId,
	} = useNotesStore();
	const [loadingNotes, setLoadingNotes] = useState(true);
	const [isShareModalOpen, setIsShareModalOpen] = useState(false);
	const [selectedNoteForShare, setSelectedNoteForShare] = useState<DecryptedNote | null>(null);
	
	// Shared notes state
	const [activeTab, setActiveTab] = useState<"my" | "shared">("my");
	const [loadingSharedNotes, setLoadingSharedNotes] = useState(false);
	const { 
		sharedNotes, 
		activeSharedNoteId, 
		setSharedNotes, 
		setActiveSharedNoteId,
		clearSharedNotes 
	} = useSharedNotesStore();

	const activeNote = notes.find((n) => n.id === activeNoteId);
	const activeSharedNote = activeTab === "shared" 
	  ? sharedNotes.find((n) => n.shareId === activeSharedNoteId)
	  : null;

	// Guard: redirect if no session (derivedKey is lost on refresh since it's in-memory)
	useEffect(() => {
		if (!username || !derivedKey) {
			// Clear stale cookie if it exists
			fetch("/api/auth/session", { method: "DELETE" });
			clearSession();
			clearSharedNotes();
			router.replace("/signin");
		}
	}, [username, derivedKey, router, clearSession, clearSharedNotes]);

	// Load and decrypt notes on mount
	useEffect(() => {
		if (!derivedKey) return;
		loadNotes();
	}, [derivedKey]); // eslint-disable-line react-hooks/exhaustive-deps

	// Load shared notes when switching to shared tab
	useEffect(() => {
		if (activeTab === "shared" && derivedKey && username) {
			loadSharedNotes();
		}
	}, [activeTab, derivedKey, username]);

	async function loadNotes() {
		try {
			setLoadingNotes(true);
			const res = await fetch("/api/notes");
			const { notes: encryptedNotes } = await res.json();

			if (!encryptedNotes || encryptedNotes.length === 0) {
				setNotes([]);
				setLoadingNotes(false);
				return;
			}

			const decrypted: DecryptedNote[] = await Promise.all(
				encryptedNotes.map(async (note: any) => {
					const noteKey = await unwrapNoteKey(
						note.wrapped_key_cipher,
						note.wrapped_key_iv,
						derivedKey!,
					);
					const title = await decrypt(
						noteKey,
						note.title_cipher,
						note.title_iv,
					);
					// Decrypt attachments if they exist
					let attachments: DecryptedAttachment[] = [];
					if (note.attachments_cipher && note.attachments_iv) {
						const raw = await decryptAttachments(
							note.attachments_cipher,
							note.attachments_iv,
							noteKey,
						);
						attachments = raw.map((a) => ({
							name: a.name,
							mimeType: a.mimeType,
							blobUrl: `data:${a.mimeType};base64,${a.data}`,
						}));
					}
					return {
						id: note.id,
						title,
						content_cipher: note.content_cipher,
						content_iv: note.content_iv,
						noteKey,
						created_at: note.created_at,
						attachments_cipher: note.attachments_cipher ?? null,
						attachments_iv: note.attachments_iv ?? null,
						attachments,
					};
				}),
			);

			setNotes(decrypted);
			if (decrypted.length > 0 && activeTab === "my") setActiveNoteId(decrypted[0].id);
		} catch (err) {
			console.error("Failed to load notes:", err);
		} finally {
			setLoadingNotes(false);
		}
	}

	async function loadSharedNotes() {
		if (!derivedKey || !username) return;
		
		try {
			setLoadingSharedNotes(true);
			const res = await fetch("/api/notes/shared");
			if (!res.ok) {
				throw new Error("Failed to load shared notes");
			}
			
			const { sharedNotes: encryptedSharedNotes } = await res.json();
			
			if (!encryptedSharedNotes || encryptedSharedNotes.length === 0) {
				setSharedNotes([]);
				return;
			}
			
			// Fetch current user's ECDH private key for unwrapping
			const userRes = await fetch(`/api/users/${encodeURIComponent(username)}/ecdh-private-key`);
			if (!userRes.ok) {
				throw new Error("Failed to fetch your ECDH keys");
			}
			const { ecdh_private_key_cipher, ecdh_private_key_iv } = await userRes.json();
			
			// For each shared note, unwrap the note key and decrypt title
			// In the map function inside loadSharedNotes, add safety checks
            const decryptedSharedNotes: SharedDecryptedNote[] = await Promise.all(
		    encryptedSharedNotes
			.filter((sharedNote: any) => sharedNote.note !== null) // Filter out invalid notes
			.map(async (sharedNote: any) => {
			// Fetch sender's public key
			const senderRes = await fetch(`/api/users/${encodeURIComponent(sharedNote.sender.username)}/public-key`);
			const { public_key: senderPublicKey } = await senderRes.json();
			
			// Unwrap note key using receiver's private key + sender's public key
			const noteKey = await unwrapNoteKeyFromSender(
				sharedNote.wrappedKeyCipher,
				sharedNote.wrappedKeyIv,
				derivedKey,
				ecdh_private_key_cipher,
				ecdh_private_key_iv,
				senderPublicKey
			);

			// Decrypt title
			const title = await decrypt(
				noteKey,
				sharedNote.note.titleCipher,
				sharedNote.note.titleIv
			);

			// Decrypt attachments if they exist
			let attachments: DecryptedAttachment[] = [];
			if (sharedNote.note.attachmentsCipher && sharedNote.note.attachmentsIv) {
				const raw = await decryptAttachments(
					sharedNote.note.attachmentsCipher,
					sharedNote.note.attachmentsIv,
					noteKey,
				);
				attachments = raw.map((a) => ({
					name: a.name,
					mimeType: a.mimeType,
					blobUrl: `data:${a.mimeType};base64,${a.data}`,
				}));
			}

      
			
      
			return {
				shareId: sharedNote.shareId,
				noteId: sharedNote.noteId,
				title,
				content_cipher: sharedNote.note.contentCipher,
				content_iv: sharedNote.note.contentIv,
				noteKey,
				senderUsername: sharedNote.sender.username,
				sharedAt: sharedNote.sharedAt,
				createdAt: sharedNote.note.createdAt,
				attachments,
			};
       })
	);
			
			setSharedNotes(decryptedSharedNotes);
			if (decryptedSharedNotes.length > 0 && activeTab === "shared") {
				setActiveSharedNoteId(decryptedSharedNotes[0].shareId);
			}
		} catch (err) {
			console.error("Failed to load shared notes:", err);
		} finally {
			setLoadingSharedNotes(false);
		}
	}

	async function createNote() {
		if (!derivedKey) return;

		try {
			// 1. Generate per-note AES key
			const noteKey = await window.crypto.subtle.generateKey(
				{ name: "AES-GCM", length: 256 },
				true,
				["encrypt", "decrypt"],
			);

			// 2. Encrypt default title + empty content
			const { cipher: title_cipher, iv: title_iv } = await encrypt(
				noteKey,
				"Untitled",
			);
			const { cipher: content_cipher, iv: content_iv } = await encrypt(
				noteKey,
				"",
			);

			// 3. Wrap noteKey with derivedKey
			const { cipher: wrapped_key_cipher, iv: wrapped_key_iv } =
				await wrapNoteKey(noteKey, derivedKey);

			// 4. Save to DB
			const res = await fetch("/api/notes/create", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title_cipher,
					title_iv,
					content_cipher,
					content_iv,
					wrapped_key_cipher,
					wrapped_key_iv,
				}),
			});
			const { note } = await res.json();

			// 5. Add to Zustand
			addNote({
				id: note.id,
				title: "Untitled",
				content_cipher,
				content_iv,
				noteKey,
				created_at: note.created_at,
			});
			setActiveNoteId(note.id);
			// Switch to My Notes tab after creating
			setActiveTab("my");
		} catch (err) {
			console.error("Failed to create note:", err);
		}
	}

	async function handleDeleteNote(noteId: string) {
		try {
			await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
			deleteNote(noteId);
		} catch (err) {
			console.error("Failed to delete note:", err);
		}
	}

	async function handleSignOut() {
		// Clear server-side cookie
		await fetch("/api/auth/session", { method: "DELETE" });
		clearSession();
		clearSharedNotes();
		router.push("/");
	}

	if (!username) return null; // Prevent flash before redirect

	return (
		<>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					minHeight: "100vh",
				}}
			>
				{/* Top bar */}
				<header className="topbar">
					<div
						className="font-mono"
						style={{
							fontSize: 13,
							color: "var(--text-primary)",
							letterSpacing: "0.06em",
						}}
					>
						trustless<span style={{ color: "var(--accent)" }}>.</span>
						notes
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: 16 }}>
						<div
							className="font-mono"
							style={{
								fontSize: 12,
								color: "var(--text-secondary)",
								display: "flex",
								alignItems: "center",
								gap: 8,
							}}
						>
							<span
								style={{
									width: 6,
									height: 6,
									borderRadius: "50%",
									background: "#22c55e",
									boxShadow: "0 0 6px #22c55e",
									display: "inline-block",
								}}
							/>
							{username}
						</div>

						<button
							id="signout-btn"
							onClick={handleSignOut}
							className="btn btn-ghost"
							style={{ fontSize: 12, padding: "7px 14px" }}
						>
							Sign Out
						</button>
					</div>
				</header>

				{/* Body */}
				<div style={{ display: "flex", flex: 1 }}>
					{/* Sidebar */}
					<aside className="sidebar">
						{/* Tab Switcher */}
						<div style={{ display: "flex", gap: 8, marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
							<button
								onClick={() => setActiveTab("my")}
								style={{
									flex: 1,
									background: activeTab === "my" ? "rgba(230, 57, 70, 0.1)" : "transparent",
									border: activeTab === "my" ? "1px solid rgba(230, 57, 70, 0.3)" : "1px solid var(--border)",
									borderRadius: 6,
									padding: "8px 12px",
									fontSize: 12,
									fontWeight: 500,
									color: activeTab === "my" ? "var(--accent)" : "var(--text-secondary)",
									cursor: "pointer",
									fontFamily: "monospace",
								}}
							>
								My Notes
							</button>
							<button
								onClick={() => setActiveTab("shared")}
								style={{
									flex: 1,
									background: activeTab === "shared" ? "rgba(230, 57, 70, 0.1)" : "transparent",
									border: activeTab === "shared" ? "1px solid rgba(230, 57, 70, 0.3)" : "1px solid var(--border)",
									borderRadius: 6,
									padding: "8px 12px",
									fontSize: 12,
									fontWeight: 500,
									color: activeTab === "shared" ? "var(--accent)" : "var(--text-secondary)",
									cursor: "pointer",
									fontFamily: "monospace",
								}}
							>
								Shared with me {sharedNotes.length > 0 && `(${sharedNotes.length})`}
							</button>
						</div>

						{activeTab === "my" ? (
							<>
								<div
									className="font-mono"
									style={{
										fontSize: 11,
										letterSpacing: "0.1em",
										textTransform: "uppercase",
										color: "var(--text-muted)",
										padding: "4px 12px",
										marginBottom: 8,
									}}
								>
									My Notes
								</div>

								<Tooltip content="Create New Note" delayDuration={100}>
									<button
										id="new-note-btn"
										className="btn btn-secondary"
										style={{
											width: "100%",
											justifyContent: "flex-start",
											gap: 10,
											fontSize: 13,
											padding: "10px 14px",
										}}
										onClick={createNote}
									>
										<PlusIcon />
										New Note
									</button>
								</Tooltip>

								{loadingNotes ? (
									<div style={{ padding: "20px 12px", display: "flex", alignItems: "center", gap: 10 }}>
										<div className="spinner" />
										<span className="font-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
											Decrypting…
										</span>
									</div>
								) : notes.length === 0 ? (
									<div style={{ padding: "20px 12px", textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
										No notes yet. Create one!
									</div>
								) : (
									<ul style={{ listStyle: "none", marginTop: 4 }}>
										{notes.map((note) => (
											<li key={note.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
												<button
													className="btn btn-ghost"
													onClick={() => setActiveNoteId(note.id)}
													style={{
														flex: 1,
														fontSize: 13,
														textAlign: "left",
														justifyContent: "flex-start",
														padding: "8px 12px",
														background: note.id === activeNoteId ? "rgba(230, 57, 70, 0.08)" : "transparent",
														color: note.id === activeNoteId ? "var(--accent)" : "var(--text-secondary)",
														borderRadius: 6,
														overflow: "hidden",
														textOverflow: "ellipsis",
														whiteSpace: "nowrap",
													}}
												>
													{note.title || "Untitled"}
												</button>
												
												<Tooltip content="Share" delayDuration={200}>
													<button
														className="btn btn-ghost"
														onClick={() => {
															setSelectedNoteForShare(note);
															setIsShareModalOpen(true);
														}}
														style={{ padding: "6px 8px", color: "var(--text-muted)", flexShrink: 0 }}
													>
														<ShareIcon />
													</button>
												</Tooltip>
												
												<Tooltip content="Delete" delayDuration={200}>
													<button
														className="btn btn-ghost"
														onClick={() => handleDeleteNote(note.id)}
														style={{ padding: "6px 8px", color: "var(--text-muted)", flexShrink: 0 }}
													>
														<TrashIcon />
													</button>
												</Tooltip>
											</li>
										))}
									</ul>
								)}
							</>
						) : (
							<>
								<div
									className="font-mono"
									style={{
										fontSize: 11,
										letterSpacing: "0.1em",
										textTransform: "uppercase",
										color: "var(--text-muted)",
										padding: "4px 12px",
										marginBottom: 8,
									}}
								>
									Shared with me
								</div>

								{loadingSharedNotes ? (
									<div style={{ padding: "20px 12px", display: "flex", alignItems: "center", gap: 10 }}>
										<div className="spinner" />
										<span className="font-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
											Loading shared notes…
										</span>
									</div>
								) : sharedNotes.length === 0 ? (
									<div style={{ padding: "20px 12px", textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
										No notes shared with you yet
									</div>
								) : (
									<ul style={{ listStyle: "none", marginTop: 4 }}>
										{sharedNotes.map((note) => (
											<li key={note.shareId} style={{ display: "flex", alignItems: "center", gap: 4 }}>
												<button
													className="btn btn-ghost"
													onClick={() => setActiveSharedNoteId(note.shareId)}
													style={{
														flex: 1,
														fontSize: 13,
														textAlign: "left",
														justifyContent: "flex-start",
														padding: "8px 12px",
														background: note.shareId === activeSharedNoteId ? "rgba(230, 57, 70, 0.08)" : "transparent",
														color: note.shareId === activeSharedNoteId ? "var(--accent)" : "var(--text-secondary)",
														borderRadius: 6,
														overflow: "hidden",
														textOverflow: "ellipsis",
														whiteSpace: "nowrap",
													}}
												>
													{note.title || "Untitled"}
													<span style={{ marginLeft: 8, fontSize: 10, color: "var(--text-muted)" }}>
														from {note.senderUsername}
													</span>
												</button>
											</li>
										))}
									</ul>
								)}
							</>
						)}
					</aside>

					{/* Main content */}
					{activeTab === "my" ? (
						activeNote && derivedKey ? (
							<NoteEditor key={activeNote.id} activeNote={activeNote} derivedKey={derivedKey} />
						) : (
							<main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, padding: 40 }}>
								<LockIcon />
								<h2 style={{ fontSize: 18, fontWeight: 500, color: "var(--text-secondary)", textAlign: "center" }}>
									{loadingNotes ? "Loading notes…" : notes.length === 0 ? "Create your first note" : "Select a note"}
								</h2>
								{!loadingNotes && notes.length === 0 && (
									<button className="btn btn-primary" onClick={createNote} style={{ marginTop: 8 }}>
										Create Note
									</button>
								)}
								<div className="font-mono" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(34, 197, 94, 0.06)", border: "1px solid rgba(34, 197, 94, 0.15)", borderRadius: 100, padding: "7px 16px", fontSize: 11, color: "#4ade80", letterSpacing: "0.08em", marginTop: 8 }}>
									<span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e", display: "inline-block" }} />
									Key derived · Session active
								</div>
							</main>
						)
					) : (
						activeSharedNote ? (
							<SharedNoteEditor activeNote={activeSharedNote} />
						) : (
							<main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, padding: 40 }}>
								<LockIcon />
								<h2 style={{ fontSize: 18, fontWeight: 500, color: "var(--text-secondary)", textAlign: "center" }}>
									{loadingSharedNotes ? "Loading shared notes…" : sharedNotes.length === 0 ? "No shared notes" : "Select a shared note"}
								</h2>
							</main>
						)
					)}
				</div>
			</div>
			
			{/* Share Modal */}
			{selectedNoteForShare && (
				<ShareModal
					isOpen={isShareModalOpen}
					onClose={() => {
						setIsShareModalOpen(false);
						setSelectedNoteForShare(null);
					}}
					noteId={selectedNoteForShare.id}
					noteTitle={selectedNoteForShare.title}
					onShareSuccess={() => {
						console.log("Note shared successfully");
					}}
				/>
			)}
		</>
	);
}