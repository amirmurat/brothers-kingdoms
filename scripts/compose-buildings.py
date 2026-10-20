"""Compose licensed Kenney Tiny Town tiles; keep map and catalogue artwork identical."""
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
def tile(n):
    return Image.open(ROOT / f'assets/tiny-town/tile_{n:04}.png').convert('RGBA')
def put(out,n,x,y,size=16):
    im=tile(n).resize((size,size),Image.Resampling.NEAREST)
    out.alpha_composite(im,(x,y))
def house(out,roof,front,x,y,scale=1):
    ids=roof+front
    for i,n in enumerate(ids): put(out,n,x+(i%3)*16*scale,y+(i//3)*16*scale,16*scale)
blue=[48,49,50,60,61,62]; red=[52,53,54,64,65,66]
wood=[72,74,75]; stone=[76,78,79]
for kind in ['farm','lumber','quarry','mine','barracks','fort','city','capital']:
    out=Image.new('RGBA',(64,64))
    if kind=='farm':
        house(out,red,wood,0,0);put(out,94,42,36,22);put(out,94,40,18,18)
    elif kind=='lumber':
        house(out,blue,wood,0,0);put(out,106,39,30,24);put(out,106,22,45,19)
    elif kind=='quarry':
        put(out,105,2,30,32);put(out,105,26,23,32);put(out,115,37,40,24)
    elif kind=='mine':
        put(out,92,4,11,48);put(out,57,33,33,28)
    elif kind=='barracks':
        house(out,red,stone,8,5);put(out,83,43,38,20)
    elif kind=='fort':
        house(out,[96,97,98,108,109,110],[120,121,122],8,4)
    elif kind=='city':
        house(out,blue,stone,0,0);house(out,red,wood,16,16)
    else:
        house(out,[96,97,98,108,109,110],[120,121,122],0,0)
        house(out,red,stone,16,16)
    # Trim transparent margins once, preserving whole roofs and base.
    out=out.crop(out.getbbox())
    out.save(ROOT/f'assets/buildings/{kind}.png')
