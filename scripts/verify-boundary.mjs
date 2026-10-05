import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {prepareModel,optimize} from '../src/core.mjs';
import {exportBundle} from '../src/export.mjs';

assert.ok(process.execArgv.includes('--max-old-space-size=256'),'Run with --max-old-space-size=256 to make the memory gate reproducible');
// Full supported native/manifest expansion, with a bounded Node old-space heap.
const jobs=[166667,166667,166666].map((count,index)=>{
  const bytes=new Uint8Array(256+count*3);
  for(let record=0;record<10000;record++){
    bytes[256+record*3]=0xc9;bytes[256+record*3+2]=1;
  }
  for(let record=10000;record<count-1;record++)bytes[256+record*3]=0xc0;
  bytes[bytes.length-3]=0xf8;
  return{name:`boundary-${index}.u01`,bytes,mapping:{1:'A'}};
});
const input={needles:[{number:1,thread:'A'}],jobs};
const result=optimize(prepareModel(input));
const output=await exportBundle(input,result);
assert.equal(result.minimumChanges,0);
assert.equal(output.manifest.jobs.reduce((sum,job)=>sum+job.recordCount,0),500000);
assert.equal(output.manifest.jobs.reduce((sum,job)=>sum+job.needleCommands.length,0),30000);
for(let i=0;i<jobs.length;i++)assert.deepEqual(output.files[i].bytes,jobs[i].bytes);
const report={passed:true,requestedOldSpaceMiB:256,records:500000,needleCommands:30000,
  zipBytes:output.bytes.length,allManifestCommandsPresent:true,allNativeBytesEqual:true,
  scope:'A maximum native/command expansion case, not a worst-case optimizer timing proof.'};
await fs.mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});
await fs.writeFile(new URL('../artifacts/boundary-export.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
