"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Tooltip } from "@radix-ui/themes";
import { useSessionStore } from "@/store/session";

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

export default function DashboardPage() {
	const router = useRouter();
	const { username, clearSession } = useSessionStore();

	// Guard: redirect if no session
	useEffect(() => {
		if (!username) {
			router.replace("/signin");
		}
	}, [username, router]);

	function handleSignOut() {
		clearSession();
		router.push("/");
	}

	if (!username) return null; // Prevent flash before redirect

	return (
		<div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
			{/* Top bar */}
			<header className="topbar">
				<div className="font-mono" style={{ fontSize: 13, color: "var(--text-primary)", letterSpacing: "0.06em" }}>
					trustless<span style={{ color: "var(--accent)" }}>.</span>notes
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

					<Tooltip content="Coming soon" delayDuration={100}>
						<button
							id="new-note-btn"
							className="btn btn-secondary"
							style={{
								width: "100%",
								justifyContent: "flex-start",
								gap: 10,
								fontSize: 13,
								padding: "10px 14px",
								opacity: 0.5,
								cursor: "not-allowed",
							}}
							disabled
						>
							<PlusIcon />
							New Note
						</button>
					</Tooltip>

					<div
						style={{
							marginTop: "auto",
							padding: "16px 12px 8px",
							borderTop: "1px solid var(--border)",
						}}
					>
						<div
							className="font-mono"
							style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.7 }}
						>
							<div style={{ marginBottom: 4 }}>
								<span style={{ color: "var(--accent)" }}>key</span>: in memory
							</div>
							<div>
								<span style={{ color: "var(--accent)" }}>cipher</span>: AES-256-GCM
							</div>
						</div>
					</div>
				</aside>

				{/* Main content */}
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
						Your encrypted notes will appear here
					</h2>
					<p
						className="font-mono"
						style={{
							fontSize: 12,
							color: "var(--text-muted)",
							textAlign: "center",
							maxWidth: 340,
							lineHeight: 1.7,
						}}
					>
						Note creation is coming soon. Your AES-256-GCM key is active in memory
						and ready to encrypt.
					</p>

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
			</div>
		</div>
	);
}
