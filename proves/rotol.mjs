// EL RÈTOL DE LA VELA (v27): navegant en règim o amb el patí aturat a la platja, el
// rètol VELA no ha de canviar de text més d'un cop per segon ni moure's més d'1 px
// entre fotogrames. Fins a la v26, als rumbs on l'angle d'atac queda a tocar dels 4°
// (FLAMEJA ↔ EN POTÈNCIA) canviava fins a 49 cops per segon i la caixa saltava 21 px:
// el flameig treu deriva i frena, i això tornava a obrir l'angle a cada pas.
// A l'empopada (v28), amb la vela al topall dels 80°, diu OBERTA MÀX.: SOBRECAÇADA només si
// amollant l'escota la vela s'obriria més.
import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch({ executablePath: process.env.CHROME });
let fall = 0, n = 0;
const ok = (c, t) => { n++; if(!c){ fall++; console.log('  ✗ ' + t); } };
console.log('EL RÈTOL DE LA VELA\n');

const pg = await b.newPage({ viewport:{ width:400, height:682 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto('file://' + path.resolve('pati_vela_mobil.html'), { waitUntil:'load' });
await pg.waitForTimeout(700);
await pg.evaluate(() => { for(const id of ['ovGuia','ovManual','ovConfig','ovReptes']) document.getElementById(id)?.classList.remove('on'); });

// [vent, rumb respecte del vent, escota, vista]: els sis primers queien al llindar
const CASOS = [[8,45,1,'popa'], [8,60,0.8,'popa'], [8,90,0.5,'popa'], [12,45,1,'nord'], [12,90,0.5,'persp'], [18,45,1,'popa'],
               [12,50,0.9,'popa'], [12,90,0.55,'nord'], [12,160,0.1,'persp'], [12,120,0.5,'popa']];
const mesura = (segons) => pg.evaluate(async (segons) => {
  const raf = () => new Promise(q => requestAnimationFrame(q));
  const v = document.getElementById('velaVal'), d = document.getElementById('diag');
  const fr = []; const t0 = performance.now();
  while(performance.now() - t0 < segons*1000){
    S.sheet = window.__sh ?? S.sheet; await raf();
    const r = d.getBoundingClientRect();
    fr.push({ t:performance.now(), txt:v.textContent, x:r.left, y:r.top, w:r.width, h:r.height });
  }
  let salt = 0, perSeg = 0, canvis = 0;
  for(let i=1;i<fr.length;i++){
    const a = fr[i-1], c = fr[i];
    salt = Math.max(salt, Math.abs(c.x-a.x), Math.abs(c.y-a.y), Math.abs(c.w-a.w), Math.abs(c.h-a.h));
    if(c.txt !== a.txt) canvis++;
  }
  for(let i=0;i<fr.length;i++){ let k = 0; for(let j=i+1;j<fr.length && fr[j].t - fr[i].t < 1000;j++) if(fr[j].txt !== fr[j-1].txt) k++; perSeg = Math.max(perSeg, k); }
  return { salt, perSeg, canvis, hz:fr.length/segons, txt:fr.at(-1).txt };
}, segons);

const resum = [];
for(const [kn, twa, sh, vista] of CASOS){
  await pg.evaluate(async ([kn, twa, sh, vista]) => {
    if(S.mode !== 'mar') entrarAlMar();
    S.windKn = kn; S.windFrom = 90*D2R; S.capsized = 0;
    S.px = 0; S.py = shoreFn(0) - 300*(L/5.6); S.heading = (90 - twa)*D2R; S.sheet = sh; S.speed = 0.8;
    window.__sh = sh;
    while(cam.mode !== vista) toggleCamMode();
    for(let i=0;i<150;i++){ S.sheet = sh; await new Promise(q => requestAnimationFrame(q)); }   // en règim
  }, [kn, twa, sh, vista]);
  const r = await mesura(3);
  const nom = `${kn} kn a ${twa}° amb l'escota a ${sh} (${vista})`;
  ok(r.perSeg <= 1, `${nom}: el rètol canvia ${r.perSeg} cops en un segon`);
  ok(r.salt <= 1, `${nom}: el rètol es mou ${r.salt.toFixed(1)} px d'un fotograma a l'altre`);
  resum.push(`${kn}/${twa}°/${sh} ${r.txt} ${r.canvis}`);
}

// EMPOPADA (v28): passat de l'òptim, el rètol només diu SOBRECAÇADA si amollant la vela
// s'obriria més. Amb l'escota amollada del tot la vela és al topall dels 80°: OBERTA MÀX.
// [vent, rumb, escota, rètol esperat]
const POPA = [[5,165,0,'OBERTA MÀX.'], [10,150,0,'OBERTA MÀX.'], [15,180,0,'OBERTA MÀX.'], [10,165,0.3,'SOBRECAÇADA'],
              [5,180,0.6,'SOBRECAÇADA'], [15,135,0.3,'SOBRECAÇADA'], [10,135,0,'EN POTÈNCIA'], [10,120,0.3,'EN POTÈNCIA']];
const navega = (kn, twa, sh, frames) => pg.evaluate(async ([kn, twa, sh, frames]) => {
  if(S.mode !== 'mar') entrarAlMar();
  while(cam.mode !== 'popa') toggleCamMode();
  S.windKn = kn; S.windFrom = 90*D2R; S.capsized = 0;
  S.px = 0; S.py = shoreFn(0) - 300*(L/5.6); S.heading = (90 - twa)*D2R; S.speed = 0.6;
  window.__sh = sh; window.__hd = S.heading;
  for(let i=0;i<frames;i++){ S.sheet = sh; S.heading = window.__hd; await new Promise(q => requestAnimationFrame(q)); }
  return { txt:document.getElementById('velaVal').textContent, topall:F.topall, max:F.maxSail*180/Math.PI, aoa:F.aoa*180/Math.PI };
}, [kn, twa, sh, frames]);
for(const [kn, twa, sh, esperat] of POPA){
  const e = await navega(kn, twa, sh, 200);
  const r = await mesura(2);
  const nom = `${kn} kn a ${twa}° amb l'escota a ${sh}`;
  ok(r.txt === esperat, `${nom}: el rètol diu ${r.txt} i hauria de dir ${esperat} (aoa ${e.aoa.toFixed(0)}°, vela oberta fins a ${e.max.toFixed(1)}°)`);
  ok(r.perSeg <= 1 && r.salt <= 1, `${nom}: ${r.perSeg} canvis en un segon, ${r.salt.toFixed(1)} px`);
}
// amollant a poc a poc pel topall, i amb el dit tremolant just al llindar: sense tremolor
{
  await navega(10, 165, 0.3, 120);
  const r = await pg.evaluate(async () => {
    const v = document.getElementById('velaVal'), d = document.getElementById('diag');
    const raf = () => new Promise(q => requestAnimationFrame(q));
    // l'escota on la vela queda just al llindar del topall (78°)
    let a = 0, c = 0.3; const lim = SAIL_MAX - VELA.topall;
    for(let i=0;i<30;i++){ const m = (a + c)/2; S.sheet = m; (sailGeoLimit() > lim) ? (a = m) : (c = m); }
    const llindar = (a + c)/2;
    const fr = []; const t0 = performance.now();
    while(performance.now() - t0 < 9000){
      const t = (performance.now() - t0)/1000;
      // 0-4 s: de 0,3 a amollada del tot; 4-9 s: al llindar, amb ±0,004 de tremolor del dit
      S.sheet = t < 4 ? 0.3*(1 - t/4) : llindar + 0.004*Math.sin(t*31);
      S.heading = window.__hd; await raf();
      const rc = d.getBoundingClientRect();
      fr.push({ t:performance.now(), txt:v.textContent, x:rc.left, w:rc.width });
    }
    let perSeg = 0, salt = 0; const txts = new Set(fr.map(f => f.txt));
    for(let i=1;i<fr.length;i++) salt = Math.max(salt, Math.abs(fr[i].x - fr[i-1].x), Math.abs(fr[i].w - fr[i-1].w));
    for(let i=0;i<fr.length;i++){ let k = 0; for(let j=i+1;j<fr.length && fr[j].t - fr[i].t < 1000;j++) if(fr[j].txt !== fr[j-1].txt) k++; perSeg = Math.max(perSeg, k); }
    const finals = fr.filter(f => f.t - t0 > 5000).map(f => f.txt);
    return { perSeg, salt, txts:[...txts], canvisFinal:finals.filter((x,i) => i && x !== finals[i-1]).length, llindar };
  });
  ok(r.txts.includes('SOBRECAÇADA') && r.txts.includes('OBERTA MÀX.'), `amollant pel topall el rètol no passa de SOBRECAÇADA a OBERTA MÀX. (${r.txts.join(', ')})`);
  ok(r.perSeg <= 1, `amollant pel topall el rètol canvia ${r.perSeg} cops en un segon`);
  ok(r.canvisFinal === 0, `amb l'escota al llindar del topall (${r.llindar.toFixed(3)}) i el dit tremolant, el rètol canvia ${r.canvisFinal} cops`);
  ok(r.salt <= 1, `al voltant del topall la caixa es mou ${r.salt.toFixed(1)} px`);
  resum.push(`topall a l'escota ${r.llindar.toFixed(3)}`);
}
// a la platja, aturat i amb la vela al vent
await pg.reload({ waitUntil:'load' });
await pg.waitForTimeout(700);
await pg.evaluate(() => { for(const id of ['ovGuia','ovManual','ovConfig','ovReptes']) document.getElementById(id)?.classList.remove('on'); window.__sh = 0.6; });
for(const vista of ['popa', 'persp']){
  await pg.evaluate(async (vista) => { while(cam.mode !== vista) toggleCamMode(); for(let i=0;i<90;i++) await new Promise(q => requestAnimationFrame(q)); }, vista);
  const r = await mesura(2);
  ok(r.perSeg <= 1 && r.salt <= 1, `platja (${vista}): ${r.perSeg} canvis en un segon, ${r.salt.toFixed(1)} px`);
}
// caçant l'escota d'una punta a l'altra el rètol canvia, però la caixa no es mou
const sw = await pg.evaluate(async () => {
  entrarAlMar(); S.windKn = 12; S.windFrom = 90*D2R; S.px = 0; S.py = shoreFn(0) - 300*(L/5.6); S.heading = 0; S.speed = 0.8; window.__sh = undefined;
  while(cam.mode !== 'popa') toggleCamMode();
  const d = document.getElementById('diag'), v = document.getElementById('velaVal');
  const txts = new Set(); let salt = 0, p = d.getBoundingClientRect();
  for(let i=0;i<=240;i++){ S.sheet = i/240; await new Promise(q => requestAnimationFrame(q));
    const r = d.getBoundingClientRect(); salt = Math.max(salt, Math.abs(r.left-p.left), Math.abs(r.width-p.width)); p = r; txts.add(v.textContent); }
  return { salt, txts:[...txts] };
});
ok(sw.txts.length >= 2, `caçant l'escota el rètol no ha canviat (${sw.txts.join(', ')})`);
ok(sw.salt <= 1, `en canviar de text la caixa del rètol salta ${sw.salt.toFixed(1)} px`);
ok(!errs.length, 'errors: ' + errs.join(' | '));
console.log('  canvis en 3 s: ' + resum.join(' · '));
await b.close();
console.log(fall ? `\n═══ ${fall} de ${n} COMPROVACIONS FALLEN ✗ ═══` : `\n═══ EL RÈTOL DE LA VELA NO TREMOLA (${n}) ✔ ═══`);
process.exit(fall ? 1 : 0);
