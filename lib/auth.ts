import { cookies } from "next/headers"
import { createHmac } from "crypto"

const SESSION_SECRET = process.env.SESSION_SECRET!

/**
 * Signs a value with HMAC-SHA256 using the server secret.
 * Cookie format: `username.signature`
 */
export function signValue(value: string): string {
  const sig = createHmac("sha256", SESSION_SECRET).update(value).digest("hex")
  return `${value}.${sig}`
}

/**
 * Verifies and extracts the username from a signed cookie.
 * Returns null if the signature is invalid or missing.
 */
export function verifyValue(signed: string): string | null {
  const lastDot = signed.lastIndexOf(".")
  if (lastDot === -1) return null

  const value = signed.slice(0, lastDot)
  const sig = signed.slice(lastDot + 1)

  const expected = createHmac("sha256", SESSION_SECRET).update(value).digest("hex")

  // Constant-time comparison to prevent timing attacks
  if (sig.length !== expected.length) return null
  let mismatch = 0
  for (let i = 0; i < sig.length; i++) {
    mismatch |= sig.charCodeAt(i) ^ expected.charCodeAt(i)
  }

  return mismatch === 0 ? value : null
}

/**
 * Reads and verifies the signed session cookie.
 * Throws if missing or tampered with.
 */
export async function getSessionUser(): Promise<string> {
  const signed = (await cookies()).get("username")?.value
  if (!signed) throw new Error("Unauthorized")

  const username = verifyValue(signed)
  if (!username) throw new Error("Invalid session signature")

  return username
}
