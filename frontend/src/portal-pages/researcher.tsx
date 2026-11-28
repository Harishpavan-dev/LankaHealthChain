'use client';
import {useEffect,useState} from 'react';
import { api } from '@/lib/auth';
import {Shell,Gate,Metric} from '@/components/portal';
import { resourceLabel } from '@/lib/display-labels';
type Grant={projectName:string;purpose:string;expiresAt:string;mode:string};
type Analytics={resourceCounts:{resourceType:string;count:number}[];minimumCellSize:number;mode:string;suppressedSmallCells:boolean};
export function App(){
 return <Gate role="Researcher"><Dashboard /></Gate>;
}

function Dashboard(){
 const [grant,setGrant]=useState<Grant|null>(null),[analytics,setAnalytics]=useState<Analytics|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(true);
 async function refresh(){setBusy(true);try{const [g,a]=await Promise.all([api<Grant>('/research/me'),api<Analytics>('/research/aggregates')]);setGrant(g);setAnalytics(a);setError('');}catch(e){setError(String(e));}finally{setBusy(false);}}
 useEffect(()=>{void refresh();},[]);
 return <Shell title="Research insights" subtitle="View aggregate statistics for your approved research project." role="Researcher">
 {error&&<div className="notice error" role="alert">{error}</div>}
 {grant&&<section className="card"><h2>{grant.projectName}</h2><p className="muted">{grant.purpose}</p><p className="muted">Grant expiry: {new Date(grant.expiresAt).toLocaleString()} · {grant.mode}</p></section>}
 <div className="metric-grid"><Metric label="Visible resource categories" value={analytics?.resourceCounts.length??'—'}/><Metric label="Minimum group size" value={analytics?.minimumCellSize??'—'}/><Metric label="Patient-level data" value="None"/></div>
 <div className="section-head"><h2>Synthetic FHIR resource distribution</h2><button className="btn secondary" disabled={busy} onClick={refresh}>Refresh</button></div>
 <section className="card" aria-busy={busy}>{analytics?analytics.resourceCounts.length?analytics.resourceCounts.map(item=><div className="record" key={item.resourceType}><div className="record-title">{resourceLabel(item.resourceType)}</div><span className="pill">{item.count} records</span></div>):<p className="empty">No qualifying aggregate groups available.</p>:busy?<p className="empty" role="status">Loading research aggregates…</p>:<p className="empty">Research aggregates are unavailable.</p>}
 {analytics&&<p className="muted">Groups with fewer than {analytics.minimumCellSize} observations are suppressed.</p>}</section>
 <div className="notice warning">Research is disabled in production. Synthetic test data and these aggregate counts are not suitable for medical conclusions or external research publication.</div>
 </Shell>;
}
