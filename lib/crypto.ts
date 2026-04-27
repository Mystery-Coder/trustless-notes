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

/**
 * Computes SHA-256 of a plaintext string.
 * Returns hex-encoded digest (64 chars).
 */
export async function sha256Hex(plaintext: string): Promise<string> {
	const enc = new TextEncoder();
	const digest = await crypto.subtle.digest("SHA-256", enc.encode(plaintext));
	return bytesToHex(new Uint8Array(digest));
}

/*
Functions to assist in ECDH keys only
*/
export async function cryptoKeyToBase64(
	key: CryptoKey,
	format: "spki" | "pkcs8",
): Promise<string> {
	const bytes = await window.crypto.subtle.exportKey(format, key);
	return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

export async function base64ToCryptoKey(
	base64: string,
	format: "spki" | "pkcs8",
	usage: KeyUsage = "deriveKey",
): Promise<CryptoKey> {
	const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
	return await window.crypto.subtle.importKey(
		format,
		bytes,
		{ name: "ECDH", namedCurve: "P-256" },
		true,
		[usage],
	);
}

/**
 * Wraps (encrypts) a per-note AES-GCM key using the user's derivedKey.
 * Exports the noteKey as raw bytes, base64-encodes them, then encrypts
 * that string with the wrapping key.
 */
export async function wrapNoteKey(
	noteKey: CryptoKey,
	wrappingKey: CryptoKey,
): Promise<{ cipher: string; iv: string }> {
	const raw = await window.crypto.subtle.exportKey("raw", noteKey);
	const base64 = btoa(String.fromCharCode(...new Uint8Array(raw)));
	return await encrypt(wrappingKey, base64);
}

/**
 * Unwraps (decrypts) a per-note AES-GCM key using the user's derivedKey.
 * Decrypts the base64 string, converts it back to raw bytes, and imports
 * as an extractable AES-GCM CryptoKey.
 */
export async function unwrapNoteKey(
	cipher: string,
	iv: string,
	wrappingKey: CryptoKey,
): Promise<CryptoKey> {
	const base64 = await decrypt(wrappingKey, cipher, iv);
	const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
	return await window.crypto.subtle.importKey(
		"raw",
		bytes,
		{ name: "AES-GCM" },
		true,
		["encrypt", "decrypt"],
	);
}

/**
 * Decrypts and imports the user's ECDH private key.
 * The private key was stored as PKCS8 base64, encrypted with the user's derivedKey.
 * Returns a CryptoKey usable for ECDH key derivation.
 */
export async function decryptEcdhPrivateKey(
	encryptedPrivateKeyCipher: string,
	encryptedPrivateKeyIv: string,
	derivedKey: CryptoKey,
): Promise<CryptoKey> {
	// Decrypt the base64-encoded PKCS8 private key
	const privateKeyBase64 = await decrypt(
		derivedKey,
		encryptedPrivateKeyCipher,
		encryptedPrivateKeyIv,
	);
	
	// Convert base64 to bytes
	const privateKeyBytes = Uint8Array.from(atob(privateKeyBase64), c => c.charCodeAt(0));
	
	// Import as PKCS8 ECDH private key
	return await crypto.subtle.importKey(
		"pkcs8",
		privateKeyBytes,
		{ name: "ECDH", namedCurve: "P-256" },
		true, // extractable (needed for deriving shared secret)
		["deriveKey", "deriveBits"],
	);
}

/**
 * Computes shared secret using ECDH between sender's private key and receiver's public key.
 * Returns the raw shared secret as an ArrayBuffer.
 */
export async function computeSharedSecret(
	myPrivateKey: CryptoKey,
	theirPublicKeyBase64: string,
): Promise<ArrayBuffer> {
	// Convert receiver's base64 public key to bytes
	const publicKeyBytes = Uint8Array.from(atob(theirPublicKeyBase64), c => c.charCodeAt(0));
	
	// Import receiver's public key (SPKI format)
	const theirPublicKey = await crypto.subtle.importKey(
		"spki",
		publicKeyBytes,
		{ name: "ECDH", namedCurve: "P-256" },
		false,
		[],
	);
	
	// Derive shared secret (raw bits)
	return await crypto.subtle.deriveBits(
		{
			name: "ECDH",
			public: theirPublicKey,
		},
		myPrivateKey,
		256, // 256 bits (32 bytes) — enough for AES-256 key
	);
}

/**
 * Derives an AES-GCM key from an ECDH shared secret using HKDF.
 * This ensures we get a properly formatted AES-256 key from the raw shared secret.
 */
export async function deriveKeyFromSharedSecret(
	sharedSecret: ArrayBuffer,
	salt: BufferSource = new Uint8Array(32), // optional salt, defaults to zeros
): Promise<CryptoKey> {
	// Import the shared secret as raw key material for HKDF
	const keyMaterial = await crypto.subtle.importKey(
		"raw",
		sharedSecret,
		{ name: "HKDF" },
		false,
		["deriveKey"],
	);
	
	// Derive AES-GCM key using HKDF
	return await crypto.subtle.deriveKey(
		{
			name: "HKDF",
			hash: "SHA-256",
			salt,
			info: new TextEncoder().encode("trustless-notes-shared-key"),
		},
		keyMaterial,
		{ name: "AES-GCM", length: 256 },
		false, // non-extractable
		["encrypt", "decrypt"],
	);
}

/**
 * High-level function: wraps a note key using ECDH shared secret between sender and receiver.
 * Combines: decrypt sender's ECDH private key → compute shared secret → derive AES key → wrap note key.
 */
export async function wrapNoteKeyForReceiver(
	noteKey: CryptoKey,
	senderDerivedKey: CryptoKey,
	senderEncryptedPrivateKeyCipher: string,
	senderEncryptedPrivateKeyIv: string,
	receiverPublicKeyBase64: string,
): Promise<{ wrappedKeyCipher: string; wrappedKeyIv: string }> {
	// 1. Decrypt sender's ECDH private key
	const senderEcdhPrivateKey = await decryptEcdhPrivateKey(
		senderEncryptedPrivateKeyCipher,
		senderEncryptedPrivateKeyIv,
		senderDerivedKey,
	);
	
	// 2. Compute shared secret with receiver's public key
	const sharedSecret = await computeSharedSecret(
		senderEcdhPrivateKey,
		receiverPublicKeyBase64,
	);
	
	// 3. Derive AES key from shared secret
	const sharedAesKey = await deriveKeyFromSharedSecret(sharedSecret);
	
	// 4. Wrap the note key using the derived shared AES key
	const wrapped = await wrapNoteKey(noteKey, sharedAesKey);
	return {
		wrappedKeyCipher: wrapped.cipher,
		wrappedKeyIv: wrapped.iv,
	};
}

/**
 * High-level function: unwraps a note key that was wrapped for the receiver using ECDH.
 * Receiver uses their own private key + sender's public key to compute same shared secret.
 */
export async function unwrapNoteKeyFromSender(
	wrappedKeyCipher: string,
	wrappedKeyIv: string,
	receiverDerivedKey: CryptoKey,
	receiverEncryptedPrivateKeyCipher: string,
	receiverEncryptedPrivateKeyIv: string,
	senderPublicKeyBase64: string,
): Promise<CryptoKey> {
	// 1. Decrypt receiver's ECDH private key
	const receiverEcdhPrivateKey = await decryptEcdhPrivateKey(
		receiverEncryptedPrivateKeyCipher,
		receiverEncryptedPrivateKeyIv,
		receiverDerivedKey,
	);
	
	// 2. Compute shared secret with sender's public key
	const sharedSecret = await computeSharedSecret(
		receiverEcdhPrivateKey,
		senderPublicKeyBase64,
	);
	
	// 3. Derive AES key from shared secret
	const sharedAesKey = await deriveKeyFromSharedSecret(sharedSecret);
	
	// 4. Unwrap the note key using the derived shared AES key
	return await unwrapNoteKey(wrappedKeyCipher, wrappedKeyIv, sharedAesKey);
}

/**
 * Encrypts an array of image attachments using the note's AES key.
 * Each attachment: { name, mimeType, data } where data is base64-encoded image bytes.
 * The whole array is JSON-stringified then encrypted as one blob.
 *
 * @returns { cipher, iv } — both base64-encoded strings
 */
export async function encryptAttachments(
    attachments: { name: string; mimeType: string; data: string }[],
    noteKey: CryptoKey,
): Promise<{ cipher: string; iv: string }> {
    const json = JSON.stringify(attachments);
    return await encrypt(noteKey, json);
}

/**
 * Decrypts the attachments blob and returns the array.
 * Each item: { name, mimeType, data } where data is base64-encoded image bytes.
 * Caller converts data → Blob URL for rendering.
 */
export async function decryptAttachments(
    cipher: string,
    iv: string,
    noteKey: CryptoKey,
): Promise<{ name: string; mimeType: string; data: string }[]> {
    const json = await decrypt(noteKey, cipher, iv);
    return JSON.parse(json);
}