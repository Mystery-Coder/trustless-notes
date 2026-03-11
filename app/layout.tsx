import type { Metadata } from "next";
import { DM_Mono, Fraunces, DM_Sans } from "next/font/google";
import "./globals.css";
import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";

const dmMono = DM_Mono({
	variable: "--font-dm-mono",
	subsets: ["latin"],
	weight: ["300", "400", "500"],
});

const fraunces = Fraunces({
	variable: "--font-fraunces",
	subsets: ["latin"],
	weight: ["300", "400", "600", "700", "900"],
	style: ["normal", "italic"],
});

const dmSans = DM_Sans({
	variable: "--font-dm-sans",
	subsets: ["latin"],
	weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
	title: "Trustless Notes — Encrypted by You, Readable by None",
	description:
		"A privacy-first encrypted notes app. The server never sees your plaintext. Zero-knowledge, end-to-end encrypted, no auth server.",
	openGraph: {
		title: "Trustless Notes",
		description: "Your notes, unreadable by anyone but you.",
		type: "website",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<head>
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link
					rel="preconnect"
					href="https://fonts.gstatic.com"
					crossOrigin="anonymous"
				/>
			</head>
			<body
				className={`${dmMono.variable} ${fraunces.variable} ${dmSans.variable} antialiased`}
				style={{ fontFamily: "var(--font-dm-sans)" }}
			>
				<Theme
					appearance="dark"
					accentColor="red"
					grayColor="slate"
					panelBackground="solid"
					radius="medium"
				>
					{children}
				</Theme>
			</body>
		</html>
	);
}
