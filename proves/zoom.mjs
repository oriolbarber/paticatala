// EL ZOOM (v26): lliscant vertical continu i logarítmic a les tres vistes.
// Comprova el rang (de tot el camp de regates al patí omplint la pantalla), que el
// lliscant respon al ratolí i al dit, que el botó 🔍, + i −, la tecla Z i la roda el
// mouen, que no tapa cap control dins l'iframe d'OcataVent, i que als dos extrems,
// navegant, no surt cap error ni cap coordenada no finita al llenç.
import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch({ executablePath: process.env.CHROME });
let fall = 0, n = 0;
const ok = (c, t) => { n++; if(!c){ fall++; console.log('  ✗ ' + t); } };
console.log('EL ZOOM\n');

async function obre(w, h, touch){
  const ctx = await b.newContext({ viewport:{ width:w, height:h }, hasTouch:!!touch });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  // cada crida de dibuix amb un número no finit compta (el llenç se les empassa en silenci)
  await pg.addInitScript(() => { window.__nan = 0; const P = CanvasRenderingContext2D.prototype;
    for(const m of ['moveTo','lineTo','arc','ellipse','fillRect','rect','quadraticCurveTo','bezierCurveTo','translate','scale','drawImage','fillText']){
      const o = P[m]; P[m] = function(...a){ if(a.some(v => typeof v==='number' && !Number.isFinite(v))) window.__nan++; return o.apply(this, a); }; } });
  await pg.goto('file://' + path.resolve('pati_vela_mobil.html'), { waitUntil:'load' });
  await pg.waitForTimeout(700);
  await pg.evaluate(() => { for(const id of ['ovGuia','ovManual','ovConfig','ovReptes']) document.getElementById(id)?.classList.remove('on'); });
  return { ctx, pg, errs };
}
const espera = ms => new Promise(r => setTimeout(r, ms));

// 1) Rang i escala
{
  const { ctx, pg, errs } = await obre(400, 682);
  const r = await pg.evaluate(() => ({ min:ZOOM.min, max:ZOOM.max, s0:zoomDeS(0), s1:zoomDeS(1), mig:zoomDeS(0.5),
    inv:[0.015, 0.1, 0.8, 2].map(z => Math.abs(zoomDeS(sDeZoom(z)) - z)/z), W, H, L, z0:cam.zt }));
  ok(Math.abs(r.s0 - r.min) < 1e-9 && Math.abs(r.s1 - r.max) < 1e-9, `els extrems del lliscant no són ${r.min} i ${r.max}`);
  ok(Math.abs(r.mig - Math.sqrt(r.min*r.max)) < 1e-9, 'l\'escala no és logarítmica (el mig no és la mitjana geomètrica)');
  ok(r.inv.every(e => e < 1e-9), 'sDeZoom no és la inversa de zoomDeS');
  ok(r.z0 === 0.8, `de sortida el zoom ha de ser el de sempre (80 %), és ${r.z0}`);
  const campLluny = Math.min(r.W, r.H)/(r.min*r.L/5.6), patiAprop = r.L*r.max/Math.min(r.W, r.H);
  ok(campLluny >= 500, `de lluny a la zenital només es veuen ${campLluny.toFixed(0)} m`);
  ok(patiAprop >= 0.95, `de prop a la zenital el patí fa només el ${(patiAprop*100).toFixed(0)} % de l'amplada`);
  console.log(`  zenital: de ${campLluny.toFixed(0)} m de camp (costat curt) al patí de ${(r.L*r.max).toFixed(0)} px (${(patiAprop*100).toFixed(0)} % de l'amplada)`);
  // perspectiva: distància de la càmera als extrems
  const p = await pg.evaluate(async () => { entrarAlMar(); S.board = 1; while(cam.mode!=='persp') toggleCamMode();
    const out = {};
    for(const z of [ZOOM.min, 0.8, ZOOM.max]){ posaZoom(z); cam.z = z; await new Promise(r => setTimeout(r, 120));
      out[z] = { back:cam.p3.BACK/(L/5.6), alt:cam.p3.CAMH/(L/5.6), FL:cam.p3.FL }; }
    return out; });
  const pl = p[0.015], pn = p[0.8], pa = p[2];
  ok(pl.back > 500 && pl.alt > 200, `de lluny a la perspectiva la càmera és a ${pl.back.toFixed(0)} m i ${pl.alt.toFixed(0)} m d'alçada`);
  ok(Math.abs(pn.back - 16.45) < 0.1, `al 80 % la càmera de perspectiva ha canviat (${pn.back.toFixed(2)} m)`);
  ok(pa.back < 7.5 && pa.back - 2.8 > 0.14*5.6 + 0.5, `de prop la càmera és a ${pa.back.toFixed(1)} m: o massa lluny o la popa toca el pla de prop`);
  console.log(`  perspectiva: càmera de ${pa.back.toFixed(1)} m (a prop) a ${pl.back.toFixed(0)} m i ${pl.alt.toFixed(0)} m d'alçada (lluny); al 80 %, ${pn.back.toFixed(1)} m com sempre`);
  ok(!errs.length, 'errors: ' + errs.join(' | '));
  await ctx.close();
}

