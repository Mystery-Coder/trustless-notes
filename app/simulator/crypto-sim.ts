"use client";
/**
 * Crypto helpers for the Security Simulator.
 * All operations run entirely in the browser via window.crypto.subtle.
 */

// ─── byte ↔ encoding helpers ────────────────────────────────────

export function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const clean = hex.replace(/\s/g, "");
  const buffer = new ArrayBuffer(clean.length / 2);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ─── PBKDF2 – extract timing + derived key bytes ────────────────

export interface DeriveResult {
  key: CryptoKey;
  keyHex: string;
  elapsedMs: number;
}

/**
 * Derives an AES-GCM-256 key from password + salt using PBKDF2.
 * Key is EXTRACTABLE so we can display hex bytes in the simulator UI.
 */
export async function deriveKeyExtractable(
  password: string,
  saltHex: string,
  iterations: number = 200_000
): Promise<DeriveResult> {
  const enc = new TextEncoder();
  const t0 = performance.now();

  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: hexToBytes(saltHex) as Uint8Array<ArrayBuffer>,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true, // extractable — for UI display
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
  );

  const rawBytes = await window.crypto.subtle.exportKey("raw", key);
  const keyHex = bytesToHex(new Uint8Array(rawBytes));
  const elapsedMs = performance.now() - t0;

  return { key, keyHex, elapsedMs };
}

// ─── AES-GCM decrypt attempt ────────────────────────────────────

export interface DecryptResult {
  success: boolean;
  plaintext?: string;
  error?: string;
}

export async function tryDecrypt(
  key: CryptoKey,
  cipherBase64: string,
  ivBase64: string
): Promise<DecryptResult> {
  try {
    const dec = new TextDecoder();
    const plainBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(ivBase64) as Uint8Array<ArrayBuffer> },
      key,
      base64ToBytes(cipherBase64)
    );
    return { success: true, plaintext: dec.decode(plainBuffer) };
  } catch {
    return {
      success: false,
      error: "AES-GCM authentication tag mismatch — wrong key",
    };
  }
}

// ─── Unwrap noteKey + decrypt content ───────────────────────────

export interface FullDecryptResult {
  derivedKeyHex: string;
  sentinelPlaintext?: string;
  noteKeyHex?: string;
  contentPlaintext?: string;
  elapsedMs: number;
  steps: StepResult[];
}

export interface StepResult {
  label: string;
  success: boolean;
  value?: string;
  error?: string;
}

export async function fullAttackChain(
  password: string,
  saltHex: string,
  sentinelCipher: string,
  sentinelIv: string,
  wrappedKeyCipher: string,
  wrappedKeyIv: string,
  contentCipher: string,
  contentIv: string
): Promise<FullDecryptResult> {
  const steps: StepResult[] = [];

  // Step 1: Derive key
  const { key, keyHex, elapsedMs } = await deriveKeyExtractable(password, saltHex);
  steps.push({ label: "PBKDF2 Key Derivation", success: true, value: keyHex });

  // Step 2: Decrypt sentinel
  const sentinel = await tryDecrypt(key, sentinelCipher, sentinelIv);
  steps.push({
    label: "Sentinel Decryption",
    success: sentinel.success,
    value: sentinel.plaintext,
    error: sentinel.error,
  });
  if (!sentinel.success) {
    return { derivedKeyHex: keyHex, elapsedMs, steps };
  }

  // Step 3: Unwrap note key
  let noteKeyHex = "";
  let noteKey: CryptoKey;
  try {
    const noteKeyBase64Result = await tryDecrypt(key, wrappedKeyCipher, wrappedKeyIv);
    if (!noteKeyBase64Result.success || !noteKeyBase64Result.plaintext) {
      steps.push({
        label: "Note Key Unwrap",
        success: false,
        error: "Cannot unwrap note key",
      });
      return { derivedKeyHex: keyHex, elapsedMs, steps };
    }
    const noteKeyBytes = Uint8Array.from(atob(noteKeyBase64Result.plaintext), (c) =>
      c.charCodeAt(0)
    );
    noteKey = await window.crypto.subtle.importKey(
      "raw",
      noteKeyBytes,
      { name: "AES-GCM" },
      true,
      ["encrypt", "decrypt"]
    );
    const raw = await window.crypto.subtle.exportKey("raw", noteKey);
    noteKeyHex = bytesToHex(new Uint8Array(raw));
    steps.push({ label: "Note Key Unwrap", success: true, value: noteKeyHex });
  } catch {
    steps.push({
      label: "Note Key Unwrap",
      success: false,
      error: "Failed to import note key",
    });
    return { derivedKeyHex: keyHex, elapsedMs, steps };
  }

  // Step 4: Decrypt content
  const content = await tryDecrypt(noteKey, contentCipher, contentIv);
  steps.push({
    label: "Content Decryption",
    success: content.success,
    value: content.plaintext,
    error: content.error,
  });

  return {
    derivedKeyHex: keyHex,
    sentinelPlaintext: sentinel.plaintext,
    noteKeyHex,
    contentPlaintext: content.plaintext,
    elapsedMs,
    steps,
  };
}

// ─── HMAC helpers for Cookie Leak scenario ──────────────────────

export async function hmacSign(
  message: string,
  secretHex: string
): Promise<string> {
  const enc = new TextEncoder();
  const secretBytes = hexToBytes(secretHex);
  const key = await window.crypto.subtle.importKey(
    "raw",
    secretBytes.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await window.crypto.subtle.sign("HMAC", key, enc.encode(message));
  return bytesToHex(new Uint8Array(sig));
}

export async function hmacVerify(
  message: string,
  signatureHex: string,
  secretHex: string
): Promise<boolean> {
  const enc = new TextEncoder();
  const secretBytes = hexToBytes(secretHex);
  const key = await window.crypto.subtle.importKey(
    "raw",
    secretBytes.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const sigBytes = hexToBytes(signatureHex);
  return window.crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes.buffer as ArrayBuffer,
    enc.encode(message)
  );
}

// ─── Brute-force time estimation ────────────────────────────────

export function estimateBruteForceTime(
  pbkdf2Ms: number,
  passwordLength: number = 8,
  charsetSize: number = 72 // a-z, A-Z, 0-9, 10 symbols
): string {
  const combinations = Math.pow(charsetSize, passwordLength);
  const totalSeconds = (combinations * (pbkdf2Ms / 1000)) / 2; // average case
  if (totalSeconds < 60) return `${totalSeconds.toFixed(0)} seconds`;
  if (totalSeconds < 3600) return `${(totalSeconds / 60).toFixed(0)} minutes`;
  if (totalSeconds < 86400) return `${(totalSeconds / 3600).toFixed(1)} hours`;
  if (totalSeconds < 31536000) return `${(totalSeconds / 86400).toFixed(1)} days`;
  const years = totalSeconds / 31536000;
  if (years > 1e12) return `${(years / 1e12).toFixed(1)} trillion years`;
  if (years > 1e9) return `${(years / 1e9).toFixed(1)} billion years`;
  if (years > 1e6) return `${(years / 1e6).toFixed(1)} million years`;
  if (years > 1e3) return `${(years / 1e3).toFixed(1)} thousand years`;
  return `${years.toFixed(1)} years`;
}
