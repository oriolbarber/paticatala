// VIRADA AMB ELS CONTROLS DEL MÒBIL. El dit només mou el pes (S.wxT, S.wfT: joystick o
// arrossegar el patró) i l'escota es queda on era. L'Oriol, a la v22: anant cap a popa per
// sotavent, la vela passava però tornava al costat de l'inici al cap de pocs segons.
// La seqüència: cenyida a 48°, pes endavant i al centre fins al vent (o 20° abans), cap a
// popa per la banda de la vela 6 s, i asseure's al nou barlovent. Ha d'acabar amb el
// carro i la vela a l'amura nova, i no tornar.
const A = require('./_entorn.js')();
const S=A.S, D2R=A.D2R, R2D=A.R2D;
const PIN=()=>{ S.px=0; S.py=-A.CH.len*0.6; };
let fall=0, n=0;
const ok=(b,t)=>{ n++; if(!b){ fall++; console.log('  ✗ '+t); } };
function virada(kn, tk, escota, abans, banda){
  A.resetToBeach(); S.mode='mar'; S.everInWater=true; PIN(); S.windFrom=0; S.windKn=kn;
  S.heading=tk*48*D2R; S.speed=0.8; S.sheet=escota; S.sailSide=tk; S.pulley=tk;
  S.wx=S.wxT=-0.86*tk; S.wf=S.wfT=0; S.angVel=0;
  for(let i=0;i<900;i++){ S.heading=tk*48*D2R; S.angVel=0; A.updateWeight(1/60); A.physics(1/60); PIN(); }
  let fase=1, t0=0, torna=false, passada=false;
  for(let i=0;i<60*30;i++){
    const t=i/60, h=tk*A.normA(S.heading)*R2D;
    if(fase===1){ S.wfT=0.9; S.wxT=0; if(h<=abans){ fase=2; t0=t; } }
    else if(fase===2){ S.wfT=-0.9; S.wxT=banda*0.6*tk; if(t>t0+6) fase=3; }
    else { S.wfT=0; S.wxT=0.86*tk; }
    A.updateWeight(1/60); A.physics(1/60); PIN();
    if(S.sailSide===-tk) passada=true;
    else if(passada) torna=true;                 // un cop passada, la vela no pot tornar
  }
  const h=tk*A.normA(S.heading)*R2D;
  return {h, carro:S.pulley*tk, vela:S.sailSide*tk, torna, passada, kn:S.speed*6};
}
console.log('VIRADA AMB ELS CONTROLS DEL MÒBIL\n');
for(const kn of [5,8,10,12]){
  const fila=[];
  for(const escota of [1,0.85]) for(const abans of [0,20]) for(const banda of [1,0,-1]) for(const tk of [1,-1]){
    const r=virada(kn,tk,escota,abans,banda);
    const nom=`${kn} kn, amura ${tk>0?'+':'-'}, escota ${escota}, a popa ${abans?abans+'° abans del vent':'en passar el vent'}, ${banda>0?'per sotavent':banda<0?'per barlovent':'pel centre'}`;
    ok(r.passada && !r.torna && r.vela===-1 && r.carro<-0.5 && r.h<0,
       `${nom}: rumb ${r.h.toFixed(0)}°, carro ${r.carro.toFixed(2)}, vela ${r.vela>0?'a la banda vella':'a la nova'}${r.torna?', ha tornat':''}`);
    fila.push(r.h);
  }
  console.log(`  ${kn} kn: rumb final de ${Math.max(...fila).toFixed(0)}° a ${Math.min(...fila).toFixed(0)}° (negatiu = amura nova)`);
}
console.log(fall ? `\n═══ ${fall} de ${n} VIRADES FALLEN ✗ ═══` : `\n═══ LES ${n} VIRADES ACABEN A L'AMURA NOVA ✔ ═══`);
process.exit(fall?1:0);
