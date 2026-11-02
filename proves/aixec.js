// BUC ALÇAT: la posició i el pes del patró decideixen si s'alça i si bolca.
// Calibrat amb l'experiència de l'Oriol: barlovent, a través, uns 12 kn.
const A = require('./_entorn.js')();
const S=A.S, F=A.F, D2R=A.D2R, R2D=A.R2D;
let ok=true;
const cal=(c,t)=>{ ok=ok&&c; console.log(`  ${c?'✔':'✗'} ${t}`); };
const POS=[['sotavent',.86],['centre',0],['barlovent',-.86],['penjat',-1]];

function navega(w, wx, seg, rumb=90, sheet=.85, tack=1){
  A.resetToBeach(); S.mode='mar'; S.everInWater=true; S.windFrom=0; S.windKn=w;
  S.px=0; S.py=-A.CH.len*.6; S.heading=tack*rumb*D2R; S.speed=.9; S.sheet=sheet; S.sailSide=tack; S.pulley=tack;
  S.wx=S.wxT=wx*tack; S.wf=S.wfT=0; S.angVel=0;
  let mx=0;
  for(let i=0;i<seg*60;i++){
    S.heading=tack*rumb*D2R; S.angVel=0; A.updateWeight(1/60); A.physics(1/60); S.px=0; S.py=-A.CH.len*.6;
    mx=Math.max(mx,Math.abs(S.roll));
    if(S.capsized>0) return {bolca:true,t:i/60,graus:99};
  }
  return {bolca:false,graus:Math.abs(S.roll)*R2D,mx:mx*R2D,signe:Math.sign(S.roll),kn:S.speed*6};
}
const llindar=(wx,kg=72)=>{ S.crewKg=kg; let r=99; for(let w=3;w<=30;w+=.5){ const e=navega(w,wx,12); if(e.bolca||e.graus>3){ r=w; break; } } S.crewKg=72; return r; };

console.log('BUC ALÇAT\n');
const ll=POS.map(p=>llindar(p[1]));
console.log('  vent mínim a través: '+POS.map((p,i)=>`${p[0]} ${ll[i]}`).join(' · '));
cal(ll[2]>=11 && ll[2]<=13, 'assegut a barlovent s\'alça cap als 12 kn');
cal(ll[0]<ll[1] && ll[1]<ll[2] && ll[2]<ll[3] && ll[3]-ll[0]>=5, 'la posició del patró hi mana clarament');
{ const a=llindar(-.86,50), b=llindar(-.86,100); console.log(`  patró a barlovent: 50 kg ${a} · 100 kg ${b}`); cal(a<ll[2] && ll[2]<b, 'com més pes a barlovent, més vent cal'); }
{ const r=POS.map(p=>navega(1,p[1],8).graus); const f=[45,72,100].map(k=>{S.crewKg=k;const g=Math.max(...POS.map(p=>navega(1,p[1],8).graus));S.crewKg=72;return g;}); console.log(`  sense vent: ${r.map(x=>x.toFixed(1)).join(' / ')}°`); cal(Math.max(...r,...f)===0,'el pes sol no aixeca res, de 45 a 100 kg'); }
{ const e=navega(10,.86,10); console.log(`  sotavent amb 10 kn: ${e.bolca?'bolca als '+e.t.toFixed(1)+' s':e.graus.toFixed(0)+'°'}`); cal(e.bolca && e.t<6,'a sotavent amb 10 kn bolca de seguida'); }
{ const e=navega(20,-.86,20); console.log(`  barlovent amb 20 kn: ${e.bolca?'bolca':e.graus.toFixed(0)+'°'}`); cal(!e.bolca && e.graus>15 && e.graus<40,'es pot navegar amb el buc alçat'); }
{ const a=navega(20,-.86,15,90,.85,1), b=navega(20,-.86,15,90,.85,-1); console.log(`  amures: ${(a.graus*a.signe).toFixed(1)}° i ${(b.graus*b.signe).toFixed(1)}°`); cal(Math.abs(a.graus-b.graus)<.1 && a.signe===-b.signe,'simètric a les dues amures'); }
{ let bo=true; for(const w of [4,12,26]) for(const [,wx] of POS) for(const r of [30,90,170]){ const e=navega(w,wx,6,r,.5); if(e.graus!==e.graus) bo=false; } cal(bo,'cap NaN'); }
{ const pla=navega(12,-1,40), alt=navega(12,-.86,40), poc=navega(8,-.86,40); console.log(`  12 kn a través: pla ${pla.kn.toFixed(1)} kn · buc alçat ${alt.kn.toFixed(1)} kn · 8 kn pla ${poc.kn.toFixed(1)} kn`); cal(pla.graus===0 && alt.graus>4 && alt.kn-pla.kn>.5 && alt.kn-pla.kn<1,'el buc fora de l\'aigua frega menys: guanya de 0,5 a 1 kn'); cal(poc.graus===0 && Math.abs(poc.kn-4.5)<.1,'amb els dos bucs a l\'aigua, la velocitat no canvia'); }
console.log('\n'+(ok?'═══ BUC ALÇAT ✔ ═══':'✗ BUC ALÇAT HA CANVIAT'));
process.exit(ok?0:1);
