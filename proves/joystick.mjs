// EL JOYSTICK AMB LA SILUETA DEL PATÍ (v27). El fons és el patí vist des de dalt i
// gira com es veu el patí a pantalla; el gest es llegeix en aquest marc: cap a la proa
// dibuixada, pes a proa. Comprova que:
//  1) la silueta segueix el rumb a pantalla a les tres vistes, també virant i passant
//     per ±180°, sense salts;
//  2) a la de popa i a la perspectiva (proa amunt) el gest mou el pes igual que a la v26;
//  3) a la de nord, cap on apunta la proa és pes a proa, i cap a estribord, estribord;
//  4) el pom és on seu el patró: dins la silueta i en la mateixa direcció que al llenç.
import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch({ executablePath: process.env.CHROME });
let fall = 0, n = 0;
const ok = (c, t) => { n++; if(!c){ fall++; console.log('  ✗ ' + t); } };
console.log('EL JOYSTICK AMB LA SILUETA DEL PATÍ\n');
const graus = r => r*180/Math.PI;

const pg = await b.newPage({ viewport:{ width:400, height:682 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto('file://' + path.resolve('pati_vela_mobil.html'), { waitUntil:'load' });
await pg.waitForTimeout(700);
await pg.evaluate(() => {
  for(const id of ['ovGuia','ovManual','ovConfig','ovReptes']) document.getElementById(id)?.classList.remove('on');
  // angle de la silueta tal com el pinta el navegador, i el del patí al llenç (w2s)
  window.__angDom = () => { const m = new DOMMatrix(getComputedStyle(document.getElementById('joyPati')).transform); return Math.atan2(m.b, m.a); };
  window.__angLlenc = () => { const f = { x:Math.sin(S.heading), y:-Math.cos(S.heading) };
    const p = w2s({ x:S.px + f.x*L*0.4, y:S.py + f.y*L*0.4 }), q = w2s({ x:S.px - f.x*L*0.4, y:S.py - f.y*L*0.4 });
    return Math.atan2(p.x - q.x, q.y - p.y); };
  window.__raf = k => new Promise(async r => { for(let i=0;i<k;i++) await new Promise(q => requestAnimationFrame(q)); r(); });
});
const dif = (a, c) => Math.abs(graus(Math.atan2(Math.sin(a - c), Math.cos(a - c))));

// 1) orientació a cada vista
await pg.evaluate(() => { entrarAlMar(); S.board = 1; S.windKn = 12; });
for(const mode of ['nord', 'popa']) for(const hd of [0, 60, 150, -100, 200]){
  const r = await pg.evaluate(async ([mode, hd]) => {
    while(cam.mode !== mode) toggleCamMode(); joyZen = true;
    S.heading = hd*Math.PI/180; S.windFrom = normA(S.heading + 1.4);
    await __raf(3);
    return { dom:__angDom(), llenc:__angLlenc(), vis:getComputedStyle(joy).display !== 'none' };
  }, [mode, hd]);
  ok(r.vis, `${mode} ${hd}°: el joystick no es veu`);
  ok(dif(r.dom, r.llenc) < 2, `${mode} ${hd}°: la silueta apunta a ${graus(r.dom).toFixed(0)}° i el patí al llenç a ${graus(r.llenc).toFixed(0)}°`);
}
// a la de popa, quan la càmera ja hi és, proa amunt
{
  const r = await pg.evaluate(async () => { while(cam.mode !== 'popa') toggleCamMode(); S.heading = 1; S.angVel = 0; await __raf(300); return __angDom(); });
  ok(dif(r, 0) < 4, `popa assentada: la silueta hauria d'anar proa amunt (${graus(r).toFixed(1)}°)`);
}
// perspectiva navegant (la càmera darrere: proa amunt) i a la platja, de costat
{
  const r = await pg.evaluate(async () => { while(cam.mode !== 'persp') toggleCamMode(); await __raf(240); return { dom:__angDom(), p3:cam.angP3 }; });
  ok(dif(r.dom, r.p3) < 2 && dif(r.dom, 0) < 6, `perspectiva navegant: la silueta a ${graus(r.dom).toFixed(1)}° (patí a pantalla ${graus(r.p3).toFixed(1)}°)`);
}
// 1b) virant a la de nord, passant per ±180°: cada fotograma on toca, sense salts
{
  const r = await pg.evaluate(async () => {
    while(cam.mode !== 'nord') toggleCamMode(); joyZen = true;
    let pitjor = 0, salt = 0, prev = null;
    for(let i=0;i<150;i++){
      S.heading = normA(Math.PI*0.7 + i*0.025);          // 1,5 rad/s, creua ±180°
      await __raf(1);
      const a = __angDom(), c = __angLlenc(), d = Math.abs(Math.atan2(Math.sin(a - c), Math.cos(a - c)));
      pitjor = Math.max(pitjor, d);
      if(prev !== null) salt = Math.max(salt, Math.abs(Math.atan2(Math.sin(a - prev), Math.cos(a - prev))));
      prev = a;
    }
    return { pitjor, salt };
  });
  ok(graus(r.pitjor) < 2.5, `virant, la silueta es desvia ${graus(r.pitjor).toFixed(1)}° del patí`);
  ok(graus(r.salt) < 4, `virant, la silueta salta ${graus(r.salt).toFixed(1)}° d'un fotograma a l'altre`);
}

// 2) i 3) el gest: arrossegar el pom des del centre
async function gest(mode, hd, dx, dy){
  const c = await pg.evaluate(async ([mode, hd]) => {
    while(cam.mode !== mode) toggleCamMode(); joyZen = true;
    S.heading = hd*Math.PI/180; S.angVel = 0;
    if(mode === 'popa') cam.rot = -S.heading;            // la càmera ja assentada darrere
    if(mode === 'persp'){ camYaw3 = S.heading; }
    S.wxT = S.wfT = 0;
    await __raf(4);
    const r = joy.getBoundingClientRect(); return { x:r.left + r.width/2, y:r.top + r.height/2, a:angJoy() };
  }, [mode, hd]);
  await pg.mouse.move(c.x, c.y); await pg.mouse.down();
  await pg.mouse.move(c.x + dx/2, c.y + dy/2); await pg.mouse.move(c.x + dx, c.y + dy);
  const r = await pg.evaluate(() => ({ wx:S.wxT, wf:S.wfT, kl:parseFloat(joyKnob.style.left), kt:parseFloat(joyKnob.style.top) }));
  await pg.mouse.up();
  return { ...r, a:c.a };
}
// la v26: x = dx/35, y = −dy/35, dins del cercle
const v26 = (dx, dy) => { let x = dx/35, y = -dy/35; const m = Math.hypot(x, y); if(m > 1){ x /= m; y /= m; } return { wx:x, wf:y }; };
const GESTOS = [[20, -30], [-30, 0], [0, 28], [40, 40], [-12, -60], [8, 5]];
for(const mode of ['popa', 'persp']) for(const [dx, dy] of GESTOS){
  const r = await gest(mode, 35, dx, dy), e = v26(dx, dy);
  // a la perspectiva el patí escorat es veu un pèl tort: tolerància d'uns 3°
  const tol = mode === 'persp' ? 0.06 : 0.01;
  ok(Math.abs(r.wx - e.wx) < tol && Math.abs(r.wf - e.wf) < tol,
     `${mode}, gest (${dx},${dy}): pes ${r.wx.toFixed(2)},${r.wf.toFixed(2)} i a la v26 ${e.wx.toFixed(2)},${e.wf.toFixed(2)} (silueta a ${graus(r.a).toFixed(1)}°)`);
}
// nord amb la proa a la dreta de la pantalla (rumb 90° i la càmera sense girar)
{
  const r1 = await gest('nord', 90, 30, 0);
  ok(r1.wf > 0.8 && Math.abs(r1.wx) < 0.06, `nord, proa a la dreta: arrossegar cap a la dreta ha de ser pes a proa (${r1.wx.toFixed(2)},${r1.wf.toFixed(2)})`);
  const r2 = await gest('nord', 90, 0, 30);
  ok(r2.wx > 0.8 && Math.abs(r2.wf) < 0.06, `nord, proa a la dreta: arrossegar avall ha de ser estribord (${r2.wx.toFixed(2)},${r2.wf.toFixed(2)})`);
  const r3 = await gest('nord', 180, 0, 30);
  ok(r3.wf > 0.8, `nord, proa avall: arrossegar avall ha de ser pes a proa (${r3.wf.toFixed(2)})`);
}

// 4) el pom: dins la silueta i en la mateixa direcció que el patró al llenç
{
  const r = await pg.evaluate(async () => {
    while(cam.mode !== 'nord') toggleCamMode(); joyZen = true;
    const out = [];
    for(const hd of [30, 135, -80]) for(const [wx, wf] of [[1,1],[-1,1],[1,-1],[-1,-1],[0.5,0],[0,-0.6]]){
      S.heading = hd*Math.PI/180; S.wx = S.wxT = wx; S.wf = S.wfT = wf;
      joyKnob.style.transition = 'none';
      await __raf(3);
      const jp = joyPati.getBoundingClientRect(), kb = joyKnob.getBoundingClientRect(), jb = joy.getBoundingClientRect();
      const cx = jb.left + jb.width/2, cy = jb.top + jb.height/2;
      const kx = kb.left + kb.width/2 - cx, ky = kb.top + kb.height/2 - cy;
      // de pantalla al marc del patí, en eslores de la silueta
      const a = angJoy(), Ls = joy.clientWidth*0.92;
      const bx = ( kx*Math.cos(a) + ky*Math.sin(a))/Ls, by = (-kx*Math.sin(a) + ky*Math.cos(a))/Ls;
      // el patró al llenç: el mateix punt del patí (CREW_X, crewY), girat amb el rumb
      const x = wx*CREW_X(), y = crewY(wf), h = S.heading;
      const pc = w2s({ x:S.px + x*Math.cos(h) - y*Math.sin(h), y:S.py + x*Math.sin(h) + y*Math.cos(h) }), p0 = w2s({ x:S.px, y:S.py });
      out.push({ hd, wx, wf, bx, by, dK:Math.atan2(kx, -ky), dC:Math.atan2(pc.x - p0.x, -(pc.y - p0.y)) });
    }
    joyKnob.style.transition = '';
    return out;
  });
  for(const p of r){
    const nom = `pes ${p.wx},${p.wf} amb rumb ${p.hd}°`;
    ok(Math.abs(p.bx) <= 0.196 && p.by >= -0.275 && p.by <= 0.43, `${nom}: el pom surt de la silueta (${p.bx.toFixed(3)}, ${p.by.toFixed(3)} eslores)`);
    ok(dif(p.dK, p.dC) < 4, `${nom}: el pom va a ${graus(p.dK).toFixed(0)}° i el patró al llenç a ${graus(p.dC).toFixed(0)}°`);
  }
}
ok(!errs.length, 'errors: ' + errs.join(' | '));
await b.close();
console.log(fall ? `\n═══ ${fall} de ${n} COMPROVACIONS FALLEN ✗ ═══` : `\n═══ LA SILUETA SEGUEIX EL PATÍ I EL GEST MOU EL PES COM ABANS (${n}) ✔ ═══`);
process.exit(fall ? 1 : 0);