// El lliscant va plegat dins el botó 🔍 (v27). Per a les proves 2 a 4 s'obre i no es
// plega sol; el plec té la seva prova (6).
const obreFix = pg => pg.evaluate(() => { ZOOM_PLEC.despres = ZOOM_PLEC.sensetocar = 1e9; obreZoom(); });

// 2) Lliscant amb el ratolí, i sincronització amb + i −, Z i la roda
{
  const { ctx, pg, errs } = await obre(400, 682);
  await obreFix(pg);
  const tr = await pg.evaluate(() => { const r = document.getElementById('zoomTrack').getBoundingClientRect(); return { x:r.left + r.width/2, t:r.top, b:r.bottom }; });
  const estat = () => pg.evaluate(() => { const k = document.getElementById('zoomKnob').getBoundingClientRect(), t = document.getElementById('zoomTrack').getBoundingClientRect();
    return { zt:cam.zt, kn:1 - ((k.top + k.height/2) - (t.top + 13))/(t.height - 26), s:sDeZoom(cam.zt), btn:document.getElementById('btnZoom').textContent, wx:S.wxT }; });
  const sinc = e => Math.abs(e.kn - e.s) < 0.02;
  // arrossegar de baix a dalt: el zoom creix sense salts enrere
  await pg.mouse.move(tr.x, tr.b - 13); await pg.mouse.down();
  let prev = 0, mono = true, e0 = await estat();
  for(let i=1;i<=20;i++){ await pg.mouse.move(tr.x, tr.b - 13 - (tr.b - tr.t - 26)*i/20); const e = await estat(); if(e.zt < prev - 1e-9) mono = false; prev = e.zt; }
  await pg.mouse.up();
  const e1 = await estat();
  ok(Math.abs(e0.zt - 0.015) < 0.002, `a baix de tot el zoom ha de ser el mínim (${e0.zt})`);
  ok(Math.abs(e1.zt - 2) < 0.02, `a dalt de tot el zoom ha de ser el màxim (${e1.zt})`);
  ok(mono, 'arrossegant amunt el zoom fa salts enrere');
  ok(sinc(e1), `el botó del lliscant no és on toca (${e1.kn.toFixed(3)} vs ${e1.s.toFixed(3)})`);
  // un clic al mig de la pista hi salta
  await pg.mouse.click(tr.x, (tr.t + tr.b)/2);
  const em = await estat();
  ok(Math.abs(em.s - 0.5) < 0.03, `un clic al mig de la pista no deixa el zoom al mig (${em.s.toFixed(3)})`);
  // el lliscant no mou el pes del patró (no arriba al llenç)
  await pg.evaluate(() => { entrarAlMar(); S.board = 1; S.wxT = 0.123; });
  await pg.mouse.move(tr.x, tr.t + 40); await pg.mouse.down(); await pg.mouse.move(tr.x, tr.b - 40); await pg.mouse.up();
  ok((await estat()).wx === 0.123, 'arrossegar el zoom ha mogut el pes del patró');
  // tecla Z: totes les parades, i el lliscant les segueix
  await pg.evaluate(() => posaZoom(0.8));
  const parades = [];
  for(let i=0;i<6;i++){ await pg.keyboard.press('z'); const e = await estat(); parades.push(+e.zt.toFixed(3)); ok(sinc(e), `tecla Z: el lliscant no segueix (${e.zt})`); }
  ok(parades.join() === '0.4,0.12,0.015,2,1.2,0.8', `parades de la Z: ${parades.join(', ')}`);
  ok((await estat()).btn.includes('80%'), 'el botó no diu 80 % després del cicle');
  // + i −
  await pg.click('#zoomMes'); let e = await estat();
  ok(Math.abs(e.zt - 1.2) < 1e-9 && sinc(e), `+ ha de multiplicar per 1,5 (${e.zt})`);
  await pg.click('#zoomMenys'); await pg.click('#zoomMenys'); e = await estat();
  ok(Math.abs(e.zt - 0.8/1.5) < 1e-9 && sinc(e), `− ha de dividir per 1,5 (${e.zt})`);
  for(let i=0;i<30;i++) await pg.click('#zoomMenys', { delay:0 });
  e = await estat(); ok(e.zt === 0.015 && sinc(e), `− no s'atura al mínim (${e.zt})`);
  for(let i=0;i<30;i++) await pg.click('#zoomMes', { delay:0 });
  e = await estat(); ok(e.zt === 2 && sinc(e), `+ no s'atura al màxim (${e.zt})`);
  // tecla Z i roda del ratolí damunt del mar
  await pg.evaluate(() => posaZoom(0.8));
  await pg.keyboard.press('z'); e = await estat();
  ok(Math.abs(e.zt - 0.4) < 1e-9 && sinc(e), `la Z no mou el lliscant (${e.zt})`);
  await pg.mouse.move(200, 400); await pg.mouse.wheel(0, -100); await espera(50); e = await estat();
  ok(Math.abs(e.zt - 0.46) < 1e-9 && sinc(e), `la roda amunt ha d'apropar un 15 % (${e.zt})`);
  await pg.mouse.wheel(0, 100); await espera(50); e = await estat();
  ok(Math.abs(e.zt - 0.4) < 1e-9 && sinc(e), `la roda avall ha d'allunyar (${e.zt})`);
  ok(!errs.length, 'errors: ' + errs.join(' | '));
  await ctx.close();
}

