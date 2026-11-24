import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

/** Nest dependency injection relies on the TypeScript legacy decorator metadata
 * emitted by tsc/ts-node. esbuild-powered tsx cannot emit type metadata. */
test('Nest development launchers preserve decorator metadata', () => {
 const tsconfig=JSON.parse(readFileSync('tsconfig.base.json','utf8'));
 assert.equal(tsconfig.compilerOptions.experimentalDecorators,true);
 assert.equal(tsconfig.compilerOptions.emitDecoratorMetadata,true);
 for(const name of ['api','hospital-simulator']){
  const manifest=JSON.parse(readFileSync(`apps/${name}/package.json`,'utf8'));
  assert.match(manifest.scripts.dev,/ts-node\/register\/transpile-only/);
  assert.ok(manifest.devDependencies['ts-node']);
  assert.doesNotMatch(manifest.scripts.dev,/tsx/);
 }
});
