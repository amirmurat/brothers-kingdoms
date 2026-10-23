'use strict';
const assert=require('node:assert/strict'),E=require('../engine.js');
function scenario(barracks=0,cities=0,reserve=0,food=10000){const s=E.lobby(2),id=E.addPlayer(s,'Economy');E.start(s,0);s.tiles.fill(1);s.owners.fill(id);s.territoryRevision++;s.buildings=[];s.armies=[];s.attackPlans=[];const p=E.person(s,id);p.land=1000;p.troops=reserve;p.garrisons=[{id:'g',x:20,y:20,strength:reserve}];p.res.food=food;for(let n=0;n<barracks+cities;n++)s.buildings.push({id:'b'+n,owner:id,kind:n<barracks?'barracks':'city',level:1,x:20+n%100,y:20+Math.floor(n/100)});E.tick(s);return {s,p};}
assert.equal(scenario(1,1,0).p.troopIncome,scenario(1,1,100).p.troopIncome,'Reserves no longer reproduce exponentially below capacity');
assert(scenario(5).p.troopIncome>scenario(1).p.troopIncome,'More barracks produce more recruits below limits');
const hungry=scenario(100,0,0,0);assert.equal(hungry.p.recruitment.reason,'Food limits recruitment');assert(hungry.p.troopIncome<hungry.p.recruitment.potential);
assert.equal(scenario(100,10,0,0).p.troopIncome,hungry.p.troopIncome,'Cities without worked resource cells do not conjure food');
const rows=[];for(const kind of ['barracks','city','fort']){const base=E.KINDS[kind].cost,sum=c=>Object.values(c).reduce((a,b)=>a+b,0);const upgrades=[1,2,3].map(level=>sum(E.costUpgrade({kind,level})));assert(upgrades[0]>sum(base)&&upgrades[2]>upgrades[1]);rows.push({kind,newBuilding:sum(base),upgrades,level4Total:sum(base)+upgrades.reduce((a,b)=>a+b)});}
console.log('PASS economy: no reserve compounding, barracks production, food bottleneck, support infrastructure and tier progression '+JSON.stringify(rows));
