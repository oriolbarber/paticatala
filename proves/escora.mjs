// ESCORA: el patí es tomba sencer, sense deformar-se. Es mesura sobre el llenç real
// a les zenitals i amb els punts rígids en perspectiva, de 0° a 80° i en cinc rumbs.
// Comprova el que es veia malament al mòbil: bancades de biaix respecte dels bucs i
// una mànega que canviava segons cap on anava el patí.
import { chromium } from 'playwright';
import path from 'path';
const URL = 'file://' + path.resolve('pati_vela_mobil.html');
const b = await chromium.launch({ executablePath: process.env.CHROME });
const pg = await b.newPage({ viewport:{ width:430, height:860 } });
let errors = 0;
pg.on('pageerror', e => { errors++; console.log('  ERROR DE PÀGINA:', e.message); });
await pg.goto(URL, { waitUntil:'load' });
await pg.waitForTimeout(500);
const casos = await pg.evaluate(() => {
  document.getElementById('ovGuia').classList.remove('on');
  let T = null;
  const orig = drawBoat;
  drawBoat = function(){ T = cx2d.getTransform(); return orig(); };
  const pt = (x,y) => { const c=Math.cos(S.heading), s=Math.sin(S.heading);
    const wx=S.px+x*L*c-y*L*s, wy=S.py+x*L*s+y*L*c;
    return [T.a*wx+T.c*wy+T.e, T.b*wx+T.d*wy+T.f]; };
  S.mode='mar'; S.everInWater=true; S.board=1; S.capsized=0; S.speed=0.4;
  S.px=0; S.py=shoreFn(0)-220*(L/5.6);
  const out=[];
  for(const mode of ['popa','nord']) for(const rumb of [0,60,135,240,315])
  for(const sg of [-1,1]) for(const a of [0,10,20,30,40,50,60,70,80]){
    cam.mode=mode; cam.z=1; cam.zt=1; S.heading=rumb*Math.PI/180;
    S.roll=sg*a*Math.PI/180; S.heel=S.roll;
    for(let k=0;k<2;k++) updateCamera(1/60);
    T=null; renderWorld(1/60);
    const A=pt(-.15,-.5), B=pt(-.15,.5), C=pt(.15,-.5);
    const e=[B[0]-A[0],B[1]-A[1]], t=[C[0]-A[0],C[1]-A[1]];
    const ne=Math.hypot(...e), nt=Math.hypot(...t);
    out.push({mode,a,biaix:Math.abs(90-Math.acos((e[0]*t[0]+e[1]*t[1])/ne/nt)*180/Math.PI),man:nt/ne});
  }
  drawBoat = orig;
  // perspectiva: la distància entre punts del patí no pot canviar en escorar
  if(typeof rollX==='undefined') return {out,dif:1};   // versió sense gir rígid
  const P=[[-.15*L,0],[.15*L,0],[0,1.19*L],[.15*L,.25*L]];
  const d=(p,q)=>Math.hypot(rollX(p[0],p[1])-rollX(q[0],q[1]), rollZ(p[0],p[1])-rollZ(q[0],q[1]));
  let dif=0;
  for(const sg of [-1,1]) for(const a of [0,20,40,60,80]){
    S.roll=sg*a*Math.PI/180;
    for(const p of P) for(const q of P){ const s=S.roll; const dn=d(p,q); S.roll=0; const d0=d(p,q); S.roll=s;
      dif=Math.max(dif,Math.abs(dn-d0)/L); }
  }
  S.roll=0;
  return {out,dif};
});
await b.close();
let fall=0;
const ok=(c,t)=>{ if(!c) fall++; console.log(`  ${c?'✔':'✗'} ${t}`); };
console.log('\nESCORA SENSE DEFORMAR EL PATÍ\n');
for(const m of ['popa','nord']){
  const v=casos.out.filter(c=>c.mode===m);
  const bx=Math.max(...v.map(c=>c.biaix));
  ok(bx<0.5, `${m} · les bancades sempre perpendiculars als bucs (biaix màxim ${bx.toFixed(1)}°)`);
  let esp=0; for(const a of new Set(v.map(c=>c.a))){ const u=v.filter(c=>c.a===a).map(c=>c.man); esp=Math.max(esp,Math.max(...u)-Math.min(...u)); }
  ok(esp<0.005, `${m} · la mànega no depèn del rumb (dispersió ${esp.toFixed(3)})`);
  const mig=a=>{ const u=v.filter(c=>c.a===a).map(c=>c.man); return u.reduce((s,x)=>s+x,0)/u.length; };
  const seq=[0,10,20,30,40,50,60,70,80].map(mig); let baixa=true;
  for(let i=1;i<seq.length;i++) if(seq[i]>seq[i-1]+1e-6) baixa=false;
  ok(baixa, `${m} · la mànega només baixa en tombar-se (${seq[0].toFixed(2)} → ${seq[seq.length-1].toFixed(2)})`);
}
ok(casos.dif<1e-9, `perspectiva · el patí es tomba rígid (diferència ${casos.dif.toFixed(4)} eslores)`);
if(errors) fall+=errors;
console.log(fall?`\n═══ ${fall} FALLADES ✗ ═══\n`:'\n═══ ESCORA RÍGIDA ✔ ═══\n');
process.exit(fall?1:0);
