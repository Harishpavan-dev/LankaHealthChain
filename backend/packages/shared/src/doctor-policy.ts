/** Independent of OIDC claims: administrative deactivation must revoke live
 * access. Identity/role checks are performed separately by the JWT guard.
 */
export function isDoctorOperational(
 doctor:{id:string;hospitalId:string;active:boolean;verified:boolean}|null|undefined,
 hospital:{id:string;active:boolean}|null|undefined,
):boolean{
 return !!doctor && !!hospital && doctor.active === true && doctor.verified === true &&
   hospital.active === true && doctor.hospitalId===hospital.id;
}
