"""Independent raw-byte oracle and real pystitch consumer for actual exported ZIP."""
import sys, json, zipfile, hashlib, io, importlib.metadata
from pathlib import Path
import pystitch as ps
ROOT=Path(__file__).resolve().parents[1]
archive=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'artifacts/demo-batch.zip'
assert importlib.metadata.version('pystitch')=='1.0.1'

def decode_raw(blob):
    assert len(blob)>=262 and (len(blob)-256)%3==0
    x=y=0;records=[];selected=None
    for off in range(256,len(blob),3):
        ctrl,y_mag,x_mag=blob[off:off+3];c=ctrl&31
        assert c<=24
        dx=(-1 if ctrl&32 else 1)*x_mag;dy=(1 if ctrl&64 else -1)*y_mag
        if c==24:assert off==len(blob)-3 and dx==dy==0
        else:x+=dx;y+=dy
        n=c-8 if 9<=c<=23 else None
        records.append((off,c,n,x,y,dx,dy))
    assert records[-1][1]==24
    return records

def consumer(blob):
    pattern=ps.read_u01(io.BytesIO(blob))
    return [(x,y,ps.decode_embroidery_command(c)) for x,y,c in pattern.stitches]

reports=[]
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    manifest=json.loads(z.read('manifest.json'))
    assert len(z.namelist())==len(manifest['jobs'])+2
    assert manifest['minimumChanges']==2 and manifest['greedyChanges']==3
    for job in manifest['jobs']:
        source=(ROOT/'fixtures'/job['sourceName']).read_bytes();target=z.read(job['outputName'])
        assert len(source)==len(target)==job['byteLength']
        assert hashlib.sha256(source).hexdigest()==job['sourceSha256']
        assert hashlib.sha256(target).hexdigest()==job['outputSha256']
        original_records=decode_raw(source);new_records=decode_raw(target)
        expected_offsets={r[0] for r in original_records if r[2] is not None}
        actual_offsets=[i for i in range(len(source)) if source[i]!=target[i]]
        assert all(i in expected_offsets for i in actual_offsets)
        assert actual_offsets==job['changedControlByteOffsets']
        assert source[:256]==target[:256]
        output_threads={n['number']:n['thread'] for n in job['loads'] if not n['unavailable']}
        for old,new in zip(original_records,new_records):
            assert old[3:]==new[3:]
            if old[2] is None:assert old==new
            else:
                assert source[old[0]]&224==target[new[0]]&224
                assert output_threads[new[2]]==job['mapping'][str(old[2])]
                assert source[old[0]+1:old[0]+3]==target[new[0]+1:new[0]+3]
        before=consumer(source);after=consumer(target)
        assert len(before)==len(after)
        old_needles=[];new_needles=[]
        for old,new in zip(before,after):
            assert old[:2]==new[:2] and old[2][0]==new[2][0]
            if old[2][0]==ps.NEEDLE_SET:
                old_needles.append(old[2][2]);new_needles.append(new[2][2])
                assert output_threads[new[2][2]]==job['mapping'][str(old[2][2])]
            else:assert old==new
        assert new_needles==job['needleSequence']
        stops=[list(s[:2]) for s in after if s[2][0]==ps.STOP]
        assert len(stops)==job['stopCount']
        reports.append({'file':job['outputName'],'bytes':len(target),'changedByteOffsets':actual_offsets,'sourceNeedles':old_needles,'outputNeedles':new_needles,'stopCoordinates':stops,'allCoordinatesAndNonNeedleCommandsPreserved':True})
result={'result':'PASS','archive':archive.name,'archiveSha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'consumer':'pystitch==1.0.1','wheelSha256':'06ca3502111e2e782b9d4c4f18a2aa1c5e60588436d7697f2481bfe171f12c1b','files':reports,'scope':'Actual exported ZIP, independent raw-byte checks and independent installed reader. No physical machine test.'}
(ROOT/'artifacts'/'consumer-export.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
