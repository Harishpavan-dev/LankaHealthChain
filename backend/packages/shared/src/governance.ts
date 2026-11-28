/** Governance primitives intentionally independent of HTTP/ORM; usable in unit tests. */
export type ScopedOperator={authSubject:string;hospitalId:string;active:boolean};
export type ResearchApproval={authSubject:string;active:boolean;expiresAt:Date|string};
export const RESEARCH_MIN_CELL=10;
export function isActiveHospitalOperator(operator:ScopedOperator|null|undefined,actor:string,hospitalId:string):boolean {
 return Boolean(operator?.active && operator.authSubject===actor && operator.hospitalId===hospitalId);
}
export function hasActiveResearchGrant(grant:ResearchApproval|null|undefined,actor:string,now:Date):boolean {
 return Boolean(grant?.active && grant.authSubject===actor && Number.isFinite(new Date(grant.expiresAt).getTime()) && new Date(grant.expiresAt).getTime()>now.getTime());
}
export function suppressSmallCells<T extends {count:number}>(rows:T[],minCell=RESEARCH_MIN_CELL):T[] {
 if(!Number.isInteger(minCell)||minCell<RESEARCH_MIN_CELL)throw new Error('Cell threshold must be >= 10');
 return rows.filter(row=>Number.isSafeInteger(row.count)&&row.count>=minCell);
}
export function maskAuditEvent<T extends {id:string;action:string;outcome:string;createdAt:Date|string}>(event:T){
 return {id:event.id,action:event.action,outcome:event.outcome,createdAt:event.createdAt};
}
