"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deriveKey, decrypt } from "@/lib/crypto";
import { useSessionStore } from "@/store/session";

export default function SigninPage() {
	const router = useRouter();
	const setSession = useSessionStore((s) => s.setSession);

	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [status, setStatus] = useState<"idle" | "verifying">("idle");
	const [error, setError] = useState<string | null>(null);

	const isLoading = status === "verifying";

	async function handleSubmit(e: React.SubmitEvent) {
		e.preventDefault();
		setError(null);

		if (!username.trim() || !password) {
			setError("Please enter your username and password.");
			return;
		}

		try {
			setStatus("verifying");

			// 1. Fetch salt + sentinel from server (always returns 200)
			const res = await fetch("/api/auth/signin", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ username: username.trim() }),
			});

			if (!res.ok) {
				setError("Invalid username or password.");
				setStatus("idle");
				return;
			}

			const { salt, sentinel_cipher, sentinel_iv } = await res.json();

			// 2-3. Re-derive key with PBKDF2
			const key = await deriveKey(password, salt);

			// 4. Attempt AES-GCM decrypt — throws if wrong password/fake sentinel
			let plaintext: string;
			try {
				plaintext = await decrypt(key, sentinel_cipher, sentinel_iv);
			} catch {
				// Decrypt failed → wrong credentials
				setError("Invalid username or password.");
				setStatus("idle");
				return;
			}

			// 5. Set server-side session cookie with sentinel proof
			const sessionRes = await fetch("/api/auth/session", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: username.trim(),
					sentinel_plaintext: plaintext,
				}),
			});

			if (!sessionRes.ok) {
				setError("Invalid username or password.");
				setStatus("idle");
				return;
			}

			// 6. Store derived key + username in Zustand (memory only)
			setSession(username.trim(), key);

			// 7. Redirect to dashboard
			router.push("/dashboard");
		} catch (err) {
			console.error("Signin error:", err);
			setError("An unexpected error occurred.");
			setStatus("idle");
		}
	}

	return (
		<div className="auth-shell">
			{/* Background grid */}
			<div className="hex-bg" aria-hidden="true" />

			<div className="auth-card">
				{/* Logo */}
				<div style={{ marginBottom: 32 }}>
					<Link
						href="/"
						className="font-mono"
						style={{
							fontSize: 13,
							color: "var(--text-muted)",
							letterSpacing: "0.08em",
							textDecoration: "none",
						}}
					>
						← trustless
						<span style={{ color: "var(--accent)" }}>.</span>notes
					</Link>
				</div>

				<h1
					style={{
						fontSize: 22,
						fontWeight: 600,
						marginBottom: 6,
						color: "var(--text-primary)",
					}}
				>
					Welcome back
				</h1>
				<p
					className="font-mono"
					style={{
						fontSize: 12,
						color: "var(--text-muted)",
						marginBottom: 32,
					}}
				>
					Key derivation happens locally — your password never leaves
					this browser.
				</p>

				<form onSubmit={handleSubmit} noValidate>
					{/* Username */}
					<div style={{ marginBottom: 20 }}>
						<label className="label-mono" htmlFor="signin-username">
							Username
						</label>
						<input
							id="signin-username"
							type="text"
							className="input-field"
							placeholder="satoshi"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							disabled={isLoading}
							autoComplete="username"
							spellCheck={false}
						/>
					</div>

					{/* Password */}
					<div style={{ marginBottom: 28 }}>
						<label className="label-mono" htmlFor="signin-password">
							Password
						</label>
						<input
							id="signin-password"
							type="password"
							className="input-field"
							placeholder="your password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							disabled={isLoading}
							autoComplete="current-password"
						/>
					</div>

					{/* Status messages */}
					{error && (
						<div
							className="badge-error"
							style={{ marginBottom: 16 }}
						>
							{error}
						</div>
					)}

					{status === "verifying" && (
						<div
							className="badge-loading"
							style={{ marginBottom: 16 }}
						>
							<div className="spinner" />
							Verifying… deriving key + decrypting sentinel
						</div>
					)}

					<button
						id="signin-submit"
						type="submit"
						className="btn btn-primary"
						style={{ width: "100%", fontSize: 14, padding: "13px" }}
						disabled={isLoading}
					>
						{isLoading ? "Please wait…" : "Sign In"}
					</button>
				</form>

				<hr className="divider" />

				<p
					className="font-mono"
					style={{
						fontSize: 12,
						color: "var(--text-muted)",
						textAlign: "center",
					}}
				>
					No account yet?{" "}
					<Link
						href="/signup"
						style={{
							color: "var(--accent)",
							textDecoration: "none",
						}}
					>
						Create one →
					</Link>
				</p>

				{/* Security note */}
				<div
					className="font-mono"
					style={{
						marginTop: 24,
						padding: "12px 14px",
						background: "rgba(255,255,255,0.02)",
						border: "1px solid var(--border)",
						borderRadius: 8,
						fontSize: 11,
						color: "var(--text-muted)",
						lineHeight: 1.6,
					}}
				>
					<span style={{ color: "var(--accent)" }}>ⓘ</span> We
					can&apos;t distinguish a wrong username from a wrong
					password. Both show the same error by design.
				</div>
			</div>
		</div>
	);
}