// 3) Amb el dit (esdeveniments tàctils de debò)
{
  const { ctx, pg, errs } = await obre(400, 682, true);
  const cdp = await ctx.newCDPSession(pg);
  await obreFix(pg);
  const tr = await pg.evaluate(() => { const r = document.getElementById('zoomTrack').getBoundingClientRect(); return { x:r.left + r.width/2, t:r.top, b:r.bottom }; });
  const toca = (type, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type==='touchEnd' ? [] : [{ x:tr.x, y }] });
  await toca('touchStart', tr.t + 13);
  for(let i=1;i<=10;i++) await toca('touchMove', tr.t + 13 + (tr.b - tr.t - 26)*i/10);
  await toca('touchEnd');
  const zt = await pg.evaluate(() => cam.zt);
  ok(Math.abs(zt - 0.015) < 0.002, `amb el dit, de dalt a baix el zoom ha d'acabar al mínim (${zt})`);
  await toca('touchStart', (tr.t + tr.b)/2); await toca('touchEnd');
  const s = await pg.evaluate(() => sDeZoom(cam.zt));
  ok(Math.abs(s - 0.5) < 0.03, `un toc al mig no deixa el zoom al mig (${s.toFixed(3)})`);
  ok(!errs.length, 'errors: ' + errs.join(' | '));
  await ctx.close();
}

