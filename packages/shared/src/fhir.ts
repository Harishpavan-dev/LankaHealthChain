/** Small FHIR R4 subset for an entirely synthetic hackathon demonstration.
 * NOT a replacement for HL7 profile/terminology validation at a real hospital.
 */
const TYPES = ['Observation','DiagnosticReport','MedicationRequest','AllergyIntolerance','Condition'] as const;
const REF = /^Patient\/[a-zA-Z0-9._-]{1,80}$/;
const ID = /^[a-zA-Z0-9._-]{1,64}$/;
const isObject = (value:unknown): value is Record<string,unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const refValue = (obj:unknown):string|null => isObject(obj) && typeof obj.reference === 'string' && REF.test(obj.reference) ? obj.reference : null;
/** In FHIR R4 AllergyIntolerance links by `patient`, NOT `subject`. */
export function fhirPatientReference(resource:unknown):string|null {
 if(!isObject(resource))return null;
 if(resource.resourceType==='AllergyIntolerance')return refValue(resource.patient);
 return refValue(resource.subject);
}
/** Avoid leaking or trusting a caller-supplied subject/patient link.
 * Return a new resource with the server-validated hospital-local patient ref.
 */
export function bindFhirPatient(resource:Record<string,unknown>, localPatientRef:string):Record<string,unknown> {
 if(!/^[a-zA-Z0-9._-]{1,80}$/.test(localPatientRef))throw new Error('Invalid hospital-local patient reference');
 const {subject: _subject, patient: _patient, ...body} = resource;
 const link={reference:`Patient/${localPatientRef}`};
 return resource.resourceType==='AllergyIntolerance' ? {...body,patient:link} : {...body,subject:link};
}
/** Basic resource-envelope gate, including R4 patient reference semantics. */
export function isSupportedFhirResource(resource:unknown):resource is Record<string,unknown> {
 if(!isObject(resource))return false;
 const type=resource.resourceType;
 if(typeof type!=='string' || !(TYPES as readonly string[]).includes(type))return false;
 if(typeof resource.id!=='string' || !ID.test(resource.id) || !fhirPatientReference(resource))return false;
 if(type==='AllergyIntolerance' && 'subject' in resource)return false;
 const needsStatus=type!=='Condition' && type!=='AllergyIntolerance';
 return !needsStatus || (typeof resource.status==='string' && resource.status.length>0);
}
function codeable(value:unknown):boolean {
 if(!isObject(value))return false;
 if(typeof value.text==='string' && value.text.trim().length>0 && value.text.length<=1024)return true;
 return Array.isArray(value.coding) && value.coding.length>0 && value.coding.length<=10 &&
   value.coding.some((v:unknown)=>isObject(v) && typeof v.code==='string' && v.code.length>0 && v.code.length<=128);
}
/** Lightweight demo-write validation (bounded JSON, minimal mandatory R4 fields).
 * A production gateway must use actual FHIR R4 profiles, terminology and signature checks.
 */
export function validateDemoClinicalWrite(resource:unknown, maxBytes=256*1024):resource is Record<string,unknown> {
 if(!isSupportedFhirResource(resource))return false;
 if(!Number.isSafeInteger(maxBytes)||maxBytes<1024)return false;
 let bytes:number;
 try{bytes=Buffer.byteLength(JSON.stringify(resource),'utf8');}catch{return false;}
 if(bytes>maxBytes)return false;
 switch(resource.resourceType){
  case 'Observation':
   if(!['registered','preliminary','final','amended','corrected','cancelled','entered-in-error','unknown'].includes(resource.status as string) || !codeable(resource.code))return false;
   if(resource.valueQuantity!==undefined){
    const q=resource.valueQuantity;
    if(!isObject(q) || typeof q.value!=='number' || !Number.isFinite(q.value) || typeof q.unit!=='string' || q.unit.length>128)return false;
   }
   return true;
  case 'DiagnosticReport':
   return ['registered','partial','preliminary','final','amended','corrected','appended','cancelled','entered-in-error','unknown'].includes(resource.status as string) && codeable(resource.code);
  case 'MedicationRequest':
   return ['draft','active','on-hold','cancelled','completed','entered-in-error','stopped','unknown'].includes(resource.status as string) &&
    ['proposal','plan','order','original-order','reflex-order','filler-order','instance-order','option'].includes(resource.intent as string) &&
    (codeable(resource.medicationCodeableConcept) || (isObject(resource.medicationReference) && typeof resource.medicationReference.reference==='string'));
  case 'Condition': return codeable(resource.code);
  case 'AllergyIntolerance': return codeable(resource.code);
  default: return false;
 }
}
