// NeedleBatch: dependency-free, bounded exact planning and byte-preserving U01 retargeting.
export const LIMITS=Object.freeze({jobsMin:2,jobsMax:8,usableNeedles:6,physicalNeedles:15,threads:10,fileBytes:1048576,totalBytes:4194304,threadLength:64,recordsPerFile:200000,recordsTotal:500000,needleCommandsPerFile:10000,needleCommandsTotal:30000});
export class InputError extends Error{constructor(code,message){super(message);this.name='InputError';this.code=code;}}
const fail=(code,message)=>{throw new InputError(code,message)};
// Private byte snapshots bind an in-memory plan to the exact inputs that produced it.
const planOrigins=new WeakMap();
function origin(model){return{model:JSON.stringify({needles:model.needles,jobs:model.jobs.map(j=>({name:j.name,threads:j.threads,mapping:j.mapping}))}),bytes:model.jobs.map(j=>j.bytes?new Uint8Array(j.bytes):null)};}
export function isPlanCurrent(model,result){const saved=planOrigins.get(result);if(!saved)return false;const now=origin(model);return saved.model===now.model&&saved.bytes.length===now.bytes.length&&saved.bytes.every((b,i)=>b===null?now.bytes[i]===null:now.bytes[i]&&b.length===now.bytes[i].length&&b.every((v,k)=>v===now.bytes[i][k]));}
export function parseU01(bytes){
 if(!(bytes instanceof Uint8Array))fail('FORMAT','Expected binary U01 bytes');
 if(bytes.length>LIMITS.fileBytes)fail('FILE_SIZE','Each file must be at most 1 MiB');
 if(bytes.length<262)fail('FORMAT','U01 requires a 256-byte header, records, and END');
 if((bytes.length-256)/3>LIMITS.recordsPerFile)fail('RECORD_COUNT','At most 200,000 native records per file');
 if((bytes.length-256)%3)fail('TRUNCATED','Partial U01 record or unsupported trailer');
 let x=0,y=0,selected=null,stitchCount=0,stopCount=0,needleCount=0,ended=false;
 const records=[],sourceNeedles=new Set();
 for(let offset=256;offset<bytes.length;offset+=3){
  const ctrl=bytes[offset],command=ctrl&31;
  if(command>24)fail('COMMAND',`Unsupported command 0x${command.toString(16)} at byte ${offset}`);
  if(ended)fail('TRAILER',`Data follows END at byte ${offset}; trailers are unsupported`);
  const dx=(ctrl&32?-1:1)*bytes[offset+2],dy=(ctrl&64?1:-1)*bytes[offset+1];
  const needle=command>=9&&command<=23?command-8:null;
  if(needle!==null){if(++needleCount>LIMITS.needleCommandsPerFile)fail('NEEDLE_COMMAND_COUNT','At most 10,000 needle-selection commands per file');selected=needle;sourceNeedles.add(needle);}
  const sewing=command===0||((command===2||command===4)&&(dx!==0||dy!==0));
  if(sewing){if(selected===null)fail('IMPLICIT_NEEDLE',`Explicit needle selection is required before sewing at byte ${offset}`);stitchCount++;}
  if(command===8)stopCount++;
  // END displacement is ignored by reference readers, so reject rather than misdescribe it.
  if(command===24){if(dx||dy)fail('END_MOVEMENT','END must have zero displacement');ended=true;}
  else{x+=dx;y+=dy;}
  records.push({index:records.length,offset,command,needle,dx,dy,x,y});
 }
 if(!ended)fail('MISSING_END','U01 must have a final END record');
 if(!sourceNeedles.size||!stitchCount)fail('EMPTY_DESIGN','A design needs explicit needle selection and at least one stitch');
 return{records,sourceNeedles:[...sourceNeedles].sort((a,b)=>a-b),stitchCount,stopCount,needleCount};
}
function thread(value,allowNull=false){
 if(allowNull&&(value===null||value===undefined||value===''))return null;
 if(typeof value!=='string'||!value.trim()||value!==value.trim()||value.length>LIMITS.threadLength||/[\u0000-\u001f\u007f]/.test(value))fail('THREAD','Thread identities must be nonempty, trimmed text of at most 64 characters');
 return value;
}
export function validateModel(input){
 if(!input||!Array.isArray(input.needles)||!Array.isArray(input.jobs))fail('MODEL','Needles and jobs are required');
 if(input.jobs.length<2||input.jobs.length>8)fail('JOB_COUNT','Use 2–8 ordered jobs');
 if(!input.needles.length||input.needles.length>15)fail('NEEDLE_COUNT','Use 1–15 physical needle positions');
 const numbers=new Set(),threads=new Set();
 const needles=input.needles.map(n=>{if(!n||!Number.isInteger(n.number)||n.number<1||n.number>15||numbers.has(n.number))fail('NEEDLE_NUMBER','Physical needle numbers must be unique integers 1–15');numbers.add(n.number);const t=thread(n.thread,true);if(t!==null)threads.add(t);if(n.locked!==undefined&&typeof n.locked!=='boolean'||n.unavailable!==undefined&&typeof n.unavailable!=='boolean')fail('MODEL','Needle flags must be booleans');return{number:n.number,thread:t,locked:!!n.locked,unavailable:!!n.unavailable};}).sort((a,b)=>a.number-b.number);
 const usable=needles.filter(n=>!n.unavailable);
 if(!usable.length||usable.length>6)fail('NEEDLE_COUNT','Use 1–6 available physical needles');
 const jobs=input.jobs.map((j,i)=>{if(!j||!Array.isArray(j.threads)||!j.threads.length)fail('THREAD','Each job must declare at least one thread');const ts=[...new Set(j.threads.map(t=>thread(t)))].sort();ts.forEach(t=>threads.add(t));return{...j,name:typeof j.name==='string'?j.name:`Job ${i+1}`,threads:ts};});
 if(threads.size>10)fail('THREAD_COUNT','At most 10 distinct thread identities across loads and jobs');
 return{needles,jobs};
}
export function prepareModel(input){
 if(!input||!Array.isArray(input.jobs))fail('MODEL','Jobs are required');
 if(input.jobs.length<2||input.jobs.length>8)fail('JOB_COUNT','Use 2–8 ordered jobs');
 const rawBytes=input.jobs.reduce((sum,j)=>sum+(j?.bytes instanceof Uint8Array?j.bytes.length:0),0);
 if(rawBytes>LIMITS.totalBytes)fail('TOTAL_SIZE','Total input must be at most 4 MiB');
 const rawRecords=input.jobs.reduce((sum,j)=>sum+(j?.bytes instanceof Uint8Array?Math.max(0,(j.bytes.length-256)/3):0),0);
 if(rawRecords>LIMITS.recordsTotal)fail('RECORD_COUNT','At most 500,000 native records across the batch');
 let total=0,needleCommands=0;
 const jobs=input.jobs.map(j=>{
  if(!j||typeof j.name!=='string'||! /\.u01$/i.test(j.name)||j.name.length>255||/[\u0000-\u001f\u007f]/.test(j.name))fail('FILE_TYPE','Each source must have a .u01 filename of at most 255 characters without control characters');
  const parsed=parseU01(j.bytes);total+=j.bytes.length;needleCommands+=parsed.needleCount;
  if(needleCommands>LIMITS.needleCommandsTotal)fail('NEEDLE_COMMAND_COUNT','At most 30,000 needle-selection commands across the batch');
  if(!j.mapping||typeof j.mapping!=='object'||Array.isArray(j.mapping))fail('MAPPING','Every source needle needs one stable thread identity');
  const keys=Object.keys(j.mapping),expected=parsed.sourceNeedles.map(String);
  if(keys.length!==expected.length||keys.some(k=>!expected.includes(k)))fail('MAPPING','Mapping must exactly cover the source needles; extra or missing entries are rejected');
  const mapping=Object.create(null);
  for(const n of parsed.sourceNeedles)mapping[n]=thread(j.mapping[n]);
  return{...j,parsed,mapping,threads:[...new Set(Object.values(mapping))]};
 });
 if(total>LIMITS.totalBytes)fail('TOTAL_SIZE','Total input must be at most 4 MiB');
 return validateModel({...input,jobs});
}
function combinations(n,k,visit,prefix=[],start=0){if(k===0){visit(prefix);return;}for(let i=start;i<=n-k;i++)combinations(n,k-1,visit,[...prefix,i],i+1);}
function successors(loads,required,needles){
 const usable=needles.map((n,i)=>n.unavailable?-1:i).filter(i=>i>=0);
 const present=new Set(usable.map(i=>loads[i]));
 const missing=required.filter(t=>!present.has(t));
 if(!missing.length)return[{loads:[...loads],changes:[]}];
 const editable=needles.map((n,i)=>n.locked||n.unavailable?-1:i).filter(i=>i>=0),next=[];
 if(missing.length>editable.length)return next;
 combinations(editable.length,missing.length,combo=>{
  const victim=combo.map(i=>editable[i]),v=new Set(victim),kept=new Set(usable.filter(i=>!v.has(i)).map(i=>loads[i]));
  if(required.some(t=>!missing.includes(t)&&!kept.has(t)))return;
  const out=[...loads],changes=[];
  victim.forEach((slot,i)=>{out[slot]=missing[i];changes.push({number:needles[slot].number,from:loads[slot],to:missing[i]});});
  next.push({loads:out,changes});
 });
 return next;
}
function occupancyKey(loads,needles){return JSON.stringify(loads.filter((_,i)=>!needles[i].locked&&!needles[i].unavailable).map(x=>x===null?['0']:['1',x]).sort((a,b)=>{const x=JSON.stringify(a),y=JSON.stringify(b);return x<y?-1:x>y?1:0;}));}
function step(job,loads,changes,needles){
 const threadToNeedle=Object.create(null);
 for(let i=0;i<needles.length;i++)if(!needles[i].unavailable&&loads[i]!==null&&!Object.hasOwn(threadToNeedle,loads[i]))threadToNeedle[loads[i]]=needles[i].number;
 const needleSequence=job.parsed?job.parsed.records.filter(r=>r.needle!==null).map(r=>threadToNeedle[job.mapping[r.needle]]):[];
 return{name:job.name,loads:needles.map((n,i)=>({number:n.number,thread:loads[i],locked:n.locked,unavailable:n.unavailable})),changes,threadToNeedle,needleSequence};
}
export function optimize(input){
 const model=validateModel(input),{needles,jobs}=model,initial=needles.map(n=>n.thread);
 let states=new Map([[occupancyKey(initial,needles),{cost:0,loads:initial,path:[]}]]),transitions=0,visited=1;
 for(const job of jobs){
  const next=new Map();
  for(const state of states.values())for(const candidate of successors(state.loads,job.threads,needles)){
   transitions++;const cost=state.cost+candidate.changes.length,key=occupancyKey(candidate.loads,needles),old=next.get(key);
   if(!old||cost<old.cost)next.set(key,{cost,loads:candidate.loads,path:[...state.path,{loads:candidate.loads,changes:candidate.changes}]});
  }
  states=next;visited+=next.size;
  if(!states.size)return{status:'infeasible',minimumChanges:null,greedyChanges:null,steps:[],reason:`No fixed load can cover ${job.name}`,stats:{states:visited,transitions}};
 }
 const best=[...states.values()].reduce((a,b)=>b.cost<a.cost?b:a);
 let greedyLoads=initial,greedyChanges=0;
 for(const job of jobs){const c=successors(greedyLoads,job.threads,needles)[0];if(!c){greedyChanges=null;break;}greedyLoads=c.loads;greedyChanges+=c.changes.length;}
 const result={status:'optimal',minimumChanges:best.cost,greedyChanges,steps:best.path.map((entry,i)=>step(jobs[i],entry.loads,entry.changes,needles)),stats:{states:visited,transitions},model:{jobOrder:'fixed',replacementCost:1,midJobChanges:false,initialPreparationCounted:true}};planOrigins.set(result,origin(model));return result;
}
export function patchU01(bytes,mapping,threadToNeedle){
 const parsed=parseU01(bytes),output=new Uint8Array(bytes);
 if(!mapping||Object.keys(mapping).length!==parsed.sourceNeedles.length||parsed.sourceNeedles.some(n=>!Object.hasOwn(mapping,n)))fail('MAPPING','Mapping must exactly cover source needles');
 const changes=[],commands=[];
 for(const r of parsed.records)if(r.needle!==null){
  const identity=thread(mapping[r.needle]),target=threadToNeedle?.[identity];
  if(!Number.isInteger(target)||target<1||target>15)fail('MAPPING','Every thread must be assigned to a valid physical needle');
  output[r.offset]=(bytes[r.offset]&0xe0)|(target+8);
  const entry={record:r.index,offset:r.offset,sourceNeedle:r.needle,thread:identity,outputNeedle:target,originalControl:bytes[r.offset],outputControl:output[r.offset],dx:r.dx,dy:r.dy,x:r.x,y:r.y};commands.push(entry);if(bytes[r.offset]!==output[r.offset])changes.push(entry);
 }
 return{bytes:output,changes,commands};
}