// 3b) Pessic amb dos dits, a les tres vistes, sense disparar cap altre control
{
  const { ctx, pg, errs } = await obre(400, 682, true);
  const cdp = await ctx.newCDPSession(pg);
  const toc = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x:p[0], y:p[1], id:p[2] ?? i })) });
  const est = () => pg.evaluate(() => { const k = document.getElementById('zoomKnob').getBoundingClientRect(), t = document.getElementById('zoomTrack').getBoundingClientRect();
    return { zt:cam.zt, kn:1 - ((k.top + k.height/2) - (t.top + 13))/(t.height - 26), s:sDeZoom(cam.zt), wx:S.wxT, wf:S.wfT, px:S.px, py:S.py, h:S.heading, sheet:S.sheet, joy:joySt.id, mode:S.mode,
      obert:zoomObert(), btn:document.getElementById('btnZoom').textContent }; });
  // el pessic va amb el lliscant plegat; en obrir-lo, el botó ha de ser on toca
  const knObert = () => pg.evaluate(() => { obreZoom(); const k = document.getElementById('zoomKnob').getBoundingClientRect(), t = document.getElementById('zoomTrack').getBoundingClientRect();
    const d = Math.abs(1 - ((k.top + k.height/2) - (t.top + 13))/(t.height - 26) - sDeZoom(cam.zt)); plegaZoom(); return d; });
  // separa (o ajunta) dos dits en 10 passos; el primer, damunt del patró
  async function pessiga(c, d0, d1){
    const p = d => [[c.x, c.y - d/2, 1], [c.x, c.y + d/2, 2]];
    await toc('touchStart', [p(d0)[0]]); await espera(30);
    await toc('touchStart', p(d0));
    for(let i=1;i<=10;i++) await toc('touchMove', p(d0 + (d1 - d0)*i/10));
    await toc('touchEnd', [p(d1)[1]]); await toc('touchEnd', []);
  }
  for(const [mar, mode] of [[0,'popa'],[1,'popa'],[1,'nord'],[1,'persp']]){
    const c = await pg.evaluate(async ([mar, mode]) => {
      if(mar && S.mode!=='mar'){ entrarAlMar(); S.board = 1; }
      while(cam.mode!==mode) toggleCamMode();
      posaZoom(0.8); cam.z = 0.8; S.wxT = 0.3; S.wfT = -0.2;
      await new Promise(q => setTimeout(q, 300));
      const p = w2s({x:S.px, y:S.py});
      return mode === 'persp' ? { x:innerWidth/2, y:innerHeight*0.45 } : { x:p.x, y:p.y };
    }, [mar, mode]);
    const nom = `${mar?'mar':'platja'} ${mode}`;
    const a = await est();
    await pessiga(c, 80, 160);
    const e1 = await est();
    ok(Math.abs(e1.zt/0.8 - 2) < 0.04, `${nom}: separar els dits el doble havia de fer zoom ×2 (${(e1.zt/0.8).toFixed(2)})`);
    ok(!e1.obert, `${nom}: el pessic ha desplegat el lliscant`);
    ok(e1.btn === '🔍 ' + Math.round(e1.zt*100) + '%', `${nom}: el botó no diu el zoom del pessic (${e1.btn})`);
    ok(await knObert() < 0.02, `${nom}: en obrir-lo, el lliscant no és on l'ha deixat el pessic`);
    ok(e1.wx === a.wx && e1.wf === a.wf, `${nom}: el pessic ha mogut el pes (${a.wx},${a.wf} → ${e1.wx},${e1.wf})`);
    // a la platja el primer dit, damunt del patí, l'hauria arrossegat (navegant es mou tot sol)
    if(!mar) ok(e1.px === a.px && e1.py === a.py && e1.h === a.h, `${nom}: el pessic ha mogut o girat el patí`);
    ok(e1.joy === null && e1.mode === a.mode, `${nom}: el pessic ha disparat el joystick o ha fet sortir el patí`);
    await pg.evaluate(() => posaZoom(0.1));
    const mig = { x:200, y:280 };              // lluny dels botons: a la platja, ENTRAR AL MAR comença a y≈470
    await pessiga(mig, 300, 30);
    const e2 = await est();
    ok(Math.abs(e2.zt - 0.015) < 1e-9, `${nom}: ajuntar molt els dits ha d'aturar-se al mínim (${e2.zt})`);
    await pg.evaluate(() => posaZoom(0.5));
    await pessiga(mig, 20, 330);
    ok((await est()).zt === 2, `${nom}: separar molt els dits ha d'aturar-se al màxim`);
  }
  // un dit a l'escota i l'altre al mar: l'escota funciona i no hi ha pessic
  await pg.evaluate(() => { posaZoom(0.8); cam.z = 0.8; S.sheet = 0.5; while(cam.mode!=='popa') toggleCamMode(); });
  const tr = await pg.evaluate(() => { const r = document.getElementById('escotaTrack').getBoundingClientRect(); return { x:r.left + r.width/2, t:r.top, b:r.bottom }; });
  await toc('touchStart', [[tr.x, (tr.t + tr.b)/2, 1]]);
  await toc('touchStart', [[tr.x, (tr.t + tr.b)/2, 1], [150, 300, 2]]);
  for(let i=1;i<=8;i++) await toc('touchMove', [[tr.x, (tr.t + tr.b)/2 + i*10, 1], [150, 300 - i*25, 2]]);
  await toc('touchEnd', [[150, 100, 2]]); await toc('touchEnd', []);
  const ee = await est();
  ok(ee.zt === 0.8, `un dit a l'escota i un altre al mar no ha de fer zoom (${ee.zt})`);
  ok(ee.sheet > 0.55, `amb un altre dit al mar, l'escota ha de continuar responent (${ee.sheet.toFixed(2)})`);
  // un dit al joystick de la perspectiva i l'altre al mar: tampoc
  await pg.evaluate(() => { while(cam.mode!=='persp') toggleCamMode(); });
  await espera(300);
  const jr = await pg.evaluate(() => { const r = document.getElementById('joy').getBoundingClientRect(); return { x:r.left + r.width/2, y:r.top + r.height/2 }; });
  await toc('touchStart', [[jr.x, jr.y, 1]]);
  await toc('touchStart', [[jr.x, jr.y, 1], [200, 250, 2]]);
  for(let i=1;i<=8;i++) await toc('touchMove', [[jr.x + i*3, jr.y, 1], [200, 250 - i*15, 2]]);
  const ej = await est();
  await toc('touchEnd', [[200, 130, 2]]); await toc('touchEnd', []);
  ok(ej.zt === 0.8, `un dit al joystick i un altre al mar no ha de fer zoom (${ej.zt})`);
  ok(ej.joy !== null && ej.wx > 0.4, `amb un altre dit al mar, el joystick ha de continuar responent (${ej.wx})`);
  ok(!errs.length, 'errors: ' + errs.join(' | '));
  await ctx.close();
}

