"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Tooltip } from "@radix-ui/themes";
import { useSessionStore } from "@/store/session";
import { useNotesStore, DecryptedNote } from "@/store/notes";
import { encrypt, decrypt, wrapNoteKey, unwrapNoteKey } from "@/lib/crypto";

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

		decrypt(activeNote.noteKey, activeNote.content_cipher, activeNote.content_iv)
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
				const { cipher, iv } = await encrypt(activeNote.noteKey, content);
				await fetch("/api/notes/update", {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						id: activeNote.id,
						content_cipher: cipher,
						content_iv: iv,
					}),
				});
				updateNote(activeNote.id, { content_cipher: cipher, content_iv: iv });
			} catch (err) {
				console.error("Auto-save content failed:", err);
			}
		}, 800);
		return () => clearTimeout(timer);
	}, [content]); // eslint-disable-line react-hooks/exhaustive-deps

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
	}, [title]); // eslint-disable-line react-hooks/exhaustive-deps

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
		</main>
	);
}

/* ─── Dashboard Page ─────────────────────────────────────────── */
export default function DashboardPage() {
	const router = useRouter();
	const { username, derivedKey, clearSession } = useSessionStore();
	const { notes, activeNoteId, setNotes, addNote, deleteNote, setActiveNoteId } =
		useNotesStore();
	const [loadingNotes, setLoadingNotes] = useState(true);

	const activeNote = notes.find((n) => n.id === activeNoteId);

	// Guard: redirect if no session (derivedKey is lost on refresh since it's in-memory)
	useEffect(() => {
		if (!username || !derivedKey) {
			// Clear stale cookie if it exists
			fetch("/api/auth/session", { method: "DELETE" });
			clearSession();
			router.replace("/signin");
		}
	}, [username, derivedKey, router, clearSession]);

	// Load and decrypt notes on mount
	useEffect(() => {
		if (!derivedKey) return;
		loadNotes();
	}, [derivedKey]); // eslint-disable-line react-hooks/exhaustive-deps

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
					const title = await decrypt(noteKey, note.title_cipher, note.title_iv);
					return {
						id: note.id,
						title,
						content_cipher: note.content_cipher,
						content_iv: note.content_iv,
						noteKey,
						created_at: note.created_at,
					};
				}),
			);

			setNotes(decrypted);
			if (decrypted.length > 0) setActiveNoteId(decrypted[0].id);
		} catch (err) {
			console.error("Failed to load notes:", err);
		} finally {
			setLoadingNotes(false);
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
		router.push("/");
	}

	if (!username) return null; // Prevent flash before redirect

	return (
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
						<div
							style={{
								padding: "20px 12px",
								display: "flex",
								alignItems: "center",
								gap: 10,
							}}
						>
							<div className="spinner" />
							<span
								className="font-mono"
								style={{ fontSize: 11, color: "var(--text-muted)" }}
							>
								Decrypting…
							</span>
						</div>
					) : (
						<ul style={{ listStyle: "none", marginTop: 4 }}>
							{notes.map((note) => (
								<li
									key={note.id}
									style={{
										display: "flex",
										alignItems: "center",
										gap: 4,
									}}
								>
									<button
										className="btn btn-ghost"
										onClick={() => setActiveNoteId(note.id)}
										style={{
											flex: 1,
											fontSize: 13,
											textAlign: "left",
											justifyContent: "flex-start",
											padding: "8px 12px",
											background:
												note.id === activeNoteId
													? "rgba(230, 57, 70, 0.08)"
													: "transparent",
											color:
												note.id === activeNoteId
													? "var(--accent)"
													: "var(--text-secondary)",
											borderRadius: 6,
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
										}}
									>
										{note.title || "Untitled"}
									</button>
									<Tooltip content="Delete" delayDuration={200}>
										<button
											className="btn btn-ghost"
											onClick={() => handleDeleteNote(note.id)}
											style={{
												padding: "6px 8px",
												color: "var(--text-muted)",
												flexShrink: 0,
											}}
										>
											<TrashIcon />
										</button>
									</Tooltip>
								</li>
							))}
						</ul>
					)}
				</aside>

				{/* Main content */}
				{activeNote && derivedKey ? (
					<NoteEditor
						key={activeNote.id}
						activeNote={activeNote}
						derivedKey={derivedKey}
					/>
				) : (
					<main
						style={{
							flex: 1,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							flexDirection: "column",
							gap: 16,
							padding: 40,
						}}
					>
						<LockIcon />

						<h2
							style={{
								fontSize: 18,
								fontWeight: 500,
								color: "var(--text-secondary)",
								textAlign: "center",
							}}
						>
							{loadingNotes
								? "Loading notes…"
								: notes.length === 0
									? "Create your first note"
									: "Select a note"}
						</h2>

						{/* Status chip */}
						<div
							className="font-mono"
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: 8,
								background: "rgba(34, 197, 94, 0.06)",
								border: "1px solid rgba(34, 197, 94, 0.15)",
								borderRadius: 100,
								padding: "7px 16px",
								fontSize: 11,
								color: "#4ade80",
								letterSpacing: "0.08em",
								marginTop: 8,
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
							Key derived · Session active
						</div>
					</main>
				)}
			</div>
		</div>
	);
}
