/** Strict cursor inputs for paginated API v1 endpoints; no offset scans. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function parsePageLimit(raw?:string):number {
  if(raw===undefined || raw==='')return 25;
  if(!/^[1-9]\d{0,2}$/.test(raw))throw new Error('limit must be a positive integer');
  const n=Number(raw);
  if(n>100)throw new Error('limit must be at most 100');
  return n;
}
export function parsePageCursor(raw?:string):string | undefined {
  if(raw===undefined || raw==='')return undefined;
  if(!UUID.test(raw))throw new Error('cursor must be a UUID');
  return raw;
}
export function pageResult<T extends {id:string}>(items:T[], limit:number):{items:T[];nextCursor:string|null} {
  const page=items.slice(0,limit);
  return {items:page,nextCursor:items.length>limit ? page[page.length-1]?.id ?? null : null};
}
