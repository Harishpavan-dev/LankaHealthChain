// Fast syntax/transpile check. Does NOT replace a full TypeScript typecheck.
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const files=[];
function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
 if(['.next','.turbo','dist','node_modules','generated','managed','private'].includes(ent.name))continue;
 const f=path.join(dir,ent.name);
 if(ent.isDirectory())walk(f);
 else if(/\.(ts|tsx)$/.test(f) && !f.endsWith('.d.ts'))files.push(f);
}}
for(const dirname of ['frontend','backend','contracts','scripts'])walk(dirname);
let failures=0;
for(const f of files){
 let result;try{result=ts.transpileModule(fs.readFileSync(f,'utf8'),{
  fileName:f,reportDiagnostics:true,
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,
   jsx:ts.JsxEmit.ReactJSX,experimentalDecorators:true,emitDecoratorMetadata:true}
 });}catch(err){failures++;console.error('TRANSPILE CRASH '+f+' '+err);continue;}
 for(const diag of result.diagnostics||[]){failures++;console.error(`${f}: ${ts.flattenDiagnosticMessageText(diag.messageText,' ')}`);}
}
console.log(`Syntax-check: ${files.length} TypeScript/TSX files, ${failures} diagnostic(s).`);
if(failures)process.exitCode=1;
