import Link from "next/link";

function FeatureCard({
	icon,
	title,
	description,
}: {
	icon: React.ReactNode;
	title: string;
	description: string;
}) {
	return (
		<div className="card-feature">
			<div
				style={{
					width: 40,
					height: 40,
					borderRadius: 8,
					background: "var(--accent-dim)",
					border: "1px solid var(--accent-glow)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					marginBottom: 20,
					color: "var(--accent)",
				}}
			>
				{icon}
			</div>
			<h3
				className="font-mono"
				style={{
					fontSize: 15,
					fontWeight: 500,
					marginBottom: 10,
					color: "var(--text-primary)",
				}}
			>
				{title}
			</h3>
			<p
				style={{
					fontSize: 14,
					color: "var(--text-secondary)",
					lineHeight: 1.6,
				}}
			>
				{description}
			</p>
		</div>
	);
}

export default function LandingPage() {
	return (
		<main style={{ position: "relative", minHeight: "100vh" }}>
			{/* <HexBackground /> */}

			{/* Nav */}
			<nav
				style={{
					position: "relative",
					zIndex: 10,
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "20px 40px",
					borderBottom: "1px solid var(--border)",
					backdropFilter: "blur(8px)",
					background: "rgba(10, 10, 10, 0.7)",
				}}
			>
				<div
					className="font-mono"
					style={{
						fontSize: 14,
						fontWeight: 500,
						color: "var(--text-primary)",
						letterSpacing: "0.08em",
					}}
				>
					trustless<span style={{ color: "var(--accent)" }}>.</span>
					notes
				</div>
				<div style={{ display: "flex", gap: 12 }}>
					<Link
						href="/signin"
						className="btn btn-ghost"
						style={{ fontSize: 13 }}
					>
						Sign In
					</Link>
					<Link
						href="/signup"
						className="btn btn-primary"
						style={{ fontSize: 13, padding: "9px 20px" }}
					>
						Get Started
					</Link>
				</div>
			</nav>

			{/* Hero */}
			<section
				style={{
					position: "relative",
					zIndex: 1,
					maxWidth: 800,
					margin: "0 auto",
					padding: "120px 40px 80px",
					textAlign: "center",
				}}
			>
				{/* Badge */}
				<div
					className="font-mono"
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: 8,
						background: "var(--accent-dim)",
						border: "1px solid var(--accent-glow)",
						borderRadius: 100,
						padding: "6px 16px",
						fontSize: 11,
						color: "var(--accent)",
						letterSpacing: "0.1em",
						textTransform: "uppercase",
						marginBottom: 36,
					}}
				>
					<span
						style={{
							width: 6,
							height: 6,
							borderRadius: "50%",
							background: "var(--accent)",
							boxShadow: "0 0 8px var(--accent)",
							display: "inline-block",
						}}
					/>
					Zero-Knowledge Encryption
				</div>

				<h1
					className="font-display"
					style={{
						fontSize: "clamp(36px, 7vw, 68px)",
						fontWeight: 700,
						lineHeight: 1.1,
						marginBottom: 24,
						color: "var(--text-primary)",
						letterSpacing: "-0.02em",
					}}
				>
					Your notes.{" "}
					<em
						style={{
							fontStyle: "italic",
							color: "var(--accent)",
							fontWeight: 900,
						}}
					>
						Unreadable
					</em>{" "}
					by anyone but you.
				</h1>

				<p
					style={{
						fontSize: "clamp(15px, 2.5vw, 18px)",
						color: "var(--text-secondary)",
						lineHeight: 1.7,
						maxWidth: 560,
						margin: "0 auto 48px",
					}}
				>
					Trustless Notes uses PBKDF2 key derivation and AES-256-GCM
					encryption, entirely in your browser. No passwords stored.
					No plaintext transmitted. Not even we can read your notes.
				</p>

				<div
					style={{
						display: "flex",
						gap: 16,
						justifyContent: "center",
						flexWrap: "wrap",
					}}
				>
					<Link
						href="/signup"
						className="btn btn-primary"
						style={{ fontSize: 14, padding: "14px 32px" }}
					>
						Start Encrypting →
					</Link>
					<Link
						href="/signin"
						className="btn btn-secondary"
						style={{ fontSize: 14, padding: "14px 32px" }}
					>
						Sign In
					</Link>
				</div>
			</section>

			{/* Feature cards */}
			<section
				style={{
					position: "relative",
					zIndex: 1,
					maxWidth: 1000,
					margin: "0 auto",
					padding: "0 40px 100px",
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
					gap: 20,
				}}
			>
				<FeatureCard
					icon={
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<circle cx="12" cy="12" r="10" />
							<path d="M12 8v4l3 3" />
						</svg>
					}
					title="Zero Knowledge"
					description="We derive your encryption key from your password locally using PBKDF2. Your password is never sent to our servers — ever."
				/>
				<FeatureCard
					icon={
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<rect
								x="3"
								y="11"
								width="18"
								height="11"
								rx="2"
								ry="2"
							/>
							<path d="M7 11V7a5 5 0 0 1 10 0v4" />
						</svg>
					}
					title="End-to-End Encrypted"
					description="Every note is encrypted with AES-256-GCM before it leaves your device. The ciphertext stored on our servers is meaningless without your key."
				/>
				<FeatureCard
					icon={
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
						</svg>
					}
					title="No Auth Server"
					description="No JWT tokens, no session cookies, no OAuth. Your derived key lives only in memory and proves your identity purely through cryptography."
				/>
			</section>

			{/* Footer */}
			<footer
				style={{
					position: "relative",
					zIndex: 1,
					borderTop: "1px solid var(--border)",
					padding: "24px 40px",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					flexWrap: "wrap",
					gap: 12,
				}}
			>
				<span
					className="font-mono"
					style={{ fontSize: 12, color: "var(--text-muted)" }}
				>
					trustless<span style={{ color: "var(--accent)" }}>.</span>
					notes
				</span>
				<span
					className="font-mono"
					style={{ fontSize: 11, color: "var(--text-muted)" }}
				>
					AES-256-GCM · PBKDF2 · Web Crypto API
				</span>
			</footer>
		</main>
	);
}
