import Keycloak from 'keycloak-js';
// All browser-visible configuration comes from the Vite build environment.
// VITE_* fields are public by design: NEVER put passwords or server secrets here.
function requiredPublic(name: string, value: string | undefined): string {
  if (!value?.trim()) throw new Error(`Missing public frontend configuration: ${name}`);
  return value.trim();
}
const oidcUrl = requiredPublic('VITE_OIDC_URL', import.meta.env.VITE_OIDC_URL);
const realm = requiredPublic('VITE_OIDC_REALM', import.meta.env.VITE_OIDC_REALM);
const clientId = requiredPublic('VITE_OIDC_CLIENT_ID', import.meta.env.VITE_OIDC_CLIENT_ID);
const apiUrl = requiredPublic('VITE_API_URL', import.meta.env.VITE_API_URL).replace(/\/+$/, '');
for (const [name, value] of [['VITE_OIDC_URL', oidcUrl], ['VITE_API_URL', apiUrl]] as const) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
    throw new Error(`Invalid ${name}`);
  if (import.meta.env.PROD && url.protocol !== 'https:')
    throw new Error(`HTTPS is required for ${name} in a production frontend`);
}
export const auth = new Keycloak({ url: oidcUrl, realm, clientId });
export async function authenticate(): Promise<boolean> {
  return auth.init({ onLoad: 'check-sso', pkceMethod: 'S256', checkLoginIframe: false });
}
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('..'))
    throw new Error('API path must be a root-relative service path');
  if (!auth.authenticated) throw new Error('Login required');
  await auth.updateToken(15);
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...init.headers, Authorization: `Bearer ${auth.token}` },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
    throw new Error(Array.isArray(error.message) ? error.message.join(', ') : error.message || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}
