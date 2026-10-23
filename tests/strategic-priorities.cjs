'use strict';
const assert=require('node:assert/strict'),E=require('../engine.js');
function fixture(){const s=E.lobby(19),id=E.addPlayer(s,'A'),foe=E.addPlayer(s,'B');E.start(s,0);s.tiles.fill(1);s.owners.fill(0);s.buildings=[];s.armies=[];s.attackPlans=[];s.recoveryPlans=[];for(let y=20;y<60;y++)for(let x=20;x<70;x++)s.owners[E.idx(x,y)]=id;s.territoryRevision++;const p=E.person(s,id);p.land=2000;p.troops=10000;p.garrisons=[{id:'home',x:65,y:40,strength:10000}];p.capital={x:30,y:40};s.buildings=[{id:'base',owner:id,kind:'city',x:30,y:40,level:1}];const plans=[25,50].map((y,n)=>({id:'p'+n,owner:id,targets:[0],zoneCells:[E.idx(70,y)],waves:0}));s.attackPlans=plans;return {s,id,foe,p,plans};}
{
 const {s,id,foe,p,plans:[a,b]}=fixture();const before=E.automaticAllocation(s,a).target;
 assert(E.action(s,id,{type:'armyFocus',x:70,y:25}).ok);assert(E.automaticAllocation(s,a).target>before);assert(E.action(s,id,{type:'planStrategy',id:a.id,focus:true}).ok);
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
 s.buildings.push({id:'recruiting-camp',owner:id,kind:'barracks',level:1,x:60,y:40});
 E.tick(s);const first=p.troopIncome;assert(first>0);assert.equal(p.recruitment.reason,'Recruiting');
 p.troops=100000;p.garrisons=[{id:'home',x:30,y:40,strength:100000}];E.tick(s);assert.equal(p.troopIncome,0);assert.equal(p.recruitment.reason,'Army capacity reached');
 // Upgrades and additional buildings add the same per-level benefit, but tier prices grow.
 for(const kind of ['barracks','city','fort']){const base=E.KINDS[kind].cost;for(const level of [1,2,3]){const price=E.costUpgrade({kind,level});for(const k in base)assert(price[k]>=base[k]);}assert(E.costUpgrade({kind,level:3}).wood>E.costUpgrade({kind,level:1}).wood);}
}
console.log('PASS strategic priorities: authority, focus, bounded shared budgets, physical defense/reserve, snapshots, local column defense and economy limits');
{
 const {s,id,p,plans:[a,b]}=fixture();
 for(const [q,value] of [[a,20],[b,80]])assert(E.action(s,id,{type:'planStrategy',id:q.id,mode:'percent',value}).ok);
 assert.equal(E.automaticAllocation(s,b).target/E.automaticAllocation(s,a).target,4,'Oversized explicit requests scale proportionally');
 const c={x:69,y:25,tx:69,ty:25,strength:2000,sector:'test',route:[]};
 s.armies=[{id:'wave',planId:a.id,owner:id,strength:2000,columns:[c]}];p.troops-=2000;p.garrisons[0].strength-=2000;
 const before=E.militaryStrength(s,id).total;assert(E.action(s,id,{type:'planStrategy',id:a.id,mode:'troops',value:0}).ok);
 assert.equal(E.militaryStrength(s,id).total,before,'Reduced budget conserves soldiers');
 assert.equal(s.armies[0].strength,0);assert(p.garrisons.some(g=>g.returning&&g.x===69&&g.y===25&&g.strength===2000),'Released soldiers return at their actual position');
 assert.equal(E.planAllocation(s,a),0,'Zero budget cannot relaunch an offensive');
}
{
 const {s,id,plans}=fixture();s.attackPlans=[{...plans[0],zoneCells:[E.idx(70,25),E.idx(71,25),E.idx(72,25)],allocationMode:'troops',allocationValue:1000,focus:true}];
 assert(E.action(s,id,{type:'erasePlanCells',cells:[E.idx(71,25)]}).ok);
 assert.equal(s.attackPlans.length,2);assert.equal(s.attackPlans.reduce((n,p)=>n+p.allocationValue,0),1000,'Splitting a plan divides its budget instead of cloning it');assert.equal(s.attackPlans.filter(p=>p.focus).length,1,'Only the retained main region keeps focus');
}
{
 const {s,id,p}=fixture();s.attackPlans=[];s.buildings.push({id:'second',owner:id,kind:'barracks',level:2,x:60,y:40},{id:'third',owner:id,kind:'barracks',level:1,x:35,y:30});
 p.troops=100;p.garrisons=[{id:'home',x:30,y:40,strength:100}];const births=new Set();let peak=0;
 for(let n=0;n<240;n++){s.tick++;const before=new Map();for(const g of p.garrisons){const k=g.x+','+g.y;before.set(k,(before.get(k)||0)+g.strength);}p.troops+=12;E.spatialArmyStep(s,false);const after=new Map();for(const g of p.garrisons){const k=g.x+','+g.y;after.set(k,(after.get(k)||0)+g.strength);}for(const [k,v] of after)if(v-(before.get(k)||0)>1)births.add(k);peak=Math.max(peak,p.garrisons.length);assert(Math.abs(p.garrisons.reduce((n,g)=>n+g.strength,0)-p.troops)<1e-6);}
 assert(births.size>=2,'New recruits use multiple actual barracks');
 assert([...births].every(k=>s.buildings.some(b=>b.kind==='barracks'&&b.x+','+b.y===k)),'Recruitment occurs only in barracks, never cities or distant fronts');
 assert(peak<40,'Co-located groups merge instead of growing with match duration');
}
