import {prepareModel,optimize,patchU01,InputError,isPlanCurrent} from './core.mjs';
const textEncoder=new TextEncoder();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function sha256(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
const table=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export function crc32(bytes){let crc=0xffffffff;for(const byte of bytes)crc=table[(crc^byte)&255]^(crc>>>8);return(crc^0xffffffff)>>>0;}
function concatenate(parts){const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;for(const p of parts){out.set(p,offset);offset+=p.length;}return out;}
export function createZip(files){
 const locals=[],centrals=[];let offset=0;
 for(const file of files){
  if(file.name==='.'||file.name==='..'||!/^[a-zA-Z0-9_.-]+$/.test(file.name))throw new Error('Unsafe ZIP path');
  const name=textEncoder.encode(file.name),bytes=file.bytes,crc=crc32(bytes),local=new Uint8Array(30+name.length),v=new DataView(local.buffer);
  v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(10,0,true);v.setUint16(12,33,true);v.setUint32(14,crc,true);v.setUint32(18,bytes.length,true);v.setUint32(22,bytes.length,true);v.setUint16(26,name.length,true);local.set(name,30);locals.push(local,bytes);
  const central=new Uint8Array(46+name.length),c=new DataView(central.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(14,33,true);c.setUint32(16,crc,true);c.setUint32(20,bytes.length,true);c.setUint32(24,bytes.length,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);central.set(name,46);centrals.push(central);offset+=local.length+bytes.length;
 }
 const size=centrals.reduce((n,p)=>n+p.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,size,true);v.setUint32(16,offset,true);return concatenate([...locals,...centrals,end]);
}
export async function exportBundle(input,result){
 const model=prepareModel(input);
 // Freeze every source byte before the first asynchronous hash. Caller mutations
 // during export cannot change later files or detach hashes from patched bytes.
 model.jobs=model.jobs.map(job=>({...job,bytes:new Uint8Array(job.bytes)}));
 const fresh=optimize(model);
 if(fresh.status!=='optimal')throw new InputError('INFEASIBLE','No export for an infeasible plan');
 if(!result||!isPlanCurrent(model,result)||JSON.stringify(result)!==JSON.stringify(fresh))throw new InputError('STALE','Inputs changed; calculate a fresh plan before export');
 const files=[],jobs=[];
 for(let i=0;i<model.jobs.length;i++){
  const job=model.jobs[i],step=fresh.steps[i],patched=patchU01(job.bytes,job.mapping,step.threadToNeedle);
  const base=String(job.name).replace(/\.[^.]*$/,'').replace(/[^A-Za-z0-9_-]/g,'_').slice(0,64)||'design';const outputName=`${String(i+1).padStart(2,'0')}-${base}-retargeted.u01`;
  files.push({name:outputName,bytes:patched.bytes});
  const commands=patched.commands.map((command,k)=>({...command,throughRecordExclusive:patched.commands[k+1]?.record??job.parsed.records.length-1}));
  jobs.push({order:i+1,sourceName:job.name,outputName,sourceSha256:await sha256(job.bytes),outputSha256:await sha256(patched.bytes),byteLength:job.bytes.length,recordCount:job.parsed.records.length,stitchCount:job.parsed.stitchCount,stopCount:job.parsed.stopCount,mapping:job.mapping,loads:step.loads,changes:step.changes,needleSequence:step.needleSequence,needleCommands:commands,changedControlByteOffsets:patched.changes.map(c=>c.offset)});
 }
 const manifest={format:'NeedleBatch-1',profile:'U01-256-explicit-needle-no-trailer',minimumChanges:fresh.minimumChanges,greedyChanges:fresh.greedyChanges,model:fresh.model,initialNeedles:model.needles,jobs,verification:{patch:'Only low five bits of original NEEDLE_SET control bytes are eligible to change. All other bytes are identical.',threadIdentity:'Operator-declared, stable per source needle throughout each design. No inferred palette.',limitations:'A software plan and file-interpretation check, not physical sewout validation or a safety/elapsed-time guarantee. Verify your machine, thread, material and setup before operation.'}};
 const html=`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>NeedleBatch · loading checklist</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{overflow-wrap:anywhere;font:16px/1.65 "Noto Sans CJK JP","Noto Sans JP",system-ui,sans-serif;max-width:850px;margin:40px auto;padding:0 20px;color:#152426}h1{font-size:32px}h2{margin-top:2em}table{table-layout:fixed;border-collapse:collapse;width:100%;margin:12px 0}td,th{border:1px solid #bbb;padding:8px;text-align:left}.note{background:#f3f4eb;padding:16px}code{overflow-wrap:anywhere}.job{break-inside:avoid}@media print{body{margin:0}button{display:none}}</style><h1>NeedleBatch</h1><p>糸交換チェックリスト / Fixed-order loading checklist</p><p>交換回数 / Minimum replacements: <strong>${fresh.minimumChanges}</strong> · lowest-slot greedy: ${fresh.greedyChanges}</p><div class="note">作業順は固定。交換は各ジョブの開始前のみ。開始前の準備も1回と数えます。実機での安全性・縫製結果・作業時間を保証しません。<br>Keep the listed job order. Changes occur only before a job. Initial preparation is counted. Confirm the source mapping, physical machine, thread and material before sewing. No physical sewout, safety or elapsed-time guarantee.</div>${jobs.map(job=>`<section class="job"><h2>${job.order}. ${esc(job.sourceName)}</h2><p>出力 / Output: <code>${esc(job.outputName)}</code></p><p>${job.changes.length?'開始前の交換 / Changes before starting:':'交換なし / No changes before starting'}</p><ul>${job.changes.map(c=>`<li>□ N${c.number}: ${esc(c.from??'空 / empty')} → <strong>${esc(c.to)}</strong></li>`).join('')}</ul><table><caption>全針の状態 / Needle loads</caption><thead><tr><th>針 / Needle</th><th>糸 / Thread identity</th><th>制約 / Constraint</th></tr></thead><tbody>${job.loads.map(n=>`<tr><td>N${n.number}</td><td>${esc(n.thread??'空 / empty')}</td><td>${n.unavailable?'使用不可 / unavailable':n.locked?'固定 / locked':'変更可 / editable'}</td></tr>`).join('')}</tbody></table><p>選針順 / Needle sequence: ${job.needleSequence.slice(0,120).map(n=>'N'+n).join(' → ')}${job.needleSequence.length>120?' … (先頭 120 回 / first 120; full sequence in manifest.json)':''}<br>元の停止命令を保持 / Original STOPs retained: ${job.stopCount}</p><p>□ 入力の糸対応・全針の装着を確認 / Confirm mappings and every physical load</p></section>`).join('')}<hr><p>ファイルのSHA-256、命令オフセット、対応関係は manifest.json を参照 / See manifest.json for SHA-256 hashes and every needle-command mapping.</p></html>`;
 files.push({name:'manifest.json',bytes:textEncoder.encode(JSON.stringify(manifest,null,2)+'\n')},{name:'loading-checklist.html',bytes:textEncoder.encode(html)});
 return{bytes:createZip(files),manifest,html,files};
}
