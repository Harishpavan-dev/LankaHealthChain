import { useEffect,useState } from 'react';
import { api,authenticate } from '@lhc/web/auth';
import { Shell,Gate,Metric } from '@lhc/web/components';
type Hospital={id:string;code:string;name:string};
type Summary={hospitals:number;verifiedDoctors:number;patients:number;recordReferences:number;pendingConsents:number;pendingAnchors:number;consentMode:string};
export function App(){
 const [ready,setReady]=useState(false),[hospitals,setHospitals]=useState<Hospital[]>([]),[summary,setSummary]=useState<Summary|null>(null),[error,setError]=useState('');
 useEffect(()=>{authenticate().then(setReady).catch(e=>setError(String(e)));},[]);
 useEffect(()=>{if(ready){void Promise.all([api<Hospital[]>('/hospitals'),api<Summary>('/admin/summary')]).then(([h,s])=>{setHospitals(h);setSummary(s);}).catch(e=>setError(String(e)));}},[ready]);
 return <Gate ready={ready} role="Admin"><Shell title="Network overview" kicker="System administration" subtitle="Institution network and interoperability governance" role="Network Admin">
 {error&&<div className="notice error">{error}</div>}
 <div className="grid"><Metric icon="⌂" label="Enrolled hospital simulators" value={hospitals.length}/><Metric icon="♧" label="API contract" value="v1"/><Metric icon="⚑" label="Blockchain anchors" value={summary?.pendingAnchors??'—'}/></div>
 {summary&&<div className="grid"><Metric icon="⚕" label="Verified clinicians" value={summary.verifiedDoctors}/><Metric icon="♙" label="Synthetic patients" value={summary.patients}/><Metric icon="▤" label="Record references" value={summary.recordReferences}/></div>}
 <div className="section-head"><h2>Connected hospital directory</h2></div><div className="card">{hospitals.map(h=><div key={h.id} className="record"><div><div className="record-title">{h.name}</div><div className="record-meta">{h.code} · Hospital data remains in separate PostgreSQL database</div></div><span className="pill">Demo enrolled</span></div>)}</div>
 <div className="notice warning">This admin view provides registry visibility only. Administrative enrollment, attestation, credential rotation and clinical governance require verified institutional agreements and are not available in this synthetic demo.</div>
 </Shell></Gate>;
}
