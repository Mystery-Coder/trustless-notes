/**
 * Crypto Helpers
 * Uses only the Web Crypto API (global `crypto.subtle`).
 * CLIENT SIDE ONLY
 */

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
	const buffer = new ArrayBuffer(hex.length / 2);
	const bytes = new Uint8Array(buffer);
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
	}
	return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function bytesToBase64(bytes: Uint8Array): string {
	let binary = "";
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
	const binary = atob(base64);
	const buffer = new ArrayBuffer(binary.length);
	const bytes = new Uint8Array(buffer);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

/**
 * Derives an AES-GCM-256 key from a password using PBKDF2.
 * 200,000 iterations · SHA-256 · non-extractable.
 *
 * @param password - The user's plaintext password
 * @param salt     - A hex-encoded 16-byte random salt string
 */
export async function deriveKey(
	password: string,
	salt: string,
): Promise<CryptoKey> {
	const enc = new TextEncoder();

	// Import raw password bytes as PBKDF2 key material
	const keyMaterial = await crypto.subtle.importKey(
		"raw",
		enc.encode(password),
		{ name: "PBKDF2" },
		false,
		["deriveKey"],
	);

	// Derive AES-GCM 256-bit key — non-extractable by design
	return crypto.subtle.deriveKey(
		{
			name: "PBKDF2",
			salt: hexToBytes(salt), // Uint8Array<ArrayBuffer> ✓
			iterations: 200_000,
			hash: "SHA-256",
		},
		keyMaterial,
		{ name: "AES-GCM", length: 256 },
		false, // extractable: false
		["encrypt", "decrypt"],
	);
}

/**
 * Encrypts a plaintext string with AES-GCM.
 * A fresh random 12-byte IV is generated for every call.
 *
 * @returns `{ cipher, iv }` — both base64-encoded strings
 */
export async function encrypt(
	key: CryptoKey,
	plaintext: string,
): Promise<{ cipher: string; iv: string }> {
	const enc = new TextEncoder();

	// Explicit ArrayBuffer construction → Uint8Array<ArrayBuffer> ✓
	const ivBuf = new ArrayBuffer(12);
	const iv = new Uint8Array(ivBuf);
	crypto.getRandomValues(iv);

	const cipherBuffer = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		key,
		enc.encode(plaintext),
	);

	return {
		cipher: bytesToBase64(new Uint8Array(cipherBuffer)),
		iv: bytesToBase64(iv),
	};
}

/**
 * Decrypts a base64-encoded ciphertext using AES-GCM.
 * **Throws** a `DOMException` if decryption fails — use the thrown
 * error as the password-verification signal on sign-in.
 */
export async function decrypt(
	key: CryptoKey,
	cipher: string,
	iv: string,
): Promise<string> {
	const dec = new TextDecoder();

	const plainBuffer = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv: base64ToBytes(iv) }, // Uint8Array<ArrayBuffer> ✓
		key,
		base64ToBytes(cipher),
	);

	return dec.decode(plainBuffer);
}

/**
 * Generates a cryptographically random 16-byte salt.
 * Returns it hex-encoded (32 character string).
 */
export function generateSalt(): string {
	const buf = new ArrayBuffer(16);
	const bytes = new Uint8Array(buf);
	crypto.getRandomValues(bytes);
	return bytesToHex(bytes);
}
