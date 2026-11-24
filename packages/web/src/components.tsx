import React from 'react';
import { auth } from './auth';
export function Shell({title,kicker,subtitle,children,role}:{title:string;kicker:string;subtitle:string;children:React.ReactNode;role:string}){
 return <div className="app"><aside className="sidebar"><div className="brand"><div className="mark">✚</div>LankaHealthChain</div>
  <nav><div className="nav-title">{role} workspace</div><div className="nav-link active">▦ &nbsp; Dashboard</div><div className="nav-link">♙ &nbsp; Synthetic demo</div><div className="nav-link">♧ &nbsp; Trust & integrity</div></nav>
  <div className="sidebar-footer">FHIR R4 · Cardano · Midnight<br/><span>Not approved for clinical use</span></div>
 </aside><main className="main"><header className="top"><div><div className="eyebrow">{kicker}</div><h1>{title}</h1><p className="subtitle">{subtitle}</p></div><button className="logout" onClick={()=>auth.logout()}>Sign out</button></header>
  <div className="notice warning">Hackathon prototype using synthetic records. Local consent is NOT a Midnight proof; Cardano anchors are pending.</div>{children}</main></div>;
}
export function Gate({ready,role,children}:{ready:boolean;role:string;children:React.ReactNode}){
 if(!ready)return <div className="card auth"><div className="brand"><div className="mark">✚</div>LankaHealthChain</div><h1>{role} Portal</h1><p className="muted">Privacy-first healthcare interoperability · Synthetic demo only</p><button className="btn" onClick={()=>auth.login()}>Sign in with Keycloak</button></div>;
 const expected:Record<string,string>={Patient:'patient',Doctor:'doctor',Admin:'network_admin'};
 const roles=(auth.tokenParsed as {realm_access?:{roles?:string[]}}|undefined)?.realm_access?.roles || [];
 if(expected[role] && !roles.includes(expected[role])) return <div className="card auth">
   <h1>Insufficient permissions</h1><p className="muted">This portal requires the {expected[role]} role.</p>
   <button className="btn" onClick={()=>auth.logout({redirectUri:window.location.origin})}>Switch account</button>
 </div>;
 return <>{children}</>;
}
export function Metric({label,value,icon}:{label:string;value:string|number;icon:string}){
 return <div className="card"><div className="stat-icon">{icon}</div><div className="stat-val">{value}</div><div className="stat-label">{label}</div></div>;
}
