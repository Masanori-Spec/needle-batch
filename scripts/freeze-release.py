"""Allowlisted deterministic archives; no wheels, browser binaries or node_modules."""
from pathlib import Path
import hashlib, json, zipfile, shutil
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT.parent/'needle-batch-output';OUT.mkdir(exist_ok=True)
allowed_files=['README.md','THIRD_PARTY_NOTICES.md','package.json','package-lock.json','requirements-test.txt','.gitignore']
allowed_dirs=['src','web','fixtures','tests','scripts','docs','oracle','.github']
paths=[ROOT/p for p in allowed_files]
for d in allowed_dirs:
    paths += [p for p in (ROOT/d).rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix!='.pyc']
# Explicit reviewed summaries only; raw logs, traces and downloaded binaries stay private.
for name in ['boundary-export.json','bounds-benchmark.json','code-review.json','consumer-export.json','consumer-edges.json','consumer-spike.json','demo-plan.json','recovery-review.json']:
    paths.append(ROOT/'artifacts'/name)
paths=sorted(set(paths))
assert all(p.is_file() and not p.is_symlink() for p in paths), 'Release inputs must be regular files'
assert not (ROOT/'LICENSE').exists(), 'Original-code licensing requires a separate owner decision'
assert 'license' not in json.loads((ROOT/'package.json').read_text())
assert 'license' not in json.loads((ROOT/'package-lock.json').read_text())['packages']['']
entries=[{'path':str(p.relative_to(ROOT)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in paths]
source_manifest={'name':'NeedleBatch','version':'1.0.0','files':entries,'excluded':['node_modules','downloaded test consumer wheels','downloaded browsers','Python caches','raw logs and traces','original-code license grant','third-party artwork/palettes/fonts']}
(ROOT/'SOURCE-MANIFEST.json').write_text(json.dumps(source_manifest,indent=2)+'\n')
paths.append(ROOT/'SOURCE-MANIFEST.json')
def archive(target,items,base):
    with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for p in sorted(items):
            info=zipfile.ZipInfo(str(p.relative_to(base)),date_time=(2026,10,5,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16;z.writestr(info,p.read_bytes())
archive(OUT/'needle-batch-source.zip',paths,ROOT)
with zipfile.ZipFile(OUT/'needle-batch-source.zip') as z:
    assert z.testzip() is None
    assert len(z.namelist()) == len(set(z.namelist())) == len(entries) + 1
    assert set(z.namelist()) == {e['path'] for e in entries} | {'SOURCE-MANIFEST.json'}
    for entry in entries:
        blob=z.read(entry['path'])
        assert len(blob) == entry['bytes'] and hashlib.sha256(blob).hexdigest() == entry['sha256']
    assert not any(name.endswith(('.log','.whl','.pyc')) or any(part in {'node_modules','__pycache__','.venv','browser'} for part in Path(name).parts) for name in z.namelist())
archive(OUT/'needle-batch-web.zip',[p for p in (ROOT/'dist').rglob('*') if p.is_file()],ROOT/'dist')
shutil.copy2(ROOT/'artifacts/demo-batch.zip',OUT/'needle-batch-demo.zip')
for source,target in [('artifacts/consumer-export.json','consumer-export.json'),('oracle/verification.json','oracle-verification.json'),('SOURCE-MANIFEST.json','source-manifest.json')]:shutil.copy2(ROOT/source,OUT/target)
release={'name':'NeedleBatch','version':'1.0.0','minimumDemoChanges':2,'greedyDemoChanges':3,'sourceFiles':len(paths),'runtimeDependencies':0,'localBrowser':'Blocked by container socket permission; hosted results in docs/VERIFICATION.md','files':[{'name':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(OUT.iterdir()) if p.is_file() and p.name!='release-manifest.json']}
(OUT/'release-manifest.json').write_text(json.dumps(release,indent=2)+'\n');print(json.dumps(release,indent=2))
