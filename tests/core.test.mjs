import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {parseU01,prepareModel,optimize,patchU01,validateModel} from '../src/core.mjs';import {exportBundle,crc32} from '../src/export.mjs';
const root=new URL('../',import.meta.url);const bytes=n=>new Uint8Array(fs.readFileSync(new URL('fixtures/'+n,root)));const demo=()=>{const input=JSON.parse(fs.readFileSync(new URL('fixtures/demo.json',root)));for(const j of input.jobs)j.bytes=bytes(j.name);return input;};const error=(fn,code)=>assert.throws(fn,e=>e.code===code);
const record=(cmd,dx=0,dy=0)=>[0x80|(dx<0?32:0)|(dy>=0?64:0)|cmd,Math.abs(dy),Math.abs(dx)];
const tiny=records=>new Uint8Array([...new Uint8Array(256),...records.flatMap(r=>record(...r))]);
test('canonical globally optimal plan and specified greedy baseline',()=>{const r=optimize(prepareModel(demo()));assert.equal(r.minimumChanges,2);assert.equal(r.greedyChanges,3);assert.deepEqual(r.steps.map(s=>s.needleSequence),[[2],[1],[1,2,1,2]]);assert.deepEqual(r.steps.map(s=>s.changes),[[{number:2,from:'B',to:'C'}],[],[{number:1,from:'A',to:'B'}]]);});
test('all source bytes except low needle command bits preserved',()=>{const d=demo(),r=optimize(prepareModel(d));for(let j=0;j<3;j++){const original=d.jobs[j].bytes,p=patchU01(original,d.jobs[j].mapping,r.steps[j].threadToNeedle);assert.notEqual(p.bytes,original);for(let i=0;i<original.length;i++){const cmd=i>=256&&(i-256)%3===0?original[i]&31:-1;if(cmd>=9&&cmd<=23)assert.equal(p.bytes[i]&224,original[i]&224);else assert.equal(p.bytes[i],original[i]);}assert.deepEqual(parseU01(p.bytes).records.map(({needle,command,...rest})=>rest),parseU01(original).records.map(({needle,command,...rest})=>rest));}});
test('unknown commands, implicit start, missing END, partial record, trailer, moving END rejected',()=>{error(()=>parseU01(tiny([[0],[24]])),'IMPLICIT_NEEDLE');error(()=>parseU01(tiny([[9],[0],[25],[24]])),'COMMAND');error(()=>parseU01(tiny([[9],[0]])),'MISSING_END');error(()=>parseU01(new Uint8Array([...bytes('01-c.u01'),0])),'TRUNCATED');error(()=>parseU01(new Uint8Array([...bytes('01-c.u01'),0,0,0])),'TRAILER');error(()=>parseU01(tiny([[9],[0],[24,1,0]])),'END_MOVEMENT');});
test('all supported original command types, moving stop, repeated needle selection retained',()=>{const b=tiny([[15,1,-1],[0,4,3],[1,-4,2],[2,1,1],[3,1,0],[4,-1,-1],[5,0,-2],[6,1,2],[7,0,0],[8,-3,1],[15,-2,-2],[0,2,2],[24]]);const p=patchU01(b,{7:'same'},{same:15});assert.equal(parseU01(p.bytes).records.length,13);assert.equal(parseU01(p.bytes).stopCount,1);assert.deepEqual(p.commands.map(r=>r.outputNeedle),[15,15]);});
test('mapping coverage and invalid identity rejected, same thread different source needles allowed',()=>{for(const mapping of [{},{1:'C',2:'A'},{1:''},{1:' C'},{1:12}]){const d=demo();d.jobs[0].mapping=mapping;assert.throws(()=>prepareModel(d));}const d=demo();d.jobs[2].mapping={3:'C',4:'C'};assert.equal(prepareModel(d).jobs[2].threads.length,1);});
test('locked, unavailable and nonconsecutive physical numbers obeyed',()=>{const d=demo();d.needles.forEach(n=>n.locked=true);assert.equal(optimize(prepareModel(d)).status,'infeasible');const e=demo();e.needles[2].unavailable=true;assert.equal(optimize(prepareModel(e)).minimumChanges,2);e.needles[0].number=14;e.needles[1].number=15;assert.deepEqual(optimize(prepareModel(e)).steps[2].needleSequence,[14,15,14,15]);});
test('hard bounds reject oversized inputs',()=>{const d=demo();d.jobs=[d.jobs[0]];error(()=>prepareModel(d),'JOB_COUNT');const e=demo();e.needles=Array.from({length:7},(_,i)=>({number:i+1,thread:null}));error(()=>prepareModel(e),'NEEDLE_COUNT');error(()=>parseU01(new Uint8Array(1048577)),'FILE_SIZE');const f=demo();f.needles[1].number=1;error(()=>prepareModel(f),'NEEDLE_NUMBER');});
test('duplicate loaded required threads can be reclaimed but one remains',()=>{const m={needles:[{number:1,thread:'A'},{number:2,thread:'A'}],jobs:[{threads:['A','B']},{threads:['A','B']}]};const r=optimize(m);assert.equal(r.minimumChanges,1);assert.deepEqual(new Set(r.steps[0].loads.map(x=>x.thread)),new Set(['A','B']));});
test('thread identity is text, including prototype-like keys; never RGB inference',()=>{const d=demo();d.jobs[0].mapping={'1':'__proto__'};const m=prepareModel(d),r=optimize(m);assert.equal(r.minimumChanges,3);assert.ok(Object.hasOwn(r.steps[0].threadToNeedle,'__proto__'));});
test('ZIP export authenticates current plan, escapes HTML, and includes native files',async()=>{const d=demo(),r=optimize(prepareModel(d)),bundle=await exportBundle(d,r);assert.equal(bundle.files.length,5);assert.equal(bundle.manifest.jobs[2].needleCommands.length,4);assert.equal(bundle.bytes[0],80);d.needles[0].thread='X';await assert.rejects(exportBundle(d,r),e=>e.code==='STALE');const e=demo();e.jobs[0].name='<img src=x onerror=alert(1)>.u01';const x=await exportBundle(e,optimize(prepareModel(e)));assert.ok(x.html.includes('&lt;img'));assert.ok(!x.html.includes('<img'));assert.ok(x.files.every(f=>/^[\w.-]+$/.test(f.name)));});
test('CRC32 standard vector',()=>assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926));
const vectors=JSON.parse(fs.readFileSync(new URL('oracle/vectors.json',root))).vectors;
for(const v of vectors)test('independent full-state Python oracle: '+v.name,()=>{let actual;try{const r=optimize(v.input);actual={status:r.status,minimumChanges:r.minimumChanges};}catch(e){actual={status:'invalid',minimumChanges:null};}assert.deepEqual(actual,v.expected);});

