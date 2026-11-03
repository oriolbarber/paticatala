// LA VELA A LA PLATJA (v24). Abans de sortir, el patí és a terra però la vela ja és al
// vent: canvia de banda i flameja aproada segons com el gires, i el patí no es mou.
// En sortir (entrarAlMar) la vela continua on era, sense salt.
const A = require('./_entorn.js')();
const S=A.S, F=A.F, D2R=A.D2R, R2D=A.R2D;
let fall=0, n=0;
const ok=(b,t)=>{ n++; if(!b){ fall++; console.log('  ✗ '+t); } };
console.log('LA VELA A LA PLATJA\n');

// 1) Gir de 0° a 360° (i al revés) a mà, a 20°/s
for(const kn of [5,8,12]) for(const sheet of [0, 0.45, 1]) for(const sentit of [1,-1]){
  A.resetToBeach(); S.windFrom=0; S.windKn=kn; S.sheet=sheet; S.heading=0;
  const x0=S.px, y0=S.py; let mou=0, bandes=new Set(), flapAproa=true, bePosada=true, mal='';
  for(let i=0;i<120;i++) A.physics(1/60);
  const pas = sentit*20/60;
  for(let k=0; k<=360/Math.abs(pas); k++){
    const g = k*pas; S.heading = A.normA(g*D2R); A.physics(1/60);
    mou = Math.max(mou, Math.hypot(S.px-x0, S.py-y0), S.speed, Math.abs(S.vLat), Math.abs(S.heel), Math.abs(S.angVel));
    bandes.add(S.sailSide);
    const a = ((g%360)+360)%360;
    if((a<1 || a>359) && !F.flap) flapAproa=false;
    // de través, la vela ja ha de ser a sotavent (amb un marge perquè hi arribi)
    if((Math.abs(a-90)<1 && S.sailSide!==1) || (Math.abs(a-270)<1 && S.sailSide!==-1)){ bePosada=false; mal=`${a.toFixed(0)}°`; }
  }
  const nom=`${kn} kn, escota ${sheet}, gir ${sentit>0?'horari':'antihorari'}`;
  ok(bandes.size===2, `${nom}: la vela no canvia de banda`);
  ok(flapAproa, `${nom}: aproada la vela no flameja`);
  ok(bePosada, `${nom}: de través la vela no és a sotavent (${mal})`);
  ok(mou===0, `${nom}: el patí es mou (${mou})`);
}
// 2) Girat de cop (tocar lluny per orientar-lo): la vela acaba a sotavent
for(const kn of [5,12]) for(const h of [30,60,90,120,150]){
  A.resetToBeach(); S.windFrom=0; S.windKn=kn; S.sheet=0.45; S.heading=h*D2R;
  for(let i=0;i<180;i++) A.physics(1/60);
  S.heading=-h*D2R;
  for(let i=0;i<60*4;i++) A.physics(1/60);
  ok(S.sailSide===-1 && S.boomDir<0, `${kn} kn, girat de ${h}° a ${-h}°: la vela no passa a sotavent en 4 s`);
}
// 3) Sortir: la vela continua exactament on era
let pitjor={b:0,f:0};
for(const kn of [5,8,12]) for(const sheet of [0,0.45,1]) for(const h of [-60,-30,0,30,60]){
  A.resetToBeach(); S.windFrom=90*D2R; S.windKn=kn; S.sheet=sheet; S.heading=h*D2R;
  for(let i=0;i<300;i++) A.physics(1/60);
  const a={b:S.boomDir, s:S.sailSide, p:S.pulley, l:F.luffV, f:F.flapV, c:F.clV, tw:F.twistV};
  A.entrarAlMar(); A.updateWeight(1/60); A.physics(1/60);
  const db=Math.abs(S.boomDir-a.b)*R2D, df=Math.max(Math.abs(F.luffV-a.l), Math.abs(F.flapV-a.f), Math.abs(F.clV-a.c));
  pitjor.b=Math.max(pitjor.b,db); pitjor.f=Math.max(pitjor.f,df);
  ok(S.mode==='mar' && S.sailSide===a.s && Math.abs(S.pulley-a.p)<0.02 && db<=1.5 && df<0.15 && Math.abs(F.twistV-a.tw)*R2D<2,
     `${kn} kn, escota ${sheet}, rumb ${h}°: salt en sortir (vela ${a.s}→${S.sailSide}, ${db.toFixed(2)}°, forma ${df.toFixed(2)})`);
}
console.log(`  en sortir, el primer fotograma: la vela gira com a molt ${pitjor.b.toFixed(2)}° i la forma canvia ${pitjor.f.toFixed(2)}`);
console.log(fall ? `\n═══ ${fall} de ${n} COMPROVACIONS FALLEN ✗ ═══` : `\n═══ LA VELA RESPON A LA PLATJA I SURT SENSE SALT (${n}) ✔ ═══`);
process.exit(fall?1:0);
