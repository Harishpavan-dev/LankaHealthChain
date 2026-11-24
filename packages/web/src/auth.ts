import Keycloak from 'keycloak-js';
const url=import.meta.env.VITE_OIDC_URL || 'http://localhost:8080';
export const auth = new Keycloak({ url, realm: import.meta.env.VITE_OIDC_REALM || 'lankahealthchain',
  clientId: import.meta.env.VITE_OIDC_CLIENT_ID || 'lhc-web' });
export async function authenticate():Promise<boolean>{
 return auth.init({ onLoad:'check-sso', pkceMethod:'S256', checkLoginIframe:false });
}
export async function api<T>(path:string, init:RequestInit={}):Promise<T>{
 await auth.updateToken(15);
 const response=await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}${path}`,{
   ...init,headers:{'Content-Type':'application/json',Authorization:`Bearer ${auth.token}`,...init.headers}
 });
 if(!response.ok){
   const error=await response.json().catch(()=>({message:`HTTP ${response.status}`}));
   throw new Error(Array.isArray(error.message)?error.message.join(', '):error.message || `HTTP ${response.status}`);
 }
 return response.json() as Promise<T>;
}