test('every needle value and every high-bit combination preserves all non-address bits',()=>{for(let source=1;source<=15;source++)for(let target=1;target<=15;target++)for(let flags=0;flags<8;flags++){const b=tiny([[source+8,2,-3],[0,1,1],[8,4,-5],[24]]);b[256]=(flags<<5)|(source+8);const out=patchU01(b,{[source]:'T'},{T:target}).bytes;assert.equal(out[256]&224,b[256]&224);assert.equal(out[256]&31,target+8);for(let i=0;i<b.length;i++)if(i!==256)assert.equal(out[i],b[i]);}});
test('export rejects a changed source coordinate even when the optimal loads are identical',async()=>{const d=demo(),r=optimize(prepareModel(d));d.jobs[0].bytes[260]++;await assert.rejects(exportBundle(d,r),e=>e.code==='STALE');});

test('other filename formats are rejected instead of reinterpreted as U01',()=>{const d=demo();d.jobs[0].name='design.dst';error(()=>prepareModel(d),'FILE_TYPE');});

test('asynchronous export takes immutable snapshots before any hashes yield',async()=>{const d=demo(),original=new Uint8Array(d.jobs[1].bytes),r=optimize(prepareModel(d));const pending=exportBundle(d,r);d.jobs[1].bytes[260]++;const bundle=await pending;assert.equal(bundle.files[1].bytes[260],original[260]);assert.equal(bundle.manifest.jobs[1].sourceSha256,await (await import('../src/export.mjs')).sha256(original));});

