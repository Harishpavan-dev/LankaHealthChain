/** Stream response bytes with a hard bound, even when Content-Length is absent,
 * incorrect or the server uses chunked transfer encoding. */
export async function readJsonResponseBounded(response:Response, maxBytes=1024*1024):Promise<unknown>{
 if(!Number.isSafeInteger(maxBytes)||maxBytes<1)throw new Error('Invalid response limit');
 const declared=response.headers.get('content-length');
 if(declared!==null && (!/^\d+$/.test(declared) || Number(declared)>maxBytes))
   throw new Error('Hospital response exceeds size limit');
 if(!response.body)throw new Error('Hospital response has no body');
 const reader=response.body.getReader();
 const buffers:Uint8Array[]=[];
 let total=0;
 try{
  for(;;){
   const {value,done}=await reader.read();
   if(done)break;
   total+=value.byteLength;
   if(total>maxBytes)throw new Error('Hospital response exceeds size limit');
   buffers.push(value);
  }
 }catch(e){await reader.cancel().catch(()=>undefined);throw e;}
 finally{reader.releaseLock();}
 return JSON.parse(Buffer.concat(buffers.map(b=>Buffer.from(b)),total).toString('utf8'));
}
