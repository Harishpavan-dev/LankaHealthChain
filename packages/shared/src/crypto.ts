import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** Stable JSON encoding for demo FHIR resources; production needs a published canonicalization standard. */
export function canonicalJson(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Non-finite numbers are forbidden');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    return '{' + Object.keys(o).sort().map((k) => {
      if (o[k] === undefined) throw new Error('Undefined values are forbidden');
      return JSON.stringify(k) + ':' + canonicalJson(o[k]);
    }).join(',') + '}';
  }
  throw new Error('Unsupported JSON value');
}

export function computeCommitment(resource: unknown, nonceHex: string): string {
  if (!/^[a-f0-9]{64}$/i.test(nonceHex)) throw new Error('Expected a 32-byte nonce');
  const canonical = Buffer.from(canonicalJson(resource), 'utf8');
  const length = Buffer.alloc(8);
  length.writeBigUInt64BE(BigInt(canonical.length));
  return createHash('sha256')
    .update('LHC:record:commitment:v1\0')
    .update(Buffer.from(nonceHex, 'hex'))
    .update(length)
    .update(canonical)
    .digest('hex');
}

export function createCommitment(resource: unknown): { commitment: string; nonceHex: string } {
  const nonceHex = randomBytes(32).toString('hex');
  return { nonceHex, commitment: computeCommitment(resource, nonceHex) };
}

export function verifyCommitment(resource: unknown, nonceHex: string, expected: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(expected)) return false;
  const actual = Buffer.from(computeCommitment(resource, nonceHex), 'hex');
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}
