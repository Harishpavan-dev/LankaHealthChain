#!/usr/bin/env node
// Usage: node contracts/cardano/scripts/prepare-batch.mjs commitments.json output-dir
// Input: JSON array of *randomized 64-hex commitments*, never clinical records.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { makeMerkleBatch, cardanoAnchorMetadata } from '../../../backend/packages/shared/src/merkle.ts';
const [input, out] = process.argv.slice(2);
if (!input || !out) {console.error('Usage: prepare-batch.mjs commitments.json output-dir');process.exit(2);}
try {
 const values = JSON.parse(readFileSync(resolve(input),'utf8'));
 if (!Array.isArray(values) || !values.every(v=>typeof v==='string')) throw new Error('Expected JSON array of hex commitments');
 const batch = makeMerkleBatch(values);
 mkdirSync(resolve(out),{recursive:true});
 writeFileSync(join(resolve(out),'cardano-metadata.json'),JSON.stringify(cardanoAnchorMetadata(batch.root,batch.proofs.length),null,2)+'\n',{flag:'w'});
 writeFileSync(join(resolve(out),'private-inclusion-proofs.json'),JSON.stringify(batch,null,2)+'\n',{flag:'w',mode:0o600});
 console.log(`Prepared ${values.length} randomized commitments; root ${batch.root}; NOT submitted to chain.`);
} catch(e) {console.error('Failed to prepare batch:',e.message);process.exitCode=1;}
