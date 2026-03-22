"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
	deriveKey,
	encrypt,
	generateSalt,
	cryptoKeyToBase64,
} from "@/lib/crypto";
import { useSessionStore } from "@/store/session";

export default function SignupPage() {
	const router = useRouter();
	const setSession = useSessionStore((s) => s.setSession);

	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [status, setStatus] = useState<"idle" | "deriving" | "submitting">(
		"idle",
	);
	const [error, setError] = useState<string | null>(null);

	const isLoading = status === "deriving" || status === "submitting";

	async function handleSubmit(e: React.SubmitEvent) {
		e.preventDefault();
		setError(null);

		if (password !== confirm) {
			setError("Passwords do not match.");
			return;
		}
		if (password.length < 8) {
			setError("Password must be at least 8 characters.");
			return;
		}
		if (username.trim().length < 3) {
			setError("Username must be at least 3 characters.");
			return;
		}

		try {
			const salt = generateSalt();

			// Derive AES-GCM key (PBKDF2, 200k iter)
			setStatus("deriving");
			const key = await deriveKey(password, salt);

			// Encrypt the String with derived key
			const { cipher: sentinel_cipher, iv: sentinel_iv } = await encrypt(
				key,
				"VALID_PASSWORD",
			);

			const ecdhKeyPair = await window.crypto.subtle.generateKey(
				{
					name: "ECDH",
					namedCurve: "P-256",
				},
				true,
				["deriveKey"],
			);

			const { cipher: ecdh_private_key_cipher, iv: ecdh_private_key_iv } =
				await encrypt(
					key,
					await cryptoKeyToBase64(ecdhKeyPair.privateKey, "pkcs8"),
				);
			const ecdh_public_key = await cryptoKeyToBase64(
				ecdhKeyPair.publicKey,
				"spki",
			);

			setStatus("submitting");
			const res = await fetch("/api/auth/signup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: username.trim(),
					salt,
					sentinel_cipher,
					sentinel_iv,
					ecdh_public_key,
					ecdh_private_key_cipher,
					ecdh_private_key_iv,
				}),
			});

			if (res.status === 409) {
				setError("Username already taken. Choose another.");
				setStatus("idle");
				return;
			}

			if (!res.ok) {
				setError("Something went wrong. Please try again.");
				setStatus("idle");
				return;
			}

			// Set server-side session cookie
			await fetch("/api/auth/session", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ username: username.trim() }),
			});

			// Store in Zustand (memory only)
			setSession(username.trim(), key);

			router.push("/dashboard");
		} catch (err) {
			console.error("Signup error:", err);
			setError("An unexpected error occurred.");
			setStatus("idle");
		}
	}

	return (
		<div className="auth-shell">
			<div className="hex-bg" aria-hidden="true" />

			<div className="auth-card">
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
					Create account
				</h1>
				<p
					className="font-mono"
					style={{
						fontSize: 12,
						color: "var(--text-muted)",
						marginBottom: 32,
					}}
				>
					Your key is derived locally. We never see your password.
				</p>

				<form onSubmit={handleSubmit} noValidate>
					<div style={{ marginBottom: 20 }}>
						<label className="label-mono" htmlFor="signup-username">
							Username
						</label>
						<input
							id="signup-username"
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
					<div style={{ marginBottom: 20 }}>
						<label className="label-mono" htmlFor="signup-password">
							Password
						</label>
						<input
							id="signup-password"
							type="password"
							className="input-field"
							placeholder="min. 8 characters"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							disabled={isLoading}
							autoComplete="new-password"
						/>
					</div>

					{/* Confirm */}
					<div style={{ marginBottom: 28 }}>
						<label className="label-mono" htmlFor="signup-confirm">
							Confirm Password
						</label>
						<input
							id="signup-confirm"
							type="password"
							className="input-field"
							placeholder="repeat password"
							value={confirm}
							onChange={(e) => setConfirm(e.target.value)}
							disabled={isLoading}
							autoComplete="new-password"
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

					{status === "deriving" && (
						<div
							className="badge-loading"
							style={{ marginBottom: 16 }}
						>
							<div className="spinner" />
							Deriving key… (PBKDF2 · 200,000 iterations)
						</div>
					)}

					{status === "submitting" && (
						<div
							className="badge-loading"
							style={{ marginBottom: 16 }}
						>
							<div className="spinner" />
							Creating account…
						</div>
					)}

					<button
						id="signup-submit"
						type="submit"
						className="btn btn-primary"
						style={{ width: "100%", fontSize: 14, padding: "13px" }}
						disabled={isLoading}
					>
						{isLoading ? "Please wait…" : "Create Account"}
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
					Already have an account?{" "}
					<Link
						href="/signin"
						style={{
							color: "var(--accent)",
							textDecoration: "none",
						}}
					>
						Sign in →
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
					<span style={{ color: "var(--accent)" }}>ⓘ</span> Your
					encryption key never leaves this browser. We only store your
					username + an encrypted sentinel value used to verify your
					password on future logins.
				</div>
			</div>
		</div>
	);
}
