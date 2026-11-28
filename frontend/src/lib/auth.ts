'use client';
import Keycloak from 'keycloak-js';
// Public build-time values only. Do not place client secrets or signing keys in NEXT_PUBLIC_*.
function required(name: string, value: string | undefined): string {
  if (!value?.trim()) throw new Error(`Missing browser configuration: ${name}`);
  return value.trim();
}
const oidcUrl = required('NEXT_PUBLIC_OIDC_URL', process.env.NEXT_PUBLIC_OIDC_URL);
const realm = required('NEXT_PUBLIC_OIDC_REALM', process.env.NEXT_PUBLIC_OIDC_REALM);
const clientId = required('NEXT_PUBLIC_OIDC_CLIENT_ID', process.env.NEXT_PUBLIC_OIDC_CLIENT_ID);
const apiUrl = required('NEXT_PUBLIC_API_URL', process.env.NEXT_PUBLIC_API_URL).replace(/\/+$/, '');
for (const [name,value] of [['NEXT_PUBLIC_OIDC_URL',oidcUrl],['NEXT_PUBLIC_API_URL',apiUrl]] as const) {
 const url = new URL(value);
 if (!['http:','https:'].includes(url.protocol) || url.username || url.password) throw new Error(`Invalid ${name}`);
 if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:' && !['localhost','127.0.0.1','[::1]'].includes(url.hostname))
  throw new Error(`HTTPS is required for ${name} on a public network`);
}
export const auth = new Keycloak({url:oidcUrl,realm,clientId});
export class ApiError extends Error {
 constructor(message: string, readonly status: number) { super(message); }
}

type Session = {status:'loading'|'anonymous'|'unavailable'|'expired'} | {status:'authenticated'; roles: readonly string[]};
const initialSession: Session = {status:'loading'};
let session: Session = initialSession;
let initPromise: Promise<void>|undefined;
const listeners = new Set<() => void>();

function publishSession(next: Session) {
 session=next;
 for (const listener of listeners) listener();
}

function publishAuthenticatedSession() {
 publishSession({status:'authenticated',roles:auth.realmAccess?.roles??[]});
}

auth.onAuthRefreshSuccess=publishAuthenticatedSession;
auth.onAuthLogout=()=>publishSession({status:'expired'});

export const getSession = () => session;
export const getInitialSession = () => initialSession;
export function subscribeToSession(listener: () => void) {
 listeners.add(listener);
 return () => { listeners.delete(listener); };
}

export function authenticate(): Promise<void> {
 // Strict Mode and client-side navigation share the same Keycloak instance.
 if (!initPromise) initPromise=(async()=>{
  try {
   const discovery=await fetch(`${oidcUrl.replace(/\/+$/,'')}/realms/${encodeURIComponent(realm)}/.well-known/openid-configuration`,{
    cache:'no-store',signal:AbortSignal.timeout(8000),
   });
   if (!discovery.ok) throw new Error('Keycloak realm is unavailable');
   const signedIn=await auth.init({onLoad:'check-sso',pkceMethod:'S256',checkLoginIframe:false});
   if (signedIn && auth.authenticated) publishAuthenticatedSession();
   else publishSession({status:'anonymous'});
  } catch {
   publishSession({status:'unavailable'});
  }
 })();
 return initPromise;
}
export async function api<T>(path:string, init:RequestInit={}): Promise<T> {
 const pathname=path.split('?',1)[0];
 if(!pathname.startsWith('/') || pathname.startsWith('//') || pathname.includes('..') || pathname.includes('\\')) throw new Error('Invalid API path');
 if(!auth.authenticated) throw new Error('Login required');
 await auth.updateToken(30);
 const token=auth.token;
 if(!token) throw new Error('Session expired, please sign in again');
 const headers=new Headers(init.headers);
 if(init.body && !headers.has('Content-Type')) headers.set('Content-Type','application/json');
 headers.set('Authorization',`Bearer ${token}`);
 const timeout=AbortSignal.timeout(45000);
 const signal=init.signal?AbortSignal.any([init.signal,timeout]):timeout;
 const response=await fetch(`${apiUrl}${path}`,{
  ...init,cache:'no-store',credentials:'omit',redirect:'error',headers,signal,
 });
 if(response.status===401 && auth.token===token){
  auth.clearToken();
  throw new Error('Session rejected, please sign in again');
 }
 if(!response.ok){
  const error=await response.json().catch(()=>null);
  const message=error?.message;
  throw new ApiError((Array.isArray(message)?message.join(', '):typeof message==='string'?message:'')||`HTTP ${response.status}`,response.status);
 }
 if(response.status===204) return undefined as T;
 return response.json() as Promise<T>;
}