const llocs = [];
// 4) Lloc a la pantalla: dins l'iframe d'OcataVent (barra de 58 px) amb mòbils de
// 400×740, 360×640 i 320×568, desplegat sota el 🔍 sense tapar cap control. El rumb i
// la velocitat sí que els pot tapar un moment.
for(const [w, h] of [[400, 682], [360, 682], [360, 582], [320, 510]]){
  const { ctx, pg, errs } = await obre(w, h);
  await obreFix(pg);
  for(const [mar, mode, pal] of [[0,'popa',0],[1,'popa',0],[1,'nord',0],[1,'persp',0],[1,'popa',1],[1,'persp',1]]){
    const r = await pg.evaluate(async ([mar, mode, pal]) => {
      if(mar && S.mode!=='mar'){ entrarAlMar(); S.board = 1; }
      while(cam.mode!==mode) toggleCamMode();
      joyZen = mar && mode!=='persp';
      const rb = document.getElementById('rakeBox');
      if(!!pal === rb.classList.contains('min')) document.getElementById('rakeToggle').click();
      await new Promise(q => setTimeout(q, 500));
      obreZoom();
      const R = id => { const e = document.getElementById(id), cs = getComputedStyle(e); if(cs.display==='none' || cs.visibility==='hidden') return null;
        const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2 ? r : null; };
      const z = R('zoomBox'), t = R('zoomTrack'), xoca = [];
      for(const id of ['rakeBox','joy','btnJoy','escotaBox','diag','btnEntrar','btnMapa','botons'])
        { const c = R(id); if(c && Math.min(z.right,c.right) > Math.max(z.left,c.left) && Math.min(z.bottom,c.bottom) > Math.max(z.top,c.top)) xoca.push(id); }
      const ro = rosaPos();
      if(z.top < ro.cy + ro.r + 30 && z.left < ro.cx + ro.r) xoca.push('rosa');
      const bz = document.getElementById('btnZoom').getBoundingClientRect();
      return { xoca, dins: z.top >= 0 && z.bottom <= innerHeight && z.right <= innerWidth, pista: t.height,
        sota: Math.abs((z.left + z.right)/2 - (bz.left + bz.right)/2) < 20 && z.top - bz.bottom < 12 };
    }, [mar, mode, pal]);
    const nom = `${w}×${h} ${mar?'mar':'platja'} ${mode}${pal?' amb el pal obert':''}`;
    llocs.push(`${nom}: ${r.sota ? 'sota el 🔍' : 'columna esquerra'}, pista ${r.pista} px`);
    ok(r.dins, `${nom}: el lliscant surt de la pantalla`);
    ok(!r.xoca.length, `${nom}: el lliscant tapa ${r.xoca.join(', ')}`);
    ok(r.pista >= 80, `${nom}: pista massa curta (${r.pista} px)`);
  }
  ok(!errs.length, `${w}×${h}: errors: ` + errs.join(' | '));
  await ctx.close();
}

