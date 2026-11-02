// LÍMIT DE MAR OBERT: es navega de debò des de prop de la costa fins a 3 milles
// nàutiques, mar endins i de costat, i la velocitat no ha de caure abans d'hora.
// Abans el patí començava a frenar als 173 m.
const carrega=require('./_entorn.js');
const A=carrega(), {S,F,L}=A;
const M=L/5.6, D2R=Math.PI/180;
let fall=0;
const ok=(c,t)=>{ if(!c) fall++; console.log(`  ${c?'✔':'✗'} ${t}`); };
const LIMIT=5556;
function navega(eix){
  A.resetToBeach();
  S.mode='mar'; S.everInWater=true; S.beyondMouth=true; S.board=1; S.capsized=0; S.roll=0;
  S.windKn=12; S.px=eix==='x'?200*M:0; S.py=eix==='x'?-300*M:-200*M; S.speed=0.5;
  const rumb = eix==='x' ? 90*D2R : 0;      // mar endins és -y, heading 0
  S.windFrom = rumb + 90*D2R;               // de través, sempre
  S.sheet=0.55; S.sailSide=-1; S.pulley=-1; S.wxT=0.75; S.wx=0.75; S.wf=0; S.wfT=0;
  const v={}; let primer=null, t=0, abans=null, fi=0;
  for(;t<3600*2;t+=1/60){
    S.heading=rumb; S.angVel=0; S.roll=0; S.rollV=0; S.heel=Math.min(S.heel,0.2);
    if(eix==='x') S.py=-300*M; else S.px=0;
    A.updateWeight(1/60); A.physics(1/60);
    const d=(eix==='x'?S.px:-S.py)/M;
    if(primer===null && S.atEdge) primer=d;
    for(const k of [300,1000,3000,5400]) if(!v[k] && d>=k) v[k]=S.speed;
    if(d>=LIMIT-1){ fi+=1/60; if(fi>6) break; }
  }
  return {v,primer,fin:(eix==='x'?S.px:-S.py)/M,vFi:S.speed,t};
}
for(const [e,nom] of [['y','mar endins'],['x','de costat']]){
  const r=navega(e);
  console.log(`\n${nom.toUpperCase()}: ${(r.t/60).toFixed(0)} min · velocitat 300 m ${r.v[300]?.toFixed(3)} · 1 km ${r.v[1000]?.toFixed(3)} · 3 km ${r.v[3000]?.toFixed(3)} · 5,4 km ${r.v[5400]?.toFixed(3)} · al límit ${r.vFi.toFixed(3)}`);
  ok(r.v[300]&&r.v[5400], `${nom} · arriba als 5,4 km navegant`);
  ok(r.v[5400]>=r.v[300]*0.97, `${nom} · no perd velocitat abans del límit`);
  ok(r.primer!==null && r.primer>=5450, `${nom} · l'avís surt just a prop del límit (${r.primer?.toFixed(0)} m)`);
  ok(Math.abs(r.fin-LIMIT)<2, `${nom} · s'atura al límit de 3 milles (${r.fin.toFixed(0)} m)`);
  ok(r.vFi<r.v[5400]*0.5, `${nom} · al límit el patí perd empenta`);
}
console.log(fall?`\n═══ ${fall} FALLADES ✗ ═══\n`:'\n═══ LÍMIT DE 3 MILLES CORRECTE ✔ ═══\n');
process.exit(fall?1:0);
