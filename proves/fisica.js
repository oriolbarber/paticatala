// REGRESSIÓ DE FÍSICA: empopada, virada, trasluixada i gir amb el patí aturat.
// Els canvis de dibuix NO poden moure cap d'aquestes xifres.
const A = require('./_entorn.js')();
const S=A.S, F=A.F, D2R=A.D2R, R2D=A.R2D;
const PIN=(k)=>{S.px=0;S.py=-A.CH.len*k;};
let ok=true;
const cal=(c,t)=>{ ok=ok&&c; console.log(`  ${c?'✔':'✗'} ${t}`); };

console.log('FÍSICA (ha de donar el mateix que abans dels canvis de dibuix)\n');

// 1) EMPOPADA estable
{
  A.resetToBeach();S.mode="mar";S.everInWater=true;PIN(0.5);S.windFrom=0;S.windKn=12;
  S.heading=155*D2R; S.speed=0.6; S.sailSide=1; S.pulley=1; S.sheet=0.15;
  S.wx=0; S.wxT=0; S.wf=0; S.wfT=0;
  let sideChanges=0, prevSide=S.sailSide, maxDrift=0, sumV=0, n=0;
  for(let i=0;i<60*25;i++){
    A.updateWeight(1/60); A.physics(1/60); PIN(0.5);
    if(S.sailSide!==prevSide){ sideChanges++; prevSide=S.sailSide; }
    const drift=Math.abs(A.normA(S.heading-155*D2R))*R2D;
    if(i>60*3){ maxDrift=Math.max(maxDrift,drift); sumV+=S.speed; n++; }
  }
  console.log(`  empopada: deriva ${maxDrift.toFixed(0)}°, canvis de banda ${sideChanges}, ${(sumV/n*6).toFixed(1)} kn de mitjana`);
  cal(maxDrift<26 && sideChanges===0 && (sumV/n*6)>4.5, 'empopada estable');
}
// 2) VIRADA
{
  A.resetToBeach(); S.mode='mar'; S.everInWater=true; PIN(0.6); S.windFrom=0; S.windKn=13;
  S.heading=45*D2R; S.speed=0.75; S.sheet=0.85; S.sailSide=1; S.pulley=1;
  for(let i=0;i<120;i++){ A.updateWeight(1/60); A.physics(1/60); PIN(0.6); }
  let t=0, fet=false, creuat=0;
  for(let i=0;i<60*16;i++){
    if(F.absT*R2D>24 && S.sailSide===1){ S.wfT=1; S.sheet=0.95; S.wxT=-0.3; }
    else if(S.sailSide===1){ S.wfT=-0.85; S.sheet=0.35; S.wxT=-0.1; }
    else { S.wfT=0; S.sheet=S.speed>0.2?0.88:0.15; S.wxT=0.4; }
    A.updateWeight(1/60); A.physics(1/60); PIN(0.6);
    t += 1/60;
    if(S.sailSide===-1 && F.absT*R2D>30 && creuat===0) creuat=t;
    if(S.sailSide===-1 && S.speed>0.25 && A.normA(S.heading)<0){ fet=true; break; }
  }
  console.log(`  virada: la vela passa de banda en ${creuat.toFixed(1)} s · recupera 1,5 kn als ${t.toFixed(1)} s`);
  cal(fet && creuat>0 && creuat<8 && t<17, 'virada completa i en temps real');
}
// 3) TRASLUIXADA
{
  A.resetToBeach(); S.mode='mar'; S.everInWater=true; PIN(0.6); S.windFrom=0; S.windKn=13;
  S.heading=168*D2R; S.speed=0.7; S.sheet=0.2; S.sailSide=-1; S.pulley=-1;
  for(let i=0;i<120;i++){ A.updateWeight(1/60); A.physics(1/60); PIN(0.6); }
  const b0=S.sailSide; let t=0, fet=false;
  for(let i=0;i<60*16;i++){
    S.wxT=-0.75; S.wfT=-0.3; S.sheet=0.18;
    A.updateWeight(1/60); A.physics(1/60); PIN(0.6);
    t+=1/60; if(S.sailSide!==b0){ fet=true; break; }
  }
  console.log(`  trasluixada completada en ${t.toFixed(1)} s`);
  cal(fet && t<12, 'trasluixada completa');
}
// 4) GIR amb el patí aturat i el pes a popa
{
  A.resetToBeach(); S.mode='mar'; S.everInWater=true; PIN(0.6); S.windFrom=0; S.windKn=12;
  S.heading=8*D2R; S.speed=0.03; S.sheet=0.5; S.sailSide=1; S.pulley=1;
  S.wf=-1; S.wfT=-1; S.wx=0; S.wxT=0;
  let girTot=0, hPrev=S.heading, sost=0; const fin=[];
  for(let i=0;i<60*12;i++){
    A.updateWeight(1/60); A.physics(1/60); PIN(0.6);
    if(S.speed<0.15){
      fin.push(Math.abs(A.normA(S.heading-hPrev)));
      if(fin.length>120) fin.shift();
      if(fin.length===120) sost=Math.max(sost, fin.reduce((a,b)=>a+b,0)*R2D/2);
    }
    girTot += Math.abs(A.normA(S.heading-hPrev)); hPrev=S.heading;
  }
  console.log(`  aturat amb el pes a popa: ${sost.toFixed(1)}°/s sostinguts · ${(girTot/(2*Math.PI)).toFixed(2)} voltes en 12 s`);
  cal(sost<13 && girTot/(2*Math.PI)<0.75, 'aturat no roda sobre si mateix');
}
// 5) navegant, el gir segueix sent viu
{
  A.resetToBeach(); S.mode='mar'; S.everInWater=true; PIN(0.6); S.windFrom=0; S.windKn=12;
  S.heading=60*D2R; S.speed=1.0; S.sheet=0.7; S.wf=1; S.wfT=1; S.wx=-0.6; S.wxT=-0.6;
  let maxW=0;
  for(let i=0;i<60*6;i++){ A.updateWeight(1/60); A.physics(1/60); PIN(0.6); maxW=Math.max(maxW,Math.abs(S.angVel)); }
  console.log(`  navegant: gir màxim ${(maxW*R2D).toFixed(0)}°/s`);
  cal(maxW*R2D>6, 'amb velocitat respon al pes');
}
console.log('\n' + (ok?'═══ FÍSICA SENSE CANVIS ✔ ═══':'✗ LA FÍSICA HA CANVIAT'));