// 5) Als dos extrems, navegant: res no finit, cap error, i un temps de dibuix raonable
{
  const { ctx, pg, errs } = await obre(400, 682);
  await pg.evaluate(() => { entrarAlMar(); S.board = 1; S.windKn = 12; S.windFrom = 90*D2R; S.sheet = 0.4;
    S.px = 0; S.py = shoreFn(0) - 150*(L/5.6); S.heading = 30*D2R; S.speed = 0.8; });
  const temps = {};
  for(const mode of ['popa','nord','persp']) for(const z of [0.015, 0.8, 2]){
    const r = await pg.evaluate(async ([mode, z]) => {
      while(cam.mode!==mode) toggleCamMode();
      posaZoom(z);
      const n0 = window.__nan;
      // virant: el rumb canvia mentre la càmera el segueix (a prop, la popa ve cap a la càmera)
      const h0 = S.heading;
      for(let i=0;i<90;i++){ S.heading = h0 + Math.sin(i/90*Math.PI*2)*0.9; await new Promise(q => requestAnimationFrame(q)); }
      const t = []; for(let i=0;i<15;i++){ const a = performance.now(); renderWorld(1/60); t.push(performance.now() - a); }
      t.sort((a,b) => a-b);
      const fin = [S.px, S.py, S.speed, S.heading, cam.x, cam.y, cam.z, cam.rot].every(Number.isFinite);
      return { nan: window.__nan - n0, fin, z:cam.z, ms:t[7], kn:S.speed*6, mar:S.mode };
    }, [mode, z]);
    temps[mode + z] = r.ms;
    const nom = `${mode} a ${z}`;
    ok(r.nan === 0, `${nom}: ${r.nan} crides de dibuix amb números no finits`);
    ok(r.fin, `${nom}: estat no finit`);
    ok(Math.abs(r.z/z - 1) < 0.05, `${nom}: la càmera no hi arriba (${r.z.toFixed(3)})`);
    ok(r.mar === 'mar' && r.kn > 0.5, `${nom}: el patí no navega (${r.kn.toFixed(1)} kn)`);
  }
  for(const mode of ['popa','nord','persp']) for(const z of [0.015, 2]){
    const t = temps[mode + z], t0 = temps[mode + 0.8];
    ok(t <= t0*4 + 6, `${mode} a ${z}: dibuixar costa ${t.toFixed(1)} ms (al 80 %, ${t0.toFixed(1)} ms)`);
  }
  console.log('  temps de dibuix (ms, mediana): ' + Object.entries(temps).map(([k,v]) => `${k} ${v.toFixed(1)}`).join(' · '));
  ok(!errs.length, 'errors: ' + errs.join(' | '));
  await ctx.close();
}

