import { mkdirSync,readFileSync,writeFileSync,renameSync,unlinkSync,existsSync,statSync } from 'node:fs';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {recoverAnchorManifest,type PersistedAnchorRow} from './anchor-recovery.ts';

/** Atomically write each reproducible artifact and reject mismatched existing
 * files. A crash may leave a .tmp file but cannot leave a partial final file.
 */
function writeImmutableJson(path:string, value:unknown) {
 const content=JSON.stringify(value,null,2)+'\n';
 if (existsSync(path)) {
   const existing=readFileSync(path,'utf8');
   if(existing!==content)throw new Error(`Existing batch artifact differs from committed database: ${path}`);
   return;
 }
 const temp=`${path}.${randomUUID()}.tmp`;
 try {
   writeFileSync(temp,content,{flag:'wx',mode:0o600});
   // A concurrent worker must not overwrite a differing published artifact.
   if(existsSync(path)){
     if(readFileSync(path,'utf8')!==content)throw new Error('Batch artifact race or modification');
   } else renameSync(temp,path);
 } finally {if(existsSync(temp))unlinkSync(temp);}
}

/** Private output path is root-derived only, never patient/user controlled. */
export function persistAnchorArtifacts(base:string,root:string,rows:readonly PersistedAnchorRow[]) {
 const {manifest,metadata}=recoverAnchorManifest(root,rows);
 const destination=join(resolve(base),root);
 mkdirSync(destination,{recursive:true,mode:0o700});
 if(!statSync(destination).isDirectory())throw new Error('Batch destination must be a directory');
 writeImmutableJson(join(destination,'cardano-metadata.json'),metadata);
 writeImmutableJson(join(destination,'private-inclusion-proofs.json'),manifest);
 return {root,records:manifest.proofs.length,destination};
}
