import { useEffect,useState } from 'react';
import { api,auth,authenticate } from '@lhc/web/auth';
import { Shell,Gate,Metric } from '@lhc/web/components';
type Request={id:string;purpose:string;requestedTypes:string[];createdAt:string;decisionDeadlineAt:string;doctor:{displayName:string;hospital:{name:string}}};
type Consent={id:string;status:string;expiresAt:string;allowedTypes:string[]};
type Timeline={id:string;resourceType:string;recordVersion:number;anchorStatus:string;hospital:{name:string}};
type AuditEvent={id:string;action:string;outcome:string;createdAt:string};
type Verification={recordId:string;cardanoStatus:string;onchainVerified:boolean;reason?:string;txHash?:string};
export function App(){
 const [ready,setReady]=useState(false),[requests,setRequests]=useState<Request[]>([]),[consents,setConsents]=useState<Consent[]>([]),[timeline,setTimeline]=useState<Timeline[]>([]),[audit,setAudit]=useState<AuditEvent[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),
  [verifications,setVerifications]=useState<Record<string,Verification>>({});
 useEffect(()=>{authenticate().then(setReady).catch(e=>setError(String(e)));},[]);
 async function refresh(){try{const [r,c,t,a]=await Promise.all([
  api<Request[]>('/patients/me/access-requests'),api<Consent[]>('/patients/me/consents'),api<Timeline[]>('/patients/me/timeline'),api<AuditEvent[]>('/audit/me')]);
  setRequests(r);setConsents(c);setTimeline(t);setAudit(a);setError('');}catch(e){setError(String(e));}}
 useEffect(()=>{if(ready)void refresh();},[ready]);
 async function post(path:string){setBusy(true);try{await api(path,{method:'POST'});await refresh();}catch(e){setError(String(e));}finally{setBusy(false);}}
 async function verifyAnchor(recordId:string){
  setBusy(true);try{
   const result=await api<Verification>(`/records/${recordId}/verification`);
   setVerifications(prev=>({...prev,[recordId]:result}));setError('');
  }catch(e){setError(String(e));}finally{setBusy(false);}
 }
 return <Gate ready={ready} role="Patient"><Shell title="Your medical history" kicker="Patient overview" subtitle="Your connected medical history and access controls" role="Patient">
 {error&&<div className="notice error" role="alert">{error}</div>}
 <div className="grid"><Metric icon="▤" label="Medical record references" value={timeline.length}/><Metric icon="◫" label="Pending approvals" value={requests.length}/><Metric icon="✓" label="Active consents" value={consents.filter(c=>c.status==='ACTIVE').length}/></div>
 <div className="section-head"><h2>Pending medical access requests</h2><span className="muted">Your approval is required</span></div>
 <div className="card">{requests.length===0?<p className="empty">No pending access requests.</p>:requests.map(r=><div className="record" key={r.id}><div><div className="record-title">{r.doctor.displayName} · {r.doctor.hospital.name}</div><div className="record-meta">{r.purpose} · {r.requestedTypes.join(', ')} · Approve by {new Date(r.decisionDeadlineAt).toLocaleString()}</div></div><div className="actions"><button className="btn" disabled={busy} onClick={()=>post(`/access-requests/${r.id}/approve`)}>Approve</button><button className="btn danger" disabled={busy} onClick={()=>post(`/access-requests/${r.id}/reject`)}>Reject</button></div></div>)}</div>
 <div className="section-head"><h2>Consent management</h2></div><div className="card">{consents.length===0?<p className="empty">No previous decisions.</p>:consents.map(c=><div key={c.id} className="record"><div><div className="record-title">{c.allowedTypes.join(' · ')}</div><div className="record-meta">{c.status} · Expires {new Date(c.expiresAt).toLocaleString()}</div></div>{c.status==='ACTIVE'&&<button className="btn danger" onClick={()=>post(`/consents/${c.id}/revoke`)}>Revoke</button>}</div>)}</div>
 <div className="section-head"><h2>Medical history index</h2></div><div className="card">{timeline.map(t=><div className="record" key={t.id}><div><div className="record-title">{t.resourceType}</div><div className="record-meta">{t.hospital.name} · version {t.recordVersion}</div></div><div className="actions">
 <button className="btn secondary" disabled={busy} onClick={()=>verifyAnchor(t.id)}>Verify Cardano</button>
 <span className="pill">{verifications[t.id]
  ? (verifications[t.id].onchainVerified ? 'On-chain verified' : `Not verified: ${verifications[t.id].reason || verifications[t.id].cardanoStatus}`)
  : `Anchor: ${t.anchorStatus}`}</span>
 </div></div>)}</div>
 <div className="section-head"><h2>Access history & audit</h2></div><div className="card">{audit.length===0?<p className="empty">No access events yet.</p>:audit.map(a=><div className="record" key={a.id}><div><div className="record-title">{a.action}</div><div className="record-meta">{new Date(a.createdAt).toLocaleString()}</div></div><span className="pill">{a.outcome}</span></div>)}</div>
 </Shell></Gate>;
}
