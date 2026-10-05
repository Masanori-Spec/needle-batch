"""Author original abstract line fixtures. No imported artwork or thread palette."""
from pathlib import Path
import struct, json
ROOT=Path(__file__).resolve().parents[1]

def record(command,dx=0,dy=0,flag=0x80):
    assert 0<=command<=0x18 and abs(dx)<=255 and abs(dy)<=255
    return bytes([flag|(0x20 if dx<0 else 0)|(0x40 if dy>=0 else 0)|command,abs(dy),abs(dx)])

def build(name,commands):
    x=y=0; points=[(0,0)]; body=b''
    for cmd,dx,dy in commands:
        body+=record(cmd,dx,dy); x+=dx;y+=dy;points.append((x,y))
    header=bytearray(b'0'*128+b'\0'*128)
    struct.pack_into('<hhhh',header,128,min(p[0] for p in points),-max(p[1] for p in points),max(p[0] for p in points),-min(p[1] for p in points))
    struct.pack_into('<I',header,140,len(commands)+1)
    struct.pack_into('<hh',header,144,x,-y)
    (ROOT/'fixtures'/name).write_bytes(header+body+record(0x18))

build('01-c.u01',[(9,3,-2),(0,14,0),(2,0,12),(0,-14,0),(8,-3,2),(1,2,-3),(4,12,0),(0,0,8),(6,0,0)])
build('02-a.u01',[(10,-2,3),(0,12,-12),(0,12,12),(8,3,-2),(1,-18,-4),(0,12,0),(7,0,0)])
build('03-bcbc.u01',[(11,3,2),(0,12,0),(0,0,8),(12,-2,-1),(0,-12,0),(0,0,-8),(8,-3,2),(11,1,-2),(3,6,1),(0,8,8),(12,-1,1),(5,-7,0),(0,-8,-8)])
config={"needles":[{"number":1,"thread":"A","locked":False,"unavailable":False},{"number":2,"thread":"B","locked":False,"unavailable":False},{"number":3,"thread":"L","locked":True,"unavailable":False}],"jobs":[{"name":"01-c.u01","mapping":{"1":"C"}},{"name":"02-a.u01","mapping":{"2":"A"}},{"name":"03-bcbc.u01","mapping":{"3":"B","4":"C"}}]}
(ROOT/'fixtures'/'demo.json').write_text(json.dumps(config,indent=2)+'\n')
print('Authored three original U01 fixtures')
