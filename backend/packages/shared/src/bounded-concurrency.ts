/** Stable-order bounded parallel I/O. Prevents N medical records producing
 * N simultaneous hospital requests while avoiding sequential head-of-line delay.
 * Results are ALL-OR-NOTHING: first failed item rejects the whole operation.
 */
export async function mapBounded<T,R>(
  items:readonly T[], limit:number, task:(item:T,index:number)=>Promise<R>,
):Promise<R[]> {
 if(!Array.isArray(items) || !Number.isSafeInteger(limit) || limit<1 || limit>32)
  throw new Error('Invalid bounded-work specification');
 const results=new Array<R>(items.length);
 let next=0;
 let firstFailure:unknown;
 let failed=false;
 async function worker():Promise<void>{
  while(!failed){
   const i=next++;
   if(i>=items.length)return;
   try { results[i]=await task(items[i],i); }
   catch(error){if(!failed){firstFailure=error;failed=true;}return;}
  }
 }
 await Promise.all(Array.from({length:Math.min(limit,items.length)},()=>worker()));
 if(failed)throw firstFailure;
 return results;
}
