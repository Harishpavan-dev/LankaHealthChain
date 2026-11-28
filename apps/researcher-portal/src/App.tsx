import {useEffect,useState} from 'react';
import {api,authenticate} from '@lhc/web/auth';
import {Shell,Gate,Metric} from '@lhc/web/components';
type Grant={projectName:string;purpose:string;expiresAt:string;mode:string};
type Analytics={resourceCounts:{resourceType:string;count:number}[];minimumCellSize:number;mode:string;suppressedSmallCells:boolean};
export function App(){
 const [ready,setReady]=useState(false),[grant,setGrant]=useState<Grant|null>(null),[analytics,setAnalytics]=useState<Analytics|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{authenticate().then(setReady).catch(e=>setError(String(e)));},[]);
 async function refresh(){setBusy(true);try{const [g,a]=await Promise.all([api<Grant>('/research/me'),api<Analytics>('/research/aggregates')]);setGrant(g);setAnalytics(a);setError('');}catch(e){setError(String(e));}finally{setBusy(false);}}
 useEffect(()=>{if(ready)void refresh();},[ready]);
 return <Gate ready={ready} role="Researcher"><Shell title="Research insights" kicker="Synthetic aggregate research" subtitle="Approved projects · Disclosure-controlled summary statistics" role="Researcher">
 {error&&<div className="notice error" role="alert">{error}</div>}
 {grant&&<section className="card"><h2>{grant.projectName}</h2><p className="muted">{grant.purpose}</p><p className="muted">Grant expiry: {new Date(grant.expiresAt).toLocaleString()} · {grant.mode}</p></section>}
 <div className="grid"><Metric icon="▤" label="Visible resource categories" value={analytics?.resourceCounts.length??'—'}/><Metric icon="✓" label="Minimum group size" value={analytics?.minimumCellSize??'—'}/><Metric icon="◇" label="Patient-level data" value="None"/></div>
 <div className="section-head"><h2>Synthetic FHIR resource distribution</h2><button className="btn secondary" disabled={busy} onClick={refresh}>Refresh</button></div>
 <section className="card">{analytics?.resourceCounts.length?analytics.resourceCounts.map(item=><div className="record" key={item.resourceType}><div className="record-title">{item.resourceType}</div><span className="pill">{item.count} records</span></div>):<p className="empty">No qualifying aggregate groups available.</p>}
 <p className="muted">Groups with fewer than {analytics?.minimumCellSize??10} observations are suppressed. No individual records are available.</p></section>
 <div className="notice warning">Research is disabled in production. Synthetic test data and these aggregate counts are not suitable for medical conclusions or external research publication.</div>
 </Shell></Gate>;
}
