// EL RÈTOL DE LA VELA (v27): navegant en règim o amb el patí aturat a la platja, el
// rètol VELA no ha de canviar de text més d'un cop per segon ni moure's més d'1 px
// entre fotogrames. Fins a la v26, als rumbs on l'angle d'atac queda a tocar dels 4°
// (FLAMEJA ↔ EN POTÈNCIA) canviava fins a 49 cops per segon i la caixa saltava 21 px:
// el flameig treu deriva i frena, i això tornava a obrir l'angle a cada pas.
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
