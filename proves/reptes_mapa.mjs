// MAPA DE REPTES (Chromium): el camí de nivells es veu sencer i sense desbordar a
// 400×740 i 360×740, el botó 🏆 és a la fila de dalt sense trepitjar la rosa, i
// tocar un repte → NAVEGA deixa el patí navegant a la situació del repte.
// Desa captures z_reptes_*.png per mirar-les.
import { chromium } from 'playwright';
import path from 'path';
const URL = 'file://' + path.resolve('pati_vela_mobil.html');
const b = await chromium.launch({ executablePath: process.env.CHROME });
let fall = 0, errors = 0;
const ok = (c, t) => { if(!c) fall++; console.log(`  ${c ? '✔' : '✗'} ${t}`); };

for(const [w, h] of [[400, 740], [360, 740]]){
  console.log(`\n${w}×${h}\n`);
  const pg = await b.newPage({ viewport:{ width:w, height:h }, deviceScaleFactor:2, hasTouch:true });
  // vibració comptada, colors que pinta el llenç i una clau d'una altra app al mateix origen
  await pg.addInitScript(() => {
    window.__vib = 0; navigator.vibrate = () => (window.__vib++, true);
    const d = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'fillStyle');
    Object.defineProperty(CanvasRenderingContext2D.prototype, 'fillStyle', { configurable:true,
      get(){ return d.get.call(this); },
      set(v){ if(window.__fs && typeof v === 'string') window.__fs.add(v.replace(/\s/g, '')); d.set.call(this, v); } });
    if(!localStorage.getItem('ocatavent.prova')) localStorage.setItem('ocatavent.prova', 'no tocar');
  });
  pg.on('pageerror', e => { errors++; console.log('  ERROR DE PÀGINA:', e.message); });
  await pg.goto(URL, { waitUntil:'load' }); await pg.waitForTimeout(600);
  ok(await pg.isVisible('#btnGuiaReptes'), 'la pantalla d\'inici ofereix els reptes per nivells');
  await pg.click('#btnComencar'); await pg.waitForTimeout(200);

  // el botó 🏆 a la fila de dalt
  const fila = await pg.evaluate(() => {
    const r = document.getElementById('btnItin').getBoundingClientRect();
    const f = document.getElementById('botons').getBoundingClientRect(), p = rosaPos();
    return { r:{l:r.left, w:r.width}, f:{l:f.left, r:f.right, t:f.top, b:f.bottom},
             rosa:{l:p.cx-p.r-9, r:p.cx+p.r+9, t:p.cy-p.r-9, b:p.cy+p.r+9} };
  });
  const solapa = !(fila.f.r < fila.rosa.l || fila.f.l > fila.rosa.r || fila.f.b < fila.rosa.t || fila.f.t > fila.rosa.b);
  ok(fila.r.w >= 34 && fila.r.l >= 0, `botó 🏆 visible a la fila de dalt, com a mínim 34 px com ⚙️ (${Math.round(fila.r.w)} px)`);
  ok(!solapa, 'la fila de botons no trepitja la rosa dels vents');
  await pg.screenshot({ path:`z_reptes_${w}_0_hud.png` });

  // el mapa
  await pg.click('#btnItin'); await pg.waitForTimeout(300);
  const m = await pg.evaluate(() => {
    const c = document.querySelector('#ovReptes .caixa'), cr = c.getBoundingClientRect();
    const nodes = [...document.querySelectorAll('#itinMapa .node')].map(n => {
      const r = n.querySelector('.bola').getBoundingClientRect(), e = n.querySelector('.et').getBoundingClientRect();
      return { cls:n.className, l:Math.min(r.left, e.left), r:Math.max(r.right, e.right), w:r.width };
    });
    return { n:nodes.length, nodes, cl:cr.left, cr:cr.right, sw:c.scrollWidth, cw:c.clientWidth,
             doc:document.documentElement.scrollWidth };
  });
  ok(m.n === 11, `11 reptes al camí (${m.n})`);
  ok(m.nodes.every(n => n.l >= m.cl && n.r <= m.cr), 'cap node ni etiqueta surt de la caixa');
  ok(m.sw <= m.cw + 1 && m.doc <= w, `sense desplaçament horitzontal (caixa ${m.sw}/${m.cw}, pàgina ${m.doc}/${w})`);
  ok(m.nodes.every(n => n.w >= 44), 'nodes de 64 px: fàcils de tocar amb el dit');
  ok(m.nodes[0].cls.includes('actual') && m.nodes.filter(n => n.cls.includes('bloq')).length === 9,
     'al principi: 1 per començar, 1 disponible i 9 bloquejats');
  await pg.screenshot({ path:`z_reptes_${w}_1_mapa.png` });
  await pg.evaluate(() => document.querySelector('#ovReptes .caixa').scrollTop = 1e4);
  await pg.waitForTimeout(100);
  await pg.screenshot({ path:`z_reptes_${w}_2_mapa_final.png` });

  // fitxa d'un repte i càrrega de la situació
  await pg.evaluate(() => document.querySelector('#ovReptes .caixa').scrollTop = 0);
  await pg.click('#itinMapa .node[data-id="traves"]'); await pg.waitForTimeout(200);
  ok(await pg.isVisible('#ovFitxa') && (await pg.textContent('#fitxaNom')) === 'Rumb de través', 'tocar un node obre la seva fitxa');
  await pg.screenshot({ path:`z_reptes_${w}_3_fitxa.png` });
  await pg.click('#btnNavega'); await pg.waitForTimeout(700);
  const s = await pg.evaluate(() => ({ mode:S.mode, kn:S.windKn, rel:Math.abs(normA(S.heading - S.windFrom))*R2D,
    oberts:[...document.querySelectorAll('.overlay.on')].map(e => e.id), barra:document.getElementById('repteTitol').textContent,
    v:S.speed*6 }));
  ok(s.mode === 'mar' && s.kn === 8 && s.oberts.length === 0, `NAVEGA: a l'aigua, 8 kn, cap finestra oberta (${s.oberts.join(',') || '—'})`);
  ok(s.v > 2, `ja navega: ${s.v.toFixed(1)} kn als 0,7 s`);
  ok(/N1 · Rumb de través/.test(s.barra), `barra del repte: «${s.barra}»`);
  await pg.screenshot({ path:`z_reptes_${w}_4_navegant.png` });
  // v31: comença 20° desviat; un «patró» al navegador el porta a la franja i l'aguanta 15 s
  ok(Math.abs(s.rel - 90) > 19 && Math.abs(s.rel - 90) < 21, `comença desviat: ${s.rel.toFixed(0)}° (objectiu 80-100°)`);
  const t0 = Date.now();
  await pg.evaluate(() => { window.__pilot = setInterval(() => {
    const e = Math.abs(normA(S.heading - S.windFrom))*R2D - 90; S.wfT = Math.max(-1, Math.min(1, 0.05*e)); }, 50); });
  await pg.waitForFunction(() => document.getElementById('ovSuperat').classList.contains('on'), null, { timeout:40000 }).catch(() => {});
  await pg.evaluate(() => clearInterval(window.__pilot));
  const tSup = (Date.now() - t0)/1000;
  ok(await pg.isVisible('#ovSuperat') && tSup >= 15, `corregint el rumb se supera en ${tSup.toFixed(1)} s (cal aguantar-ne 15 dins la franja)`);
  ok(/SEGÜENT/.test(await pg.textContent('#btnSeguent')), `ofereix el següent: «${(await pg.textContent('#btnSeguent')).trim()}»`);
  const vic = await pg.evaluate(() => {
    const cv = document.getElementById('confeti'), g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data;
    let n = 0; for(let i = 3; i < d.length; i += 4*37) if(d[i] > 0) n++;
    return { conf:getComputedStyle(cv).display, pix:n, color:document.getElementById('supColor').textContent,
             vib:window.__vib, ac:!!ITIN._ac, desat:localStorage.getItem('paticatala.reptes') };
  });
  ok(vic.conf === 'block' && vic.pix > 20, `purpurina al llenç (${vic.pix} mostres pintades)`);
  ok(vic.vib === 1 && vic.ac, `vibració (${vic.vib}) i so de WebAudio (AudioContext ${vic.ac ? 'creat' : 'no'})`);
  ok(/Blau marí/.test(vic.color), `la victòria ensenya el color nou: «${vic.color.replace(/\s+/g, ' ').trim()}»`);
  ok(/"traves"/.test(vic.desat || ''), 'el progrés es desa a localStorage («paticatala.reptes»)');
  await pg.screenshot({ path:`z_reptes_${w}_5_superat.png` });
  await pg.click('#btnSupMapa'); await pg.waitForTimeout(250);
  const n2 = await pg.evaluate(() => document.querySelector('#itinMapa .node[data-id="cenyida"]').className);
  ok(!/bloq/.test(n2), 'en tornar al mapa, el nivell 2 ja és obert');
  await pg.screenshot({ path:`z_reptes_${w}_6_mapa_progres.png` });

  // selector de colors: el blau marí guanyat, la resta amb cadenat; i el vermell del canal
  await pg.evaluate(() => { ITIN.fets.add('canal'); renderItin(); document.getElementById('itinColors').scrollIntoView({ block:'center' }); });
  await pg.waitForTimeout(150);
  const sel = await pg.evaluate(() => {
    const g = document.getElementById('itinColors'), gr = g.getBoundingClientRect(), c = document.querySelector('#ovReptes .caixa').getBoundingClientRect();
    const ms = [...g.querySelectorAll('.mostra')];
    return { n:ms.length, bloq:ms.filter(m => m.classList.contains('bloq')).length, dins:gr.left >= c.left && gr.right <= c.right,
             w:Math.min(...ms.map(m => m.getBoundingClientRect().width)) };
  });
  ok(sel.n === 17 && sel.bloq === 13 && sel.dins && sel.w >= 36, `selector: 17 mostres (${sel.n - sel.bloq} obertes, ${sel.bloq} amb cadenat), de ${sel.w} px, dins la caixa`);
  await pg.click('#itinColors .mostra[data-col="lila"]'); await pg.waitForTimeout(100);
  ok(/🔒 Lila: supera «Triangle olímpic»/.test(await pg.textContent('#itinColorTriat')) &&
     await pg.evaluate(() => ITIN.color) === 'fusta', 'tocar un color bloquejat diu com guanyar-lo i no el posa');
  await pg.click('#itinColors .mostra[data-col="vermell"]'); await pg.waitForTimeout(150);
  await pg.screenshot({ path:`z_reptes_${w}_8_colors.png` });
  // el color als laterals de les tres vistes: tons vermells que pinta el llenç
  const vermells = async (col) => pg.evaluate(async (col) => {
    aplicaColorBuc(col); tancaTot(); const out = {};
    for(const mode of ['popa', 'nord', 'persp']){
      cam.mode = mode; window.__fs = new Set(); await new Promise(r => setTimeout(r, 350));
      out[mode] = [...window.__fs].filter(s => { const m = /^rgb\((\d+),(\d+),(\d+)\)$/.exec(s); return m && +m[1] > 60 && +m[1] > 2.5*+m[2]; }).length;
    }
    cam.mode = 'popa'; return out;
  }, col);
  const fus = await vermells('fusta'), ver = await vermells('vermell');
  ok(['popa', 'nord', 'persp'].every(v => ver[v] >= fus[v] + 8),
     `laterals vermells a les tres vistes (tons vermells pintats: popa ${fus.popa}→${ver.popa}, nord ${fus.nord}→${ver.nord}, perspectiva ${fus.persp}→${ver.persp})`);
  await pg.evaluate(() => { cam.mode = 'persp'; }); await pg.waitForTimeout(500);
  await pg.screenshot({ path:`z_reptes_${w}_9_buc_vermell.png` });
  await pg.evaluate(() => { cam.mode = 'popa'; });

  // persistència real: es tanca i es torna a obrir, amb so silenciat i el vermell posat
  await pg.evaluate(() => { triaColor('vermell'); obreItin(); });
  await pg.click('#btnSoMapa'); await pg.waitForTimeout(100);
  await pg.reload({ waitUntil:'load' }); await pg.waitForTimeout(600);
  const re = await pg.evaluate(() => ({ fets:[...ITIN.fets].sort().join(), color:ITIN.color, so:ITIN.so, pinta:PINTA_BUC.clar,
                                        ocata:localStorage.getItem('ocatavent.prova'), claus:localStorage.length }));
  ok(re.fets === 'canal,traves' && re.color === 'vermell' && re.so === false && re.pinta === '#c8302a',
     `en tornar a obrir: reptes ${re.fets}, color ${re.color}, so ${re.so ? 'sí' : 'no'}`);
  ok(re.ocata === 'no tocar' && re.claus === 2, `la clau de l'OcataVent és intacta (${re.claus} claus a l'origen)`);
  await pg.click('#btnComencar'); await pg.waitForTimeout(150);

  // un circuit de prop gran, al mapa
  await pg.evaluate(() => carregaRepte('triangle')); await pg.waitForTimeout(400);
  const r = await pg.evaluate(() => ({ fase:REG.fase, mode:S.mode, oberts:document.querySelectorAll('.overlay.on').length,
    barra:document.getElementById('repteTitol').textContent, b1:Math.round(Math.hypot(REG.marques[0].p[0]-REG.linia.p0[0], REG.marques[0].p[1]-REG.linia.p0[1])/(L/5.6)) }));
  ok(r.fase === 'preparats' && r.mode === 'mar' && r.oberts === 0, `triangle olímpic: a la línia i a punt (B1 a ${r.b1} m)`);
  await pg.click('#btnMapa'); await pg.waitForTimeout(400);
  await pg.screenshot({ path:`z_reptes_${w}_7_circuit_gran.png` });
  await pg.close();
}
await b.close();
console.log(errors ? `\n${errors} ERRORS DE JAVASCRIPT ✗` : '');
console.log(fall || errors ? `\n${fall} FALLADES ✗` : '\nTot correcte ✔');
process.exit(fall || errors ? 1 : 0);
