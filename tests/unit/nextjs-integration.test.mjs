import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
test('single Next.js App Router retains six distinct Keycloak-gated clinical roles',()=>{
 const manifest=JSON.parse(read('frontend/package.json'));
 assert.match(manifest.dependencies.next,/^\^15\./);
 assert.ok(!existsSync(new URL('../../frontend/apps',import.meta.url)));
 const component=read('frontend/src/components/portal.tsx');
 const workspaces=read('frontend/src/lib/workspaces.ts');
 const roles={patient:'Patient',doctor:'Doctor',admin:'Network Admin','hospital-admin':'Hospital Admin',auditor:'Security Auditor',researcher:'Researcher'};
 for(const [slug,role] of Object.entries(roles)){
  const page=read(`frontend/src/app/${slug}/page.tsx`);
  const dashboard=read(`frontend/src/portal-pages/${slug}.tsx`);
  assert.match(page,/dynamic\(\(\)=>import/);
  assert.match(page,/ssr:false/);
  assert.ok(dashboard.includes(`<Gate role="${role}"><Dashboard /></Gate>`),`Expected dashboard to mount only inside role gate for ${slug}`);
  assert.ok(workspaces.includes(`'${slug==='admin'?'network_admin':slug==='auditor'?'security_auditor':slug.replaceAll('-','_')}'`),`Expected Keycloak role for ${role}`);
 }
 assert.match(component,/session\.roles\.includes\(workspace\.role\)\) return <>{children}<\/>/);
});
test('Keycloak PKCE and secure API bearer requests remain in Next.js client boundary',()=>{
 const auth=read('frontend/src/lib/auth.ts');
 assert.match(auth,/pkceMethod:'S256'/);
 assert.match(auth,/auth\.updateToken\(30\)/);
 assert.match(auth,/headers\.set\('Authorization',`Bearer \${token}`\)/);
 assert.match(auth,/NEXT_PUBLIC_OIDC_URL/);
 assert.match(auth,/NEXT_PUBLIC_API_URL/);
 assert.doesNotMatch(auth,/VITE_/);
});
test('local stack uses one Next.js frontend and dedicated API/Hospital/Worker services',()=>{
 const compose=read('infrastructure/docker/compose.app.yml');
 for(const svc of ['api','frontend','hospital-northern','hospital-jaffna','hospital-venus','anchor-worker']) assert.ok(compose.includes(`  ${svc}:`));
 assert.ok(!compose.includes('patient-portal:'));
 const ui=compose.split('  frontend:')[1];
 assert.ok(ui.includes('NEXT_PUBLIC_'));
 assert.doesNotMatch(ui,/DATABASE_URL|HOSPITAL_TOKEN_SECRET|LHC_CORE_DB_PASSWORD/);
 const env=read('.env.example');
 assert.match(env,/WEB_BASE_URL=http:\/\/localhost:3001/);
 assert.match(env,/CORS_ORIGINS=http:\/\/localhost:3001/);
});
