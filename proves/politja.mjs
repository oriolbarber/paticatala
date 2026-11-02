// POLITJA DE LA BARRA ESCOTERA: mesura en píxels reals que el centre de la
// politja cau sempre damunt de la barra DIBUIXADA, a les tres vistes, i que la
// barra té la fletxa de la foto (≈ 8% de la llum).
// Es compara el que surt al llenç, no les fórmules: l'error era que la barra i
// la politja es calculaven per separat i cadascuna deia una altra cosa.
import { chromium } from 'playwright';
import path from 'path';
const URL = 'file://' + path.resolve('pati_vela_mobil.html');
const b = await chromium.launch({ executablePath: process.env.CHROME });
const pg = await b.newPage({ viewport:{ width:430, height:860 }, deviceScaleFactor:2 });
let errors = 0;
pg.on('pageerror', e => { errors++; console.log('  ERROR DE PÀGINA:', e.message); });
await pg.goto(URL, { waitUntil:'load' });
await pg.waitForTimeout(600);
const casos = await pg.evaluate(() => {
  document.getElementById('ovGuia').classList.remove('on');
  const P = CanvasRenderingContext2D.prototype, orig = {};
  let cami = [], barra = null, grava = false;
  const dev = (c,x,y) => { const m = c.getTransform();
    return [(m.a*x+m.c*y+m.e)/2, (m.b*x+m.d*y+m.f)/2]; };
  for(const k of ['beginPath','moveTo','lineTo','stroke']) orig[k] = P[k];
  P.beginPath = function(){ cami = []; return orig.beginPath.call(this); };
  P.moveTo = function(x,y){ cami.push(dev(this,x,y)); return orig.moveTo.call(this,x,y); };
  P.lineTo = function(x,y){ cami.push(dev(this,x,y)); return orig.lineTo.call(this,x,y); };
  P.stroke = function(){
    const s = this.strokeStyle;
    if(grava && !barra && cami.length>=21 && cami.length<=27 && (s==='#17171b' || typeof s!=='string'))
      barra = cami.slice();
    return orig.stroke.call(this);
  };
  const dSeg = (p,a,c) => { const dx=c[0]-a[0], dy=c[1]-a[1];
    const t = Math.max(0, Math.min(1, ((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));
    return Math.hypot(p[0]-a[0]-t*dx, p[1]-a[1]-t*dy); };
  const fora = [];
  S.mode='mar'; S.everInWater=true; S.board=1; S.speed=0.5; S.capsized=0; S.sheet=0.6;
  S.px=0; S.py=shoreFn(0)-220*(L/5.6);
  for(const mode of ['persp','popa','nord'])
  for(const rumb of [0,45,135,225,315])
  for(const heel of [0,0.5])
  for(let i=-4;i<=4;i++){
    cam.mode=mode; cam.z=1; cam.zt=1; S.heading=rumb*Math.PI/180; S.heel=heel; S.pulley=i/4;
    for(let k=0;k<3;k++) updateCamera(1/60);
    barra=null; grava=true;
    let pt=null; const a=ESCOTA_PATH, push=Array.prototype.push;
    a.push = function(e){ if(e.n==='barra') pt=dev(cx2d,e.sx,e.sy); return push.call(this,e); };
    renderWorld(1/60);
    delete a.push; grava=false;
    if(!barra || !pt){ fora.push({mode,rumb,heel,u:i/4,d:null}); continue; }
    let d=1e9; for(let j=1;j<barra.length;j++) d=Math.min(d, dSeg(pt,barra[j-1],barra[j]));
    const A=barra[0], B=barra[barra.length-1], M=barra[(barra.length-1)/2];
    const llum=Math.hypot(B[0]-A[0],B[1]-A[1]);
    const fletxa=Math.hypot(M[0]-(A[0]+B[0])/2, M[1]-(A[1]+B[1])/2);
    // ¿cap on es corba? Producte amb l'eix del patí a pantalla (popa = + en y local)
    const m0=cx2d.getTransform(); const c=Math.cos(S.heading), s=Math.sin(S.heading);
    const popa=[-s*(mode==='persp'?0:1), c*(mode==='persp'?0:1)];
    const ca=[M[0]-(A[0]+B[0])/2, M[1]-(A[1]+B[1])/2];
    const ang=cam.rot, px=Math.cos(ang)*popa[0]-Math.sin(ang)*popa[1], py=Math.sin(ang)*popa[0]+Math.cos(ang)*popa[1];
    fora.push({mode,rumb,heel,u:i/4,d,fr:fletxa/llum,enfora:(ca[0]*px+ca[1]*py)/llum});
  }
  for(const k in orig) P[k]=orig[k];
  return fora;
});
await b.close();
let fall = 0;
const ok = (c,t) => { if(!c) fall++; console.log(`  ${c?'✔':'✗'} ${t}`); };
console.log('\nPOLITJA SOBRE LA BARRA ESCOTERA\n');
for(const m of ['persp','popa','nord']){
  const v = casos.filter(c=>c.mode===m);
  const senseDades = v.filter(c=>c.d===null).length;
  const max = Math.max(...v.map(c=>c.d ?? 1e9));
  ok(senseDades===0, `${m.padEnd(5)} · ${v.length} casos, tots amb barra i politja`);
  ok(max < 1, `${m.padEnd(5)} · la politja mai se separa de la barra (màxim ${max.toFixed(2)} px)`);
}
for(const m of ['popa','nord']){
  const fr = Math.max(...casos.filter(c=>c.mode===m).map(c=>c.fr))*100;
  ok(fr < 15, `${m.padEnd(5)} · la barra és suau com a la foto (fletxa ${fr.toFixed(0)}% de la llum)`);
}
{ const e = Math.min(...casos.filter(c=>c.mode==='popa').map(c=>c.enfora))*100;
  ok(e > 2, `popa  · la barra es corba ENFORA, cap a popa (${e.toFixed(1)}% de la llum)`); }
if(errors) fall += errors;
console.log(fall ? `\n═══ ${fall} FALLADES ✗ ═══\n` : '\n═══ POLITJA GUIADA ✔ ═══\n');
process.exit(fall?1:0);
