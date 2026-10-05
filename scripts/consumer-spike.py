"""Run against the independently installed, exactly pinned pystitch 1.0.1."""
from pathlib import Path
import json, hashlib, importlib.metadata
import pystitch as p
ROOT=Path(__file__).resolve().parents[1]
assert importlib.metadata.version('pystitch')=='1.0.1'
expected={'01-c.u01':{1:2},'02-a.u01':{2:1},'03-bcbc.u01':{3:1,4:2}}
reports=[]
for filename,mapping in expected.items():
    original=(ROOT/'fixtures'/filename).read_bytes();patched=bytearray(original)
    for offset in range(256,len(original),3):
        command=original[offset]&31
        if 9<=command<=23: patched[offset]=(original[offset]&224)|(8+mapping[command-8])
    target=ROOT/'artifacts'/('spike-'+filename);target.write_bytes(patched)
    before=p.read(str(ROOT/'fixtures'/filename));after=p.read(str(target))
    b=[(x,y,p.decode_embroidery_command(c)) for x,y,c in before.stitches]
    a=[(x,y,p.decode_embroidery_command(c)) for x,y,c in after.stitches]
    assert len(a)==len(b)
    for old,new in zip(b,a):
        assert old[:2]==new[:2]
        assert old[2][0]==new[2][0]
        if old[2][0]==p.NEEDLE_SET:assert new[2][2]==mapping[old[2][2]]
        else:assert old==new
    stop=[list(v[:2]) for v in a if v[2][0]==p.STOP]
    needle=[v[2][2] for v in a if v[2][0]==p.NEEDLE_SET]
    assert len(stop)==1
    assert original[:256]==patched[:256]
    reports.append({'file':filename,'sourceSha256':hashlib.sha256(original).hexdigest(),'outputSha256':hashlib.sha256(patched).hexdigest(),'decodedCommands':len(a),'needleSequence':needle,'stopCoordinates':stop,'allCoordinatesAndNonNeedleSemanticsEqual':True})
report={'consumer':'pystitch==1.0.1','wheelSha256':'06ca3502111e2e782b9d4c4f18a2aa1c5e60588436d7697f2481bfe171f12c1b','result':'PASS','files':reports}
(ROOT/'artifacts'/'consumer-spike.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
