'use strict';
const assert=require('node:assert/strict'),E=require('../engine.js');
function fixture(){const s=E.lobby(19),id=E.addPlayer(s,'A'),foe=E.addPlayer(s,'B');E.start(s,0);s.tiles.fill(1);s.owners.fill(0);s.buildings=[];s.armies=[];s.attackPlans=[];s.recoveryPlans=[];for(let y=20;y<60;y++)for(let x=20;x<70;x++)s.owners[E.idx(x,y)]=id;s.territoryRevision++;const p=E.person(s,id);p.land=2000;p.troops=10000;p.garrisons=[{id:'home',x:65,y:40,strength:10000}];p.capital={x:30,y:40};s.buildings=[{id:'base',owner:id,kind:'capital',x:30,y:40,level:1}];const plans=[25,50].map((y,n)=>({id:'p'+n,owner:id,targets:[0],zoneCells:[E.idx(70,y)],waves:0}));s.attackPlans=plans;return {s,id,foe,p,plans};}
{
 const {s,id,foe,p,plans:[a,b]}=fixture();const before=E.automaticAllocation(s,a).target;
 assert(E.action(s,id,{type:'planStrategy',id:a.id,focus:true}).ok);assert(E.automaticAllocation(s,a).target>before);
 assert(!E.action(s,foe,{type:'planStrategy',id:a.id,focus:true}).ok);
 assert(!E.action(s,id,{type:'planStrategy',id:a.id,mode:'percent',value:101}).ok);
 assert(!E.action(s,id,{type:'planStrategy',id:a.id,mode:'troops',value:NaN}).ok);
 for(const q of [a,b])assert(E.action(s,id,{type:'planStrategy',id:q.id,mode:'percent',value:100}).ok);
 const aa=E.planAllocation(s,a),bb=E.planAllocation(s,b);assert(aa+bb<=7500);
 assert(E.action(s,id,{type:'defendPriority',x:68,y:40}).ok);const positions=p.garrisons.map(g=>[g.x,g.y]);E.spatialArmyStep(s,false);
 assert(p.garrisons.some(g=>g.role==='Priority defense'&&g.tx===68&&g.ty===40),'Physical defense assignment exists');
 assert(p.garrisons.some(g=>g.role==='Reserve'),'Priority retains a real reserve');
 assert(p.garrisons.every(g=>positions.some(([x,y])=>x===g.x&&y===g.y)),'Assignment cannot teleport');
 assert(!E.action(s,id,{type:'defendPriority',x:80,y:40}).ok);
 E.tick(s);assert(E.militaryStrength(s,id).total<=10000+100,'Orders cannot manufacture an army');
 const sum=p.garrisons.reduce((n,g)=>n+g.strength,0);assert(Math.abs(sum-p.troops)<1e-6);
 const wire=E.restoreNetworkState(JSON.parse(JSON.stringify(E.networkState(s))));assert.deepEqual(wire.players[0].defendPriority,p.defendPriority);assert.equal(wire.attackPlans[0].allocationMode,'percent');assert(wire.attackPlans[0].focus);
 assert(E.action(s,id,{type:'defendPriority',clear:true}).ok);assert.equal(p.defendPriority,null);
}
{
 const {s,id,p}=fixture();const x=60,y=40;
 const base=E.tileDefense(s,id,x,y);
 s.armies=[{id:'local',owner:id,strength:1000,columns:[{x,y,strength:1000,tx:x,ty:y}]}];
 assert(E.tileDefense(s,id,x,y)>base+30,'Deployed physical troops defend their location');
 assert.equal(E.tileDefense(s,id,30,25),3,'Distant columns cannot defend remotely');
}
{
 const {s,id,p}=fixture();s.attackPlans=[];p.troops=0;p.garrisons=[];
 E.tick(s);const first=p.troopIncome;assert(first>0);assert.equal(p.recruitment.reason,'Recruiting');
 p.troops=100000;p.garrisons=[{id:'home',x:30,y:40,strength:100000}];E.tick(s);assert.equal(p.troopIncome,0);assert.equal(p.recruitment.reason,'Army capacity reached');
 // Upgrades and additional buildings add the same per-level benefit, but tier prices grow.
 for(const kind of ['barracks','city','fort']){const base=E.KINDS[kind].cost;for(const level of [1,2,3]){const price=E.costUpgrade({kind,level});for(const k in base)assert(price[k]>=base[k]);}assert(E.costUpgrade({kind,level:3}).wood>E.costUpgrade({kind,level:1}).wood);}
}
console.log('PASS strategic priorities: authority, focus, bounded shared budgets, physical defense/reserve, snapshots, local column defense and economy limits');
