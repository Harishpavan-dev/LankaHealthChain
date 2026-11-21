/** Validated deployment configuration. No credentials are logged or returned. */
export type RuntimeEnvironment = Record<string, string | undefined>;

export function requiredConfig(name: string, env: RuntimeEnvironment = process.env): string {
  const value = env[name]?.trim();
  if (!value || /CHANGE_[A-Z0-9_]+|REPLACE_[A-Z0-9_]+|YOUR_[A-Z0-9_]+|^TODO$/i.test(value))
    throw new Error(`${name} must be configured; never use example placeholders`);
  return value;
}

export function parseListenPort(value: string | undefined, name = 'PORT'): number {
  if (!value || !/^[1-9]\d{0,4}$/.test(value))
    throw new Error(`${name} must be an integer from 1 to 65535`);
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number > 65535)
    throw new Error(`${name} must be an integer from 1 to 65535`);
  return number;
}

function isLoopback(host: string): boolean {
  return ['localhost', '127.0.0.1', '[::1]'].includes(host.toLowerCase());
}

/** Restrict outbound service/provider URLs to an operator-configured base. */
export function configuredHttpBase(value: string, name: string, production = false, allowPath = false): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error(`${name} must be an absolute HTTP(S) URL`); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
    throw new Error(`${name} contains unsupported URL components`);
  if (!allowPath && url.pathname !== '/') throw new Error(`${name} must be an origin without a path`);
  if (production && (url.protocol !== 'https:' || isLoopback(url.hostname)))
    throw new Error(`${name} must be a non-loopback HTTPS URL in production`);
  return url;
}

/** Explicit CORS allowlist; no wildcard or implicit localhost fallback. */
export function parseCorsOrigins(value: string | undefined, production = false): string[] {
  if (!value?.trim()) throw new Error('CORS_ORIGINS is required');
  const parts = value.split(',').map(v => v.trim());
  if (parts.length > 30 || parts.some(v => !v || v === '*')) throw new Error('Invalid CORS_ORIGINS allowlist');
  const origins = parts.map(v => {
    const u = configuredHttpBase(v, 'CORS_ORIGINS', production);
    if (u.href !== `${u.origin}/`) throw new Error('CORS_ORIGINS must contain only origins');
    return u.origin;
  });
  if (new Set(origins).size !== origins.length) throw new Error('Duplicate CORS origin');
  return origins;
}

/** Cardano metadata RPC is changeable without changing source code. */
export function cardanoMetadataUrl(baseUrl: string, txHash: string, production = false): URL {
  if (!/^[0-9a-f]{64}$/i.test(txHash)) throw new Error('Invalid Cardano transaction hash');
  const u = configuredHttpBase(baseUrl, 'CARDANO_METADATA_API_BASE_URL', production, true);
  if (u.protocol !== 'https:' && !isLoopback(u.hostname))
    throw new Error('Cardano metadata provider requires HTTPS (except localhost tests)');
  const normalized = u.href.replace(/\/+$/, '');
  return new URL(`${normalized}/txs/${txHash.toLowerCase()}/metadata`);
}