test('record and command-count guards reject manifest amplification before large allocation',()=>{error(()=>parseU01(new Uint8Array(256+200001*3)),'RECORD_COUNT');const head=new Uint8Array(256),r=[];for(let i=0;i<10001;i++)r.push(...record(9));r.push(...record(0),...record(24));error(()=>parseU01(new Uint8Array([...head,...r])),'NEEDLE_COMMAND_COUNT');const d=demo();d.jobs=Array.from({length:3},()=>({name:'many.u01',bytes:new Uint8Array(256+200000*3),mapping:{1:'A'}}));error(()=>prepareModel(d),'RECORD_COUNT');});

test('occupancy canonicalization uses exact lexical order for visually similar Unicode identities',()=>{const plain='ABCDEFGHIJ'.split(''),similar=plain.map((_,i)=>'A'+'\u200d'.repeat(i));const build=ids=>({needles:Array.from({length:6},(_,i)=>({number:i+1,thread:ids[i]})),jobs:[6,7,8,9,0,1,2,3].map(i=>({threads:[ids[i]]}))});const a=optimize(build(plain)),b=optimize(build(similar));assert.equal(a.minimumChanges,b.minimumChanges);assert.equal(a.stats.states,b.stats.states);assert.equal(a.stats.transitions,b.stats.transitions);});

test('checklist wraps maximum text and bounds displayed sequence without dropping native commands',async()=>{
 const d=demo();d.jobs[0].name='N'.repeat(251)+'.u01';const identity='T'.repeat(64);d.jobs[0].mapping={1:identity};
 d.jobs[0].bytes=tiny([...Array.from({length:150},()=>[9,1,-1]),[0,2,2],[8,-2,2],[24]]);
 const bundle=await exportBundle(d,optimize(prepareModel(d))),job=bundle.manifest.jobs[0];
 assert.equal(job.needleSequence.length,150);assert.equal(job.needleCommands.length,150);
 assert.equal(parseU01(bundle.files[0].bytes).needleCount,150);
 assert.ok(bundle.html.includes('overflow-wrap:anywhere'));assert.ok(bundle.html.includes('table-layout:fixed'));
 assert.ok(bundle.html.includes('first 120; full sequence in manifest.json'));
 assert.ok(bundle.html.includes(identity));assert.ok(bundle.html.includes(d.jobs[0].name));
});

test('packaging has no original-code license grant and keeps dependency attribution',()=>{
 const pkg=JSON.parse(fs.readFileSync(new URL('package.json',root))),lock=JSON.parse(fs.readFileSync(new URL('package-lock.json',root)));
 assert.equal(Object.hasOwn(pkg,'license'),false);assert.equal(Object.hasOwn(lock.packages[''],'license'),false);
 assert.equal(fs.existsSync(new URL('LICENSE',root)),false);
 assert.equal(lock.packages['node_modules/@playwright/test'].license,'Apache-2.0');
 const notices=fs.readFileSync(new URL('THIRD_PARTY_NOTICES.md',root),'utf8');assert.ok(notices.includes('pystitch 1.0.1'));assert.ok(notices.includes('MIT'));
 const freeze=fs.readFileSync(new URL('scripts/freeze-release.py',root),'utf8');assert.ok(!freeze.includes("glob('*.log')"));
});

test('printed checklist prefers installed Japanese fonts without bundling them',async()=>{const d=demo(),bundle=await exportBundle(d,optimize(prepareModel(d)));assert.ok(bundle.html.includes('"Noto Sans CJK JP","Noto Sans JP",system-ui,sans-serif'));assert.ok(!bundle.html.includes('@font-face'));});
