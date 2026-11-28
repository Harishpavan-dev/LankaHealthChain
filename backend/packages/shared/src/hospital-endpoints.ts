/**
 * Hospital endpoints are enrolled by the operator, not supplied by patients or
 * doctors. Pin each registry URL to a deployment configuration allowlist to
 * stop an edited registry row being used as an SSRF pivot.
 */
export function permittedHospitalUrl(
  code: string,
  registryBaseUrl: string,
  pathname: string,
  config: Record<string,string|undefined> = process.env,
): URL {
  if (!/^[a-z][a-z0-9_-]{0,29}$/.test(code)) throw new Error('Invalid hospital code');
  if (!pathname.startsWith('/') || pathname.startsWith('//') || pathname.includes('\\'))
    throw new Error('Invalid internal hospital path');
  const expected = config[`HOSPITAL_${code.toUpperCase()}_URL`];
  if (!expected) throw new Error('Hospital endpoint not configured');
  const configured = new URL(expected);
  const registered = new URL(registryBaseUrl);
  const validate = (u:URL) => {
    if (!['http:','https:'].includes(u.protocol) || u.username || u.password ||
        u.search || u.hash || u.pathname!=='/') throw new Error('Noncanonical hospital endpoint');
    if (config.NODE_ENV==='production' && u.protocol!=='https:')
      throw new Error('Production hospital endpoint requires TLS');
  };
  validate(configured); validate(registered);
  if (registered.href !== configured.href) throw new Error('Hospital registry endpoint mismatch');
  return new URL(pathname,configured);
}
