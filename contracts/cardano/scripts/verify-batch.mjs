#!/usr/bin/env node
// Verify an inclusion proof against a provided Cardano metadata JSON file.
// On-chain confirmation must be checked separately against Cardano preprod.
import { readFileSync } from 'node:fs';
import { verifyMerkleProof } from '../../../packages/shared/src/merkle.ts';
const [proofFile,metadataFile,index='0'] = process.argv.slice(2);
if (!proofFile || !metadataFile) {console.error('Usage: verify-batch.mjs private-inclusion-proofs.json cardano-metadata.json index'); process.exit(2);}
try {
 const b=JSON.parse(readFileSync(proofFile,'utf8'));
 const m=JSON.parse(readFileSync(metadataFile,'utf8'));
 const root=m['1900']?.root;
 if (m['1900']?.v !== 1 || m['1900']?.alg !== 'LHC_SHA256_MERKLE_V1' || m['1900']?.count !== b.proofs.length || !/^[0-9a-f]{64}$/i.test(root)) throw new Error('Invalid Cardano metadata');
 if (!Number.isSafeInteger(+index) || +index<0 || +index >= b.proofs.length) throw new Error('Invalid proof index');
 const ok=verifyMerkleProof(b.proofs[+index],root);
 console.log(ok ? 'INCLUSION VERIFIED (OFFLINE ONLY)' : 'INCLUSION FAILED');
 process.exitCode=ok?0:1;
} catch(e) {console.error(e.message); process.exitCode=1;}
