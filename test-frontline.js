const E=require('./engine.js');
const assert=require('node:assert/strict');
function check(seed){
 const s=E.lobby(seed),id=E.addPlayer(s,'Test');E.start(s,1);
 const p=E.person(s,id),first=p.land,cap=p.capital;
 let target=null,closest=Infinity;
 const seenPath=new Set([E.idx(cap.x,cap.y)]),bfs=[E.idx(cap.x,cap.y)];
 for(let q=0;q<bfs.length;q++){let i=bfs[q],x=i%E.W,y=Math.floor(i/E.W);for(let [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){let px=x+dx,py=y+dy;if(!E.inside(px,py))continue;let z=E.idx(px,py);if(!seenPath.has(z)&&E.tile(s,px,py)!==0){seenPath.add(z);bfs.push(z);}}}
 for(const i of bfs){let x=i%E.W,y=Math.floor(i/E.W);if(E.owner(s,x,y)!==0)continue;const d=Math.hypot(cap.x-x,cap.y-y);if(d<closest&&d>8){closest=d;target={x,y};}}
 assert(target);
 const a=E.action(s,id,{type:'send',...target,percent:85});assert(a.ok,a.error);
 // Verify after each tick that all land is connected to capital (no isolated slivers)
 for(let t=0;t<25;t++){
  E.tick(s); const claimed=[];
  for(let i=0;i<s.owners.length;i++)if(s.owners[i]===id)claimed.push(i);
  const seen=new Set([E.idx(cap.x,cap.y)]),stack=[E.idx(cap.x,cap.y)];
  while(stack.length){const i=stack.pop(),x=i%E.W,y=Math.floor(i/E.W);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(!E.inside(nx,ny))continue;const z=E.idx(nx,ny);if(s.owners[z]===id&&!seen.has(z)){seen.add(z);stack.push(z)}}}
  assert.equal(seen.size,claimed.length,`disconnected territory tick ${t}`);
 }
 assert(p.land>=first+25,`too little expansion ${p.land-first}`);
 const remaining=p.troops;
 assert(remaining>0);
 return {seed,initial:first,land:p.land,gain:p.land-first,army:remaining,waves:s.armies.length};
}
for(const seed of [1,45,782,42043,299999])console.log(check(seed));
