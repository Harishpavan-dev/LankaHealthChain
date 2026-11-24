import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export type InternalRecordClaims = {
  iss: 'lhc-core';
  aud: 'lhc-hospital';
  hospitalCode: string;
  externalRecordId: string;
  localPatientId: string;
  resourceType: string;
  version: number;
  iat: number;
  exp: number;
  jti: string;
  action: 'read' | 'write';
};
function secretBytes(secret: string): Buffer {
  if (Buffer.byteLength(secret, 'utf8') < 32) throw new Error('INTERNAL_JWT_SECRET must contain at least 32 bytes');
  return Buffer.from(secret);
}
function hmac(data: string, secret: string): Buffer {
  return createHmac('sha256', secretBytes(secret)).update(data).digest();
}
/** Scoped HMAC bearer token for private demo networks, NOT a production OIDC / mTLS substitute. */
export function issueRecordToken(
  args: Pick<InternalRecordClaims, 'hospitalCode' | 'externalRecordId' | 'localPatientId' | 'resourceType' | 'version'> & { action?: 'read' | 'write' },
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): string {
  const claims: InternalRecordClaims = {
    iss: 'lhc-core', aud: 'lhc-hospital', ...args, action: args.action ?? 'read',
    iat: nowSeconds, exp: nowSeconds + 45, jti: randomUUID(),
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const signature = hmac(`${header}.${payload}`, secret).toString('base64url');
  return `${header}.${payload}.${signature}`;
}

export function verifyRecordToken(token: string, secret: string, nowSeconds = Math.floor(Date.now() / 1000)): InternalRecordClaims {
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((p) => !/^[a-zA-Z0-9_-]+$/.test(p))) throw new Error('Malformed token');
  const [header, payload, signature] = parts;
  // Reject noncanonical base64url: distinct token strings must not decode to
  // the same authenticated bytes (important for replay-cache identity).
  for (const segment of parts) {
    if (Buffer.from(segment, 'base64url').toString('base64url') !== segment)
      throw new Error('Noncanonical token encoding');
  }
  const received = Buffer.from(signature, 'base64url');
  const expected = hmac(`${header}.${payload}`, secret);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw new Error('Bad signature');
  const h = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
  if (h.alg !== 'HS256' || h.typ !== 'JWT') throw new Error('Invalid token header');
  const c: InternalRecordClaims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (c.iss !== 'lhc-core' || c.aud !== 'lhc-hospital' ||
      !Number.isSafeInteger(c.iat) || !Number.isSafeInteger(c.exp) ||
      c.exp <= nowSeconds || c.iat > nowSeconds + 5 || c.exp - c.iat > 45 ||
      typeof c.jti !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(c.jti) || typeof c.hospitalCode !== 'string' || typeof c.externalRecordId !== 'string' ||
      typeof c.localPatientId !== 'string' || typeof c.resourceType !== 'string' ||
      (c.action !== 'read' && c.action !== 'write') ||
      !Number.isSafeInteger(c.version) || c.version < 1) throw new Error('Invalid token claims');
  return c;
}