// 6) Plegat (v27): el 🔍 el desplega i es plega sol, o en tocar a fora
{
  const { ctx, pg, errs } = await obre(400, 682, true);
  const cdp = await ctx.newCDPSession(pg);
  const toc = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x:p[0], y:p[1], id:p[2] ?? i })) });
  const tap = async (x, y) => { await toc('touchStart', [[x, y]]); await toc('touchEnd', []); await espera(40); };
  const centre = id => pg.evaluate(id => { const r = document.getElementById(id).getBoundingClientRect(); return { x:r.left + r.width/2, y:r.top + r.height/2, t:r.top, b:r.bottom }; }, id);
  const obert = () => pg.evaluate(() => zoomObert());
  const ms = await pg.evaluate(() => ZOOM_PLEC);
  await pg.evaluate(() => { entrarAlMar(); S.board = 1; joyZen = false; });
  ok(!(await obert()) && await pg.evaluate(() => getComputedStyle(document.getElementById('zoomBox')).display) === 'none', 'de sortida el lliscant ha d\'estar plegat');
  const bz = await centre('btnZoom');
  await tap(bz.x, bz.y);
  ok(await obert() && await pg.evaluate(() => document.getElementById('btnZoom').classList.contains('on')), 'el 🔍 no desplega el lliscant');
  await tap(bz.x, bz.y);
  ok(!(await obert()), 'tornar a tocar el 🔍 no el plega');
  // arrossegar: mentre el dit hi és no es plega; en deixar-lo anar, al cap de 1,5 s sí
  await tap(bz.x, bz.y);
  const tr = await centre('zoomTrack');
  await toc('touchStart', [[tr.x, tr.t + 20]]);
  for(let i=1;i<=6;i++){ await toc('touchMove', [[tr.x, tr.t + 20 + i*12]]); await espera(400); }   // 2,4 s amb el dit
  const zArr = await pg.evaluate(() => cam.zt);
  ok(await obert(), 'el lliscant s\'ha plegat amb el dit a sobre');
  await toc('touchEnd', []);
  await espera(ms.despres - 500);
  ok(await obert(), `s'ha plegat abans de ${ms.despres/1000} s`);
  await espera(800);
  ok(!(await obert()), `${ms.despres/1000} s després de deixar-lo anar no s'ha plegat`);
  ok(Math.abs(await pg.evaluate(() => cam.zt) - zArr) < 1e-9 && zArr < 0.8, 'plegar-lo ha canviat el zoom');
  // obert i sense tocar: es plega als 4 s
  await tap(bz.x, bz.y); await espera(ms.sensetocar - 600);
  ok(await obert(), 'sense tocar-lo s\'ha plegat massa aviat');
  await espera(900);
  ok(!(await obert()), 'sense tocar-lo no s\'ha plegat');
  // + : torna a comptar 1,5 s
  await tap(bz.x, bz.y); const z0 = await pg.evaluate(() => cam.zt);
  const mes = await centre('zoomMes'); await tap(mes.x, mes.y);
  ok(Math.abs(await pg.evaluate(() => cam.zt) - z0*1.5) < 1e-9, 'el + no ha apropat');
  await espera(ms.despres + 300);
  ok(!(await obert()), 'després del + no s\'ha plegat');
  // tocar a fora el plega, i el toc fa igualment la seva feina (aquí, l'escota)
  await tap(bz.x, bz.y);
  await pg.evaluate(() => { S.sheet = 0.2; });
  const es = await centre('escotaTrack');
  await tap(es.x, es.b - 10);
  const sh = await pg.evaluate(() => S.sheet);
  ok(!(await obert()), 'tocar l\'escota no ha plegat el zoom');
  ok(sh > 0.9, `tocar l'escota amb el zoom obert no ha mogut l'escota (${sh.toFixed(2)})`);
  await tap(bz.x, bz.y); await tap(200, 300);
  ok(!(await obert()), 'tocar el mar no ha plegat el zoom');
  ok(!errs.length, 'errors: ' + errs.join(' | '));
  await ctx.close();
}
// roda i tecla Z amb el lliscant plegat
{
  const { ctx, pg, errs } = await obre(400, 682);
  await pg.evaluate(() => posaZoom(0.8));
  await pg.mouse.move(200, 400); await pg.mouse.wheel(0, -100); await espera(50);
  const r = await pg.evaluate(() => ({ zt:cam.zt, obert:zoomObert(), btn:document.getElementById('btnZoom').textContent }));
  ok(Math.abs(r.zt - 0.92) < 1e-9 && !r.obert && r.btn === '🔍 92%', `la roda amb el lliscant plegat (${r.zt}, ${r.btn}, obert ${r.obert})`);
  await pg.keyboard.press('z');
  ok(await pg.evaluate(() => cam.zt === 0.8 && !zoomObert()), 'la Z amb el lliscant plegat');
  ok(!errs.length, 'errors: ' + errs.join(' | '));
  await ctx.close();
}

await b.close();
console.log('  on es desplega el lliscant:\n    ' + llocs.join('\n    '));
console.log(fall ? `\n═══ ${fall} de ${n} COMPROVACIONS FALLEN ✗ ═══` : `\n═══ EL ZOOM VA DE 600 m AL PATÍ, AMB EL DIT I EL RATOLÍ (${n}) ✔ ═══`);
process.exit(fall ? 1 : 0);
