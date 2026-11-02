// BOTÓ DE TORNADA: comprova que només surt quan s'obre des de l'app, que no
// trepitja la rosa dels vents en cap format de pantalla, i que la tornada
// funciona de debò (app → simulador → app).
import { chromium } from 'playwright';
import path from 'path';
const DEMO = 'file://' + path.resolve('demo');
const b = await chromium.launch({ executablePath: process.env.CHROME });
let fall = 0;
const ok=(c,t)=>{ if(!c) fall++; console.log(`  ${c?'✔':'✗'} ${t}`); };

console.log('BOTÓ DE TORNADA A L\'APP\n');

// 1) sense el paràmetre no hi ha botó
{
  const pg = await b.newPage({ viewport:{width:390,height:844} });
  await pg.goto(DEMO + '/simulador.html', {waitUntil:'load'}); await pg.waitForTimeout(500);
  const vis = await pg.isVisible('#btnTornar');
  ok(!vis, "sense ?tornar el botó no existeix (versió d'aula i PWA intactes)");
  await pg.close();
}
// 2) amb el paràmetre hi és, i no xoca amb res a cap format
const FORMATS = [['mòbil petit',320,568],['mòbil vertical',390,844],
                 ['mòbil apaïsat',844,390],['PC',1280,800]];
for(const [nom,w,h] of FORMATS){
  const pg = await b.newPage({ viewport:{width:w,height:h} });
  await pg.goto(DEMO + '/simulador.html?tornar=./&nom=Ocata Vent', {waitUntil:'load'});
  await pg.waitForTimeout(600);
  await pg.evaluate(()=>document.getElementById('ovGuia').classList.remove('on'));
  await pg.waitForTimeout(200);
  const r = await pg.evaluate(()=>{
    const b = document.getElementById('btnTornar').getBoundingClientRect();
    const f = document.getElementById('botons').getBoundingClientRect();
    const p = rosaPos();
    return {b:{l:b.left,t:b.top,w:b.width,h:b.height}, f:{l:f.left,r:f.right,t:f.top,b:f.bottom},
            rosa:{l:p.cx-p.r-9, r:p.cx+p.r+9, t:p.cy-p.r-9, b:p.cy+p.r+9},
            rosaText:p.cy+p.r+34,   // les lectures de vent i rumb, sota el disc
            pal:document.getElementById('rakeBox').getBoundingClientRect().top,
            txt:document.getElementById('btnTornar').textContent};
  });
  const solapa = !(r.f.r < r.rosa.l || r.f.l > r.rosa.r || r.f.b < r.rosa.t || r.f.t > r.rosa.b);
  ok(r.b.w>20 && r.b.l>=0, `${nom.padEnd(15)} · botó visible (${Math.round(r.b.w)}×${Math.round(r.b.h)} px, «${r.txt}»)`);
  ok(!solapa, `${nom.padEnd(15)} · la fila de botons no trepitja la rosa dels vents`);
  ok(r.b.t >= r.rosaText - 1 && r.b.t + r.b.h <= r.pal + 1,
     `${nom.padEnd(15)} · el botó cap entre les lectures de la rosa (${Math.round(r.rosaText)}) i el pal (${Math.round(r.pal)})`);
  await pg.close();
}
// 3) la tornada funciona: app → simulador → app
{
  const pg = await b.newPage({ viewport:{width:390,height:844} });
  await pg.goto(DEMO + '/index.html', {waitUntil:'load'});
  await pg.click('#aSim'); await pg.waitForTimeout(900);
  const alSim = await pg.title();
  await pg.evaluate(()=>document.getElementById('ovGuia').classList.remove('on'));
  await pg.click('#btnTornar'); await pg.waitForTimeout(700);
  const tornat = await pg.textContent('#titol').catch(()=>null);
  ok(/Patí de Vela/.test(alSim), 'des de l\'app s\'obre el simulador a la mateixa finestra');
  ok(tornat === 'Ocata Vent', 'el botó torna a l\'app (sense obrir cap navegador)');
  await pg.close();
}
await b.close();
console.log(fall ? `\n═══ ${fall} FALLEN ✗ ═══` : '\n═══ TORNADA CORRECTA ✔ ═══');
process.exit(fall?1:0);
