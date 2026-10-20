"""Compose licensed Kenney Tiny Town tiles; keep map and catalogue artwork identical."""
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
def tile(n):
    return Image.open(ROOT / f'assets/tiny-town/tile_{n:04}.png').convert('RGBA')
def put(out,n,x,y,size=16):
    im=tile(n).resize((size,size),Image.Resampling.NEAREST)
    out.alpha_composite(im,(x,y))
def smallhouse(out,roof,front,x,y,size=30):
    part=Image.new("RGBA",(48,48));house(part,roof,front,0,0)
    out.alpha_composite(part.resize((size,size),Image.Resampling.NEAREST),(x,y))
def house(out,roof,front,x,y,scale=1):
    ids=roof+front
    for i,n in enumerate(ids): put(out,n,x+(i%3)*16*scale,y+(i//3)*16*scale,16*scale)
blue=[48,49,50,60,61,62]; red=[52,53,54,64,65,66]
wood=[72,74,75]; stone=[76,78,79]
for kind in ['farm','lumber','quarry','mine','barracks','fort','city','capital']:
    out=Image.new('RGBA',(64,64))
    if kind=='farm':
        smallhouse(out,red,wood,1,5,30)
        for x,y in [(34,19),(24,38),(44,39)]: put(out,94,x,y,20)
    elif kind=='lumber':
        put(out,107,1,3,30)
        for x,y in [(27,20),(0,34),(30,34)]: put(out,106,x,y,30)
    elif kind=='quarry':
        put(out,105,2,30,32);put(out,105,26,23,32);put(out,115,37,40,24)
    elif kind=='mine':
        put(out,92,4,11,48);put(out,57,33,33,28)
    elif kind=='barracks':
        for row,ids in enumerate([[52,53,53,54],[64,65,65,66],[76,78,78,79]]):
            for col,n in enumerate(ids):put(out,n,col*16,10+row*16)
    elif kind=='fort':
        house(out,[96,97,98,108,109,110],[120,121,122],8,4)
    elif kind=='city':
        smallhouse(out,blue,stone,0,4,34);smallhouse(out,red,wood,28,12,34);smallhouse(out,blue,wood,14,32,30)
    else:
        house(out,[96,97,98,108,109,110],[120,121,122],0,16)
        smallhouse(out,red,stone,18,0,30)
    # Trim transparent margins once, preserving whole roofs and base.
    out=out.crop(out.getbbox())
    out.save(ROOT/f'assets/buildings/{kind}.png')
