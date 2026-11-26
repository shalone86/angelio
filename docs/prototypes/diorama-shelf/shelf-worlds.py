from pathlib import Path
import json

def scene(build):
    blocks=[]
    def block(x,y,z,w,h,d,color):
        blocks.append((x,y,z,w,h,d,color))
    def tree(x,z):
        block(x,0,z,4,19,4,'956a48')
        block(x-5,15,z-5,14,10,14,'548050')
        block(x-3,25,z-3,10,5,10,'69945b')
        block(x+5,18,z+9,3,3,2,'bb5742')
    def house(x,z,w=18,h=17):
        block(x,0,z,w,h,15,'d9bd91')
        for step in range(3):
            block(x-2+step*3,h+step*3,z-2,w+4-step*6,3,19,'a55846')
        block(x+3,0,z+15,5,8,1,'745848')
        block(x+w-7,8,z+15,4,5,1,'759dad')
    build(block,tree,house)
    def point(x,y,z):
        return f'{180+2.2*x-0.94*z:.1f},{105-2.1*y+1.48*z:.1f}'
    def shade(color,factor):
        return '#'+''.join(f'{min(255,round(int(color[i:i+2],16)*factor)):02x}' for i in (0,2,4))
    out=[]
    for x,y,z,w,h,d,c in sorted(blocks,key=lambda b:b[2]+b[5]/2+b[0]*.43+b[3]*.215):
        a,b,t=x+w,y+h,z+d
        faces=[
            ([(a,y,z),(a,y,t),(a,b,t),(a,b,z)],.67),
            ([(x,y,t),(a,y,t),(a,b,t),(x,b,t)],.86),
            ([(x,b,z),(x,b,t),(a,b,t),(a,b,z)],1.12),
        ]
        for points,factor in faces:
            out.append(f'<polygon fill="{shade(c,factor)}" points="{" ".join(point(*p) for p in points)}"/>')
    return ''.join(out)

def orchard(b,t,h):
    b(-81,-5,-13,157,5,37,'8eaa67')
    for x,z in [(-64,-6),(-38,-15),(33,-14),(53,-6)]:
        t(x,z)
    for x in [-72,-49,-26,25,48]:
        b(x,0,19,3,11,3,'bc9866')
        b(x,5,19,20,2,2,'bc9866')

def chapel(b,t,h):
    b(-78,-5,-16,150,5,38,'aaa18a')
    h(-28,-12,49,23)
    b(10,0,-4,14,39,15,'d5bda0')
    b(8,39,-6,18,3,19,'985747')
    b(11,42,-3,12,4,13,'985747')
    b(15,46,1,3,9,3,'8d6549')
    b(12,51,1,9,3,3,'8d6549')
    b(-13,11,4,6,10,2,'6992af')
    b(-11,11,6,2,10,1,'ddae60')
    t(-54,-9)
    t(49,-3)

def gate(b,t,h):
    b(-79,-5,-12,150,5,38,'929879')
    for x in [-69,-52,-35,23,39,55]:
        b(x,0,-10,16,10,9,'9c968a')
        b(x,10,-11,15,3,11,'b7ad9b')
    for x in [-20,11]:
        b(x,0,-9,10,24,14,'a79e8c')
        b(x-1,24,-10,12,4,16,'b9af9c')
    b(-16,20,-8,33,8,12,'b0a48e')
    b(-12,16,-8,6,5,12,'a29786')
    b(7,16,-8,6,5,12,'a29786')
    b(-5,0,-2,13,2,23,'bcb19c')
    t(-62,-20)
    t(52,-17)

def ridge(b,t,h):
    b(-79,-7,-22,155,7,45,'7d9b71')
    b(-67,0,-20,48,7,20,'8aa47c')
    b(25,0,-22,48,9,19,'8aa47c')
    h(-57,-21);h(-34,-17,15,13);h(30,-20);h(52,-15,15,13)
    for x,z in [(-9,-6),(-4,1),(0,8),(4,15)]:
        b(x,0,z,8,1,8,'cfba91')
    t(-72,-5)
    t(62,-3)

p=Path(__file__).with_name('index.html')
s=p.read_text()
a=s.index('const worlds =');b=s.index('const spots =',a)
s=s[:a]+'const worlds = '+json.dumps({f.__name__:scene(f) for f in [orchard,chapel,gate,ridge]})+';\n'+s[b:]
p.write_text(s)
