import { useEffect,useState } from 'react';
import { api,authenticate } from '@lhc/web/auth';
import { Shell,Gate,Metric } from '@lhc/web/components';
type Hospital={id:string;code:string;name:string};
type DependencyHealth={status:'ready'|'degraded';hospitals:{code:string;status:'ready'|'disabled'|'unavailable'}[];clinicalDataExposed:false};
type Summary={hospitals:number;verifiedDoctors:number;patients:number;recordReferences:number;pendingConsents:number;pendingAnchors:number;consentMode:string};
type Operator={id:string;authSubject:string;active:boolean;hospital:{code:string;name:string}};
type ResearchGrant={id:string;authSubject:string;projectName:string;active:boolean;expiresAt:string};
export function App(){
 const [ready,setReady]=useState(false),[hospitals,setHospitals]=useState<Hospital[]>([]),[summary,setSummary]=useState<Summary|null>(null),[dependencies,setDependencies]=useState<DependencyHealth|null>(null),[error,setError]=useState('');
 const [operators,setOperators]=useState<Operator[]>([]),[grants,setGrants]=useState<ResearchGrant[]>([]),
 [operatorSubject,setOperatorSubject]=useState(''),[operatorHospital,setOperatorHospital]=useState('venus'),
 [researchSubject,setResearchSubject]=useState(''),[project,setProject]=useState('Synthetic interoperability assessment'),
 [researchPurpose,setResearchPurpose]=useState('Review disclosure-controlled aggregate FHIR counts'),
 [researchExpiry,setResearchExpiry]=useState('2027-01-01'),[busy,setBusy]=useState(false),[success,setSuccess]=useState('');
 async function refreshGovernance(){
  try{const [ops,approved]=await Promise.all([api<Operator[]>('/admin/operators'),api<ResearchGrant[]>('/admin/research-grants')]);
   setOperators(ops);setGrants(approved);
  }catch(e){setError(String(e));}
 }
 useEffect(()=>{if(ready)void refreshGovernance();},[ready]);
 async function request(path:string,method:'POST'|'PATCH',body:object){
  setBusy(true);setError('');setSuccess('');
  try{await api(path,{method,body:JSON.stringify(body)});await refreshGovernance();setSuccess('Governance change saved and audited.');}
  catch(e){setError(String(e));}finally{setBusy(false);}
 }

 useEffect(()=>{authenticate().then(setReady).catch(e=>setError(String(e)));},[]);
 useEffect(()=>{if(ready){void Promise.all([api<Hospital[]>('/hospitals'),api<Summary>('/admin/summary'),api<DependencyHealth>('/admin/dependencies')]).then(([h,s,d])=>{setHospitals(h);setSummary(s);setDependencies(d);}).catch(e=>setError(String(e)));}},[ready]);
 return <Gate ready={ready} role="Network Admin"><Shell title="Network overview" kicker="System administration" subtitle="Institution network and interoperability governance" role="Network Admin">
 {error&&<div className="notice error" role="alert">{error}</div>}
 {success&&<div className="notice" role="status">{success}</div>}
 <div className="grid"><Metric icon="⌂" label="Enrolled hospital simulators" value={hospitals.length}/><Metric icon="♧" label="API contract" value="v1"/><Metric icon="⚑" label="Pending Cardano anchors" value={summary?.pendingAnchors??'—'}/></div>
 {summary&&<div className="grid"><Metric icon="⚕" label="Verified clinicians" value={summary.verifiedDoctors}/><Metric icon="♙" label="Synthetic patients" value={summary.patients}/><Metric icon="▤" label="Record references" value={summary.recordReferences}/></div>}
 <div className="section-head"><h2>Hospital operational readiness</h2></div>
 <div className="card" aria-label="Readiness summary">{dependencies?.hospitals.map(h=><div className="record" key={h.code}>
  <div><div className="record-title">{h.code.charAt(0).toUpperCase()+h.code.slice(1)} hospital API</div>
   <div className="record-meta">Live database-backed readiness check; synthetic integration</div></div>
  <span className="pill">{h.status.toUpperCase()}</span>
 </div>)}{!dependencies&&<p className="muted">Hospital readiness has not yet been confirmed.</p>}</div>
 <div className="section-head"><h2>Connected hospital directory</h2></div><div className="card">{hospitals.map(h=><div key={h.id} className="record"><div><div className="record-title">{h.name}</div><div className="record-meta">{h.code} · Hospital data remains in separate PostgreSQL database</div></div><span className="pill">Demo enrolled</span></div>)}</div>
 <div className="section-head"><h2>Institutional access management</h2></div>
 <details className="card"><summary className="record-title">Assign a hospital administrator</summary>
 <p className="muted">Keycloak identity must independently receive the hospital_admin role. This grants only one hospital's governance scope.</p>
 <div className="form-grid"><div className="field"><label htmlFor="hospital-code">Hospital</label>
 <select id="hospital-code" className="input" value={operatorHospital} onChange={e=>setOperatorHospital(e.target.value)}>{hospitals.map(h=><option key={h.code} value={h.code}>{h.name}</option>)}</select></div>
 <div className="field"><label htmlFor="operator-subject">Keycloak user subject</label><input id="operator-subject" className="input" value={operatorSubject} onChange={e=>setOperatorSubject(e.target.value)} placeholder="Identity provider subject ID"/></div></div>
 <button className="btn" disabled={busy||operatorSubject.length<5} onClick={()=>request('/admin/operators','POST',{authSubject:operatorSubject,hospitalCode:operatorHospital})}>Assign scoped operator</button></details>
 <section className="card" aria-label="Hospital operators">{operators.length===0?<p className="empty">No hospital operators registered.</p>:operators.map(o=><div className="record" key={o.id}><div><div className="record-title">{o.hospital.name}</div><div className="record-meta">Subject: {o.authSubject} · {o.active?'Active':'Revoked'}</div></div>
 <button className="btn secondary" disabled={busy} onClick={()=>request(`/admin/operators/${o.id}/status`,'PATCH',{active:!o.active})}>{o.active?'Revoke':'Restore'}</button></div>)}</section>
 <div className="section-head"><h2>Synthetic research approvals</h2></div>
 <details className="card"><summary className="record-title">Approve a synthetic-data-only research grant</summary>
 <p className="muted">Production use remains disabled. This is not ethics or institutional approval.</p>
 <div className="form-grid"><div className="field"><label htmlFor="research-subject">Researcher Keycloak subject</label><input id="research-subject" className="input" value={researchSubject} onChange={e=>setResearchSubject(e.target.value)}/></div>
 <div className="field"><label htmlFor="research-expiry">Expiry date</label><input id="research-expiry" type="date" className="input" value={researchExpiry} onChange={e=>setResearchExpiry(e.target.value)}/></div></div>
 <div className="field"><label htmlFor="project-name">Project title</label><input id="project-name" className="input" value={project} onChange={e=>setProject(e.target.value)}/></div>
 <div className="field"><label htmlFor="research-purpose">Approved purpose</label><input id="research-purpose" className="input" value={researchPurpose} onChange={e=>setResearchPurpose(e.target.value)}/></div>
 <button className="btn" disabled={busy||researchSubject.length<5} onClick={()=>request('/admin/research-grants','POST',{
  authSubject:researchSubject,projectName:project,purpose:researchPurpose,expiresAt:new Date(researchExpiry+'T23:59:59Z').toISOString()})}>Approve synthetic grant</button></details>
 <section className="card" aria-label="Research grants">{grants.length===0?<p className="empty">No approved research projects.</p>:grants.map(g=><div className="record" key={g.id}><div><div className="record-title">{g.projectName}</div><div className="record-meta">{g.authSubject} · {g.active?'Active':'Revoked'} · {new Date(g.expiresAt).toLocaleDateString()}</div></div>
 <button className="btn secondary" disabled={busy} onClick={()=>request(`/admin/research-grants/${g.id}/status`,'PATCH',{active:!g.active})}>{g.active?'Revoke':'Restore'}</button></div>)}</section>
 <div className="notice warning">Demo-only governance: hospital enrollment and Keycloak staff provisioning must be performed separately. Administrative privileges never include clinical records.</div>
 </Shell></Gate>;
}
