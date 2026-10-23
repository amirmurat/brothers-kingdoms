'use strict';
// v133: deterministic strategic tradeoff benchmark. Does not change gameplay.
// Printed metrics are for design research; only game-integrity invariants are asserted.
const assert=require('node:assert/strict'),E=require('../engine.js');
function area(x1,x2,y1,y2){const a=[];for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)a.push(E.idx(x,y));return a;}
function run(shape,commitment){
 const s=E.lobby(81),id=E.addPlayer(s,'Human'),foe=E.addPlayer(s,'Rival');
 assert(E.start(s,0).ok);
 s.tiles.fill(1);s.owners.fill(0);s.armies=[];s.buildings=[];s.attackPlans=[];s.recoveryPlans=[];s.wars=[];s.landTotal=E.W*E.H;
 const p=E.person(s,id),d=E.person(s,foe);p.land=d.land=0;
 for(let y=20;y<60;y++)for(let x=20;x<70;x++){s.owners[E.idx(x,y)]=id;p.land++;}
 for(let y=20;y<60;y++)for(let x=70;x<115;x++){s.owners[E.idx(x,y)]=foe;d.land++;}
 p.troops=3000;p.troopCap=20000;p.garrisons=[{id:'home',x:69,y:39,strength:3000}];p.capital={x:60,y:39};
 d.troops=500;d.troopCap=20000;d.garrisons=[{id:'foe',x:75,y:39,strength:500}];d.capital={x:100,y:39};
 s.buildings=[{id:'enemy-fort',kind:'fort',level:3,owner:foe,x:72,y:39},
              {id:'enemy-city',kind:'city',level:3,owner:foe,x:82,y:39}];
 s.territoryRevision++;
 const z=shape==='fort'?area(70,76,36,42):shape==='city'?area(70,85,36,42):area(70,114,20,59);
 assert(E.action(s,id,{type:'setNationTarget',target:foe,enabled:true}).ok);
 const order=E.action(s,id,{type:'send',x:70,y:39,zone:z,percent:commitment,targets:[foe]});
 assert(order.ok,order.error);
 const deployed=s.armies.filter(a=>a.owner===id).reduce((n,a)=>n+a.strength,0);
 assert(deployed<=3000*(1-E.reserveShare(p))+1e-6,'No offensive spends protected home reserve');
 assert(Math.abs(E.militaryStrength(s,id).total-3000)<1e-6,'Launching a plan does not invent or delete troops');
 const startingLand=p.land;
 for(let i=0;i<64;i++)E.combatStep(s);
 const result={shape,commitment,deployed:Math.round(deployed),landGained:p.land-startingLand,
  casualties:Math.round(3000-E.militaryStrength(s,id).total),
  fortCaptured:s.buildings[0].owner===id,cityCaptured:s.buildings[1].owner===id};
 assert(result.landGained>=0&&result.landGained<=z.length,'Captures remain inside painted zone');
 assert(result.casualties>=0&&result.casualties<=3000,'Troop costs cannot become negative or create soldiers');
 return result;
}
const measurements=[];
for(const commitment of [5,30,95])for(const shape of ['fort','city','country'])measurements.push(run(shape,commitment));
for(const shape of ['fort','city','country']){
 const rows=measurements.filter(x=>x.shape===shape);
 assert(rows[0].deployed<rows[1].deployed&&rows[1].deployed<rows[2].deployed,'Higher requested commitment deploys more real troops');
}
const cityHigh=measurements.find(x=>x.shape==='city'&&x.commitment===95),
      countryHigh=measurements.find(x=>x.shape==='country'&&x.commitment===95);
assert(cityHigh.cityCaptured&&!countryHigh.cityCaptured,'On the controlled fortified board local objective can outperform huge painted scope');
// Do not assert exact captures/losses: future balancing can intentionally change those values.
console.log('PASS v133 strategic benchmark: '+JSON.stringify(measurements));
