import 'server-only';

const SECRET_KEY_STR = process.env.SESSION_SECRET || 'younghwa-finance-default-secret-key-must-be-long';
const encoder = new TextEncoder();

async function getCryptoKey(): Promise<CryptoKey> {
  const keyData = encoder.encode(SECRET_KEY_STR);
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export interface SessionPayload {
  username: string;
  expiresAt: number;
}

/**
 * Signs a session payload and returns a token string.
 */
export async function signSession(payload: SessionPayload): Promise<string> {
  const key = await getCryptoKey();
  const payloadStr = JSON.stringify(payload);
  const payloadBase64 = btoa(unescape(encodeURIComponent(payloadStr)));
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payloadBase64)
  );
  
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${payloadBase64}.${signatureHex}`;
}

/**
 * Verifies a token string and returns the payload if valid, otherwise null.
 */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadBase64, signatureHex] = parts;
  
  try {
    const key = await getCryptoKey();
    
    // Parse signature hex back to bytes
    const match = signatureHex.match(/.{1,2}/g);
    if (!match) return null;
    const signatureBytes = new Uint8Array(match.map(byte => parseInt(byte, 16)));
    
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(payloadBase64)
    );
    
    if (!isValid) return null;
    
    const payloadStr = decodeURIComponent(escape(atob(payloadBase64)));
    const payload = JSON.parse(payloadStr) as SessionPayload;
    
    // Check expiration
    if (Date.now() > payload.expiresAt) {
      return null;
    }
    
    return payload;
  } catch (err) {
    console.error('verifySession failed:', err);
    return null;
  }
}
