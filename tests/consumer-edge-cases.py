"""Consumer challenge: every 1..15 needle number with every high control-bit pattern."""
import io, json, importlib.metadata
from pathlib import Path
import pystitch as p
assert importlib.metadata.version('pystitch')=='1.0.1'
count=0
for source in range(1,16):
    for target in range(1,16):
        for high in range(8):
            before=bytearray(b'0'*128+b'\0'*128+bytes([(high<<5)|(source+8),3,2,0x80,4,5,0xa8,6,7,0xf8,0,0]))
            after=bytearray(before);after[256]=(before[256]&224)|(target+8)
            a=p.read_u01(io.BytesIO(before));b=p.read_u01(io.BytesIO(after))
            assert len(a.stitches)==len(b.stitches)
            for old,new in zip(a.stitches,b.stitches):
                assert old[:2]==new[:2]
                oc=p.decode_embroidery_command(old[2]);nc=p.decode_embroidery_command(new[2])
                assert oc[0]==nc[0]
                if oc[0]==p.NEEDLE_SET:assert oc[2]==source and nc[2]==target
                else:assert old==new
            count+=1
report={'consumer':'pystitch==1.0.1','cases':count,'result':'PASS','scope':'All 15×15 source/target needle numbers and 8 high-control-bit patterns, moving needle and STOP geometry unchanged'}
root=Path(__file__).resolve().parents[1];(root/'artifacts/consumer-edges.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
