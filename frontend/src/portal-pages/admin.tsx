'use client';
import { useEffect,useState,type FormEvent } from 'react';
import { api } from '@/lib/auth';
import { Shell,Gate,Metric } from '@/components/portal';
type Hospital={id:string;code:string;name:string};
type DependencyHealth={status:'ready'|'degraded';hospitals:{code:string;status:'ready'|'disabled'|'unavailable'}[];clinicalDataExposed:false};
type WorkerStatus={status:'offline'|'stale'|'degraded'|'healthy';queued:number;deadLettered:number;prepared:number;lastSuccessAt:string|null;lastErrorCode:string|null;totalPrepared:number};
type Summary={hospitals:number;verifiedDoctors:number;patients:number;recordReferences:number;pendingConsents:number;pendingAnchors:number;consentMode:string};
type Operator={id:string;authSubject:string;active:boolean;hospital:{code:string;name:string}};
type ResearchGrant={id:string;authSubject:string;projectName:string;active:boolean;expiresAt:string};
export function App(){
 return <Gate role="Network Admin"><Dashboard /></Gate>;
}

function Dashboard(){
 const [hospitals,setHospitals]=useState<Hospital[]>([]),[summary,setSummary]=useState<Summary|null>(null),[dependencies,setDependencies]=useState<DependencyHealth|null>(null),[worker,setWorker]=useState<WorkerStatus|null>(null),[error,setError]=useState('');
 const [operators,setOperators]=useState<Operator[]>([]),[grants,setGrants]=useState<ResearchGrant[]>([]),
 [operatorSubject,setOperatorSubject]=useState(''),[operatorHospital,setOperatorHospital]=useState(''),
 [researchSubject,setResearchSubject]=useState(''),[project,setProject]=useState('Synthetic interoperability assessment'),
 [researchPurpose,setResearchPurpose]=useState('Review disclosure-controlled aggregate FHIR counts'),
 [researchExpiry,setResearchExpiry]=useState(''),[busy,setBusy]=useState(false),[success,setSuccess]=useState(''),[loading,setLoading]=useState(true);
 async function refreshGovernance(){
  try{const [ops,approved]=await Promise.all([api<Operator[]>('/admin/operators'),api<ResearchGrant[]>('/admin/research-grants')]);
   setOperators(ops);setGrants(approved);
  }catch(e){setError(String(e));}
 }
 async function refresh(){
  setLoading(true);setError('');
  try{await Promise.all([refreshGovernance(),Promise.all([api<Hospital[]>('/hospitals'),api<Summary>('/admin/summary'),
   api<DependencyHealth>('/admin/dependencies'),api<WorkerStatus>('/admin/worker-status')]).then(([h,s,d,w])=>{
    setHospitals(h);setSummary(s);setDependencies(d);setWorker(w);
    setOperatorHospital(current=>h.some(hospital=>hospital.code===current)?current:h[0]?.code??'');
   })]);
  }catch(e){setError(String(e));}finally{setLoading(false);}
 }
 useEffect(()=>{void refresh();},[]);
 async function request(path:string,method:'POST'|'PATCH',body:object){
  setBusy(true);setError('');setSuccess('');
  try{await api(path,{method,body:JSON.stringify(body)});await refreshGovernance();setSuccess('Governance change saved and audited.');}
  catch(e){setError(String(e));}finally{setBusy(false);}
 }

 function submitGrant(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const expiresAt=new Date(`${researchExpiry}T23:59:59Z`);
  if(!Number.isFinite(expiresAt.getTime())||expiresAt.getTime()<=Date.now()){
   setSuccess('');setError('Select a future grant expiry.');return;
  }
  void request('/admin/research-grants','POST',{
   authSubject:researchSubject.trim(),projectName:project.trim(),purpose:researchPurpose.trim(),expiresAt:expiresAt.toISOString(),
  });
 }
 return <Shell title="Network overview" subtitle="Monitor hospital readiness and manage administrative access." role="Network Admin"
  sections={[
   ['network-status','Network status'],['background-processing','Background processing'],['hospital-readiness','Hospital readiness'],
   ['hospital-directory','Hospital directory'],['hospital-operators','Hospital operators'],['research-approvals','Research approvals'],
  ]}>
 {error&&<div className="notice error" role="alert">{error}</div>}
 {success&&<div className="notice" role="status">{success}</div>}
 <div className="section-head"><h2 id="network-status">Network status</h2><button className="btn secondary" onClick={refresh} disabled={loading||busy}>{loading?'Refreshing…':'Refresh'}</button></div>
 <div className="metric-grid" aria-busy={loading}>
  <Metric label="Enrolled hospitals" value={summary?hospitals.length:'—'}/>
  <Metric label="Verified clinicians" value={summary?.verifiedDoctors??'—'}/>
  <Metric label="Synthetic patients" value={summary?.patients??'—'}/>
  <Metric label="Record references" value={summary?.recordReferences??'—'}/>
  <Metric label="Pending Cardano anchors" value={summary?.pendingAnchors??'—'}/>
 </div>
 <div className="section-head"><h2 id="background-processing">Background processing</h2></div>
 <div className="card" aria-label="Cardano preparation worker status">
  <div className="record"><div><div className="record-title">Cardano batch preparation</div><div className="record-meta">Offline Merkle proof preparation</div></div><span className="pill" data-tone={worker?.status==='healthy'?'success':worker?'warning':undefined}>{worker?.status??'Not checked'}</span></div>
  {worker&&<div className="metric-grid"><Metric label="Queued outbox events" value={worker.queued}/><Metric label="Prepared anchors" value={worker.prepared}/><Metric label="Dead-letter events" value={worker.deadLettered}/></div>}
  {worker?.lastErrorCode&&<p className="muted" role="status">Most recent worker error: {worker.lastErrorCode}</p>}
 </div>
 <div className="section-head"><h2 id="hospital-readiness">Hospital readiness</h2></div>
 <div className="card" aria-label="Readiness summary">{dependencies?.hospitals.map(h=><div className="record" key={h.code}>
  <div className="record-title">{h.code.charAt(0).toUpperCase()+h.code.slice(1)} hospital API</div>
  <span className="pill" data-tone={h.status==='ready'?'success':h.status==='unavailable'?'error':undefined}>{h.status}</span>
 </div>)}{!dependencies&&<p className="muted">Hospital readiness has not yet been confirmed.</p>}</div>
 <div className="section-head"><h2 id="hospital-directory">Hospital directory</h2></div>
 <div className="card" aria-busy={loading}>{hospitals.length===0?<p className="empty">{loading?'Loading hospitals…':'No hospitals are enrolled.'}</p>:hospitals.map(h=><div key={h.id} className="record"><div><div className="record-title">{h.name}</div><div className="record-meta">{h.code}</div></div></div>)}</div>
 <div className="section-head"><h2 id="hospital-operators">Hospital operators</h2></div>
 <details className="card"><summary className="record-title">Assign a hospital administrator</summary>
 <p className="muted">Keycloak identity must independently receive the hospital_admin role. This grants only one hospital's governance scope.</p>
 <div className="form-grid"><div className="field"><label htmlFor="hospital-code">Hospital</label>
 <select id="hospital-code" className="input" value={operatorHospital} onChange={e=>setOperatorHospital(e.target.value)}>{hospitals.map(h=><option key={h.code} value={h.code}>{h.name}</option>)}</select></div>
 <div className="field"><label htmlFor="operator-subject">Keycloak user subject</label><input id="operator-subject" className="input" value={operatorSubject} onChange={e=>setOperatorSubject(e.target.value)} placeholder="Identity provider subject ID"/></div></div>
 <button className="btn" disabled={busy||loading||!operatorHospital||operatorSubject.trim().length<5} onClick={()=>request('/admin/operators','POST',{authSubject:operatorSubject.trim(),hospitalCode:operatorHospital})}>Assign scoped operator</button></details>
 <section className="card" aria-label="Hospital operators">{operators.length===0?<p className="empty">No hospital operators registered.</p>:operators.map(o=><div className="record" key={o.id}><div><div className="record-title">{o.hospital.name}</div><div className="record-meta">Subject: {o.authSubject} · {o.active?'Active':'Revoked'}</div></div>
 <button className="btn secondary" disabled={busy} onClick={()=>request(`/admin/operators/${o.id}/status`,'PATCH',{active:!o.active})}>{o.active?'Revoke':'Restore'}</button></div>)}</section>
 <div className="section-head"><h2 id="research-approvals">Synthetic research approvals</h2></div>
 <details className="card"><summary className="record-title">Approve a synthetic-data-only research grant</summary>
 <p className="muted">Production use remains disabled. This is not ethics or institutional approval.</p>
 <form onSubmit={submitGrant}>
 <div className="form-grid"><div className="field"><label htmlFor="research-subject">Researcher Keycloak subject</label><input id="research-subject" className="input" required minLength={5} maxLength={128} value={researchSubject} onChange={e=>setResearchSubject(e.target.value)}/></div>
 <div className="field"><label htmlFor="research-expiry">Expiry date (UTC)</label><input id="research-expiry" type="date" className="input" required min={new Date().toISOString().slice(0,10)} value={researchExpiry} onChange={e=>setResearchExpiry(e.target.value)}/></div></div>
 <div className="field"><label htmlFor="project-name">Project title</label><input id="project-name" className="input" required minLength={5} maxLength={120} value={project} onChange={e=>setProject(e.target.value)}/></div>
 <div className="field"><label htmlFor="research-purpose">Approved purpose</label><input id="research-purpose" className="input" required minLength={10} maxLength={500} value={researchPurpose} onChange={e=>setResearchPurpose(e.target.value)}/></div>
 <button className="btn" disabled={busy||loading}>Approve synthetic grant</button></form></details>
 <section className="card" aria-label="Research grants">{grants.length===0?<p className="empty">No approved research projects.</p>:grants.map(g=><div className="record" key={g.id}><div><div className="record-title">{g.projectName}</div><div className="record-meta">{g.authSubject} · {g.active?'Active':'Revoked'} · {new Date(g.expiresAt).toLocaleDateString()}</div></div>
 <button className="btn secondary" disabled={busy} onClick={()=>request(`/admin/research-grants/${g.id}/status`,'PATCH',{active:!g.active})}>{g.active?'Revoke':'Restore'}</button></div>)}</section>
 <div className="notice warning">Demo-only governance: hospital enrollment and Keycloak staff provisioning must be performed separately. Administrative privileges never include clinical records.</div>
 </Shell>;
}
