import {readJsonResponseBounded} from './bounded-json.ts';
import {permittedHospitalUrl} from './hospital-endpoints.ts';

export type HospitalStatus='ready'|'disabled'|'unavailable';
export type HospitalReadiness={code:string;status:HospitalStatus};
/** Operator-only check. Never returns internal URL, errors, patient information,
 * or secrets. Invalid/missing registry config fails closed as unavailable.
 */
export async function probeHospitalReadiness(
 hospital:{code:string;baseUrl:string;active:boolean}|null|undefined,
 code:string,
 config:Record<string,string|undefined>=process.env,
 fetchImpl:typeof fetch=fetch,
):Promise<HospitalReadiness>{
 if(!hospital || !hospital.active)return {code,status:'disabled'};
 if(hospital.code!==code)return {code,status:'unavailable'};
 try {
  const url=permittedHospitalUrl(code,hospital.baseUrl,'/health/ready',config);
  const response=await fetchImpl(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(3000)});
  if(!response.ok)return {code,status:'unavailable'};
  const body=await readJsonResponseBounded(response,2048);
  return {code,status:typeof body==='object' && body!==null &&
   !Array.isArray(body) && (body as Record<string,unknown>).status==='ready' &&
   (body as Record<string,unknown>).hospital===code?'ready':'unavailable'};
 }catch {return {code,status:'unavailable'};}
}
