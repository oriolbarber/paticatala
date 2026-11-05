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
  // sense tocar res, el patí aguanta el través i el repte se supera
  await pg.waitForFunction(() => document.getElementById('ovSuperat').classList.contains('on'), null, { timeout:15000 }).catch(() => {});
  ok(await pg.isVisible('#ovSuperat'), 'el repte se supera sol en uns 5 s i surt la pantalla de superat');
  ok(/SEGÜENT/.test(await pg.textContent('#btnSeguent')), `ofereix el següent: «${(await pg.textContent('#btnSeguent')).trim()}»`);
  await pg.screenshot({ path:`z_reptes_${w}_5_superat.png` });
  await pg.click('#btnSupMapa'); await pg.waitForTimeout(250);
  const n2 = await pg.evaluate(() => document.querySelector('#itinMapa .node[data-id="cenyida"]').className);
  ok(!/bloq/.test(n2), 'en tornar al mapa, el nivell 2 ja és obert');
  await pg.screenshot({ path:`z_reptes_${w}_6_mapa_progres.png` });
  // una regata de mar obert carregada des del mapa
  await pg.click('#itinMapa .node[data-id="equilater"]'); await pg.waitForTimeout(150);
  await pg.click('#btnNavega'); await pg.waitForTimeout(600);
  const r = await pg.evaluate(() => ({ fase:REG.fase, mode:S.mode, oberts:document.querySelectorAll('.overlay.on').length,
    barra:document.getElementById('repteTitol').textContent }));
  ok(r.fase === 'preparats' && r.mode === 'mar' && r.oberts === 0, `regata de mar obert: a la línia i a punt (${r.barra})`);
  await pg.screenshot({ path:`z_reptes_${w}_7_regata.png` });
  await pg.close();
}
await b.close();
console.log(errors ? `\n${errors} ERRORS DE JAVASCRIPT ✗` : '');
console.log(fall || errors ? `\n${fall} FALLADES ✗` : '\nTot correcte ✔');
process.exit(fall || errors ? 1 : 0);
