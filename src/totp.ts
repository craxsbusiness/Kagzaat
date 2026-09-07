/**
 * TOTP (Time-based One-Time Password) implementation using Web Crypto API.
 * Compatible with Google Authenticator, Authy, 1Password, etc.
 *
 * RFC 4226 (HOTP) + RFC 6238 (TOTP)
 */

// Base32 alphabet (RFC 4648)
const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Generate a random base32-encoded secret (20 bytes = 32 chars) */
export function generateSecret(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  let bits = "";
  for (const b of bytes) {
    bits += b.toString(2).padStart(8, "0");
  }
  let result = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5);
    result += BASE32_CHARS[parseInt(chunk, 2)];
  }
  return result;
}

/** Decode base32 string to Uint8Array */
function base32Decode(encoded: string): Uint8Array {
  const cleaned = encoded.replace(/[^A-Z2-7]/gi, "").toUpperCase();
  let bits = "";
  for (const c of cleaned) {
    const idx = BASE32_CHARS.indexOf(c);
    if (idx === -1) continue;
    bits += idx.toString(2).padStart(5, "0");
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return bytes;
}

/** HMAC-SHA1 using Web Crypto API */
async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, message.buffer as ArrayBuffer);
  return new Uint8Array(sig);
}

/** Generate a 6-digit TOTP code for the given secret and time */
export async function generateTOTP(secret: string, time: number = Date.now()): Promise<string> {
  const key = base32Decode(secret);
  const counter = Math.floor(time / 1000 / 30); // 30-second time step

  // Encode counter as 8-byte big-endian
  const msg = new Uint8Array(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i--) {
    msg[i] = tmp & 0xff;
    tmp = Math.floor(tmp / 256);
  }

  const hmac = await hmacSha1(key, msg);

  // Dynamic truncation (RFC 4226)
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, "0");
}

/** Verify a TOTP code with a time window (default ±1 step = 90 seconds tolerance) */
export async function verifyTOTP(
  secret: string,
  code: string,
  window: number = 1
): Promise<boolean> {
  const now = Date.now();
  for (let i = -window; i <= window; i++) {
    const expected = await generateTOTP(secret, now + i * 30000);
    if (expected === code) return true;
  }
  return false;
}

/** Generate the otpauth:// URI for QR code scanning */
export function generateOTPAuthURI(
  secret: string,
  accountName: string,
  issuer: string = "LexVault"
): string {
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?${params.toString()}`;
}

/** Generate 8 single-use recovery codes */
export function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    const num = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
    const code = (num % 100000000).toString().padStart(8, "0");
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

/** Hash a recovery code for storage (case-insensitive, dash-insensitive) */
export function hashRecoveryCode(code: string): string {
  const normalized = code.replace(/[^0-9]/g, "");
  return `rc$${normalized}`;
}

/** Check if a code matches any unused recovery code */
export function verifyRecoveryCode(
  input: string,
  storedHashes: string[]
): { valid: boolean; index: number } {
  const hash = hashRecoveryCode(input);
  const index = storedHashes.indexOf(hash);
  if (index === -1) return { valid: false, index: -1 };
  return { valid: true, index };
}
