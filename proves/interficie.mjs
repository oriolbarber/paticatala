// REVISIÓ DE LA INTERFÍCIE: obre el simulador de debò i fa servir tots els
// controls (menús, regates, càmeres, zoom, mapa, teclat) mirant si salta cap
// error de JavaScript. És la prova de «que tot funcioni».
import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch({ executablePath: process.env.CHROME });
const pg = await b.newPage({ viewport:{ width:430, height:860 } });
let errs = [];
pg.on('pageerror', e => errs.push(e.message));
// les fonts de Google no carreguen en un entorn sense xarxa: no és un error
// de l'app (els tipus de lletra del sistema fan de recanvi)
pg.on('console', m => { if(m.type()==='error' && !/Failed to load resource/.test(m.text()))
  errs.push('console: '+m.text()); });
pg.on('requestfailed', r => { if(!/fonts\.(googleapis|gstatic)/.test(r.url()))
  errs.push('recurs: '+r.url()); });
await pg.goto('file://' + path.resolve('pati_vela_mobil.html'), { waitUntil:'load' });
await pg.waitForTimeout(800);

const passos = [
  ['la guia inicial es munta',      async()=>{ await pg.waitForSelector('#ovGuia.on'); }],
  ['botó COM ES NAVEGA',            async()=>{ await pg.click('#btnManual'); await pg.waitForTimeout(200); }],
  ['tornar de manual a la guia',    async()=>{ await pg.click('#btnTancarManual'); await pg.waitForTimeout(200); }],
  ['botó COMENÇAR',                 async()=>{ await pg.click('#btnComencar'); await pg.waitForTimeout(300); }],
  // el botó ENTRAR AL MAR batega sense parar (animation:pulsa infinite): per a
  // Playwright no s'atura mai de moure's, així que mai el considera «estable».
  // No és cap problema de l'app —el dit sí que hi arriba—, però la prova ha de
  // forçar el clic o s'esperaria per sempre.
  ['entrar al mar',                 async()=>{ await pg.click('#btnEntrar', {force:true}); await pg.waitForTimeout(800); }],
  ['canviar de càmera (3 modes)',   async()=>{ for(let i=0;i<3;i++){ await pg.click('#btnCam'); await pg.waitForTimeout(350);} }],
  ['cicle de zoom complet',         async()=>{ for(let i=0;i<4;i++){ await pg.click('#btnZoom'); await pg.waitForTimeout(250);} }],
  ['obrir i tancar el mapa',        async()=>{ await pg.click('#btnMapa'); await pg.waitForTimeout(400); await pg.click('#ovMapa'); }],
  ['menú de configuració',          async()=>{ await pg.click('#btnConfig'); await pg.waitForTimeout(250); }],
  ['moure vent, direcció i pes',    async()=>{ for(const [id,v] of [['sWind','22'],['sWindDir','180'],['sCrew','95']]){
                                        await pg.fill('#'+id, v); await pg.dispatchEvent('#'+id,'input'); await pg.waitForTimeout(120);} }],
  ['obrir REPTES',                  async()=>{ await pg.click('#btnReptes'); await pg.waitForTimeout(300); }],
  ['triar una regata (bastó)',      async()=>{ await pg.click('#llistaCurses .cursaItem:nth-child(2)'); await pg.waitForTimeout(500); }],
  ['anar a la línia de sortida',    async()=>{ await pg.click('#btnALinia'); await pg.waitForTimeout(400); }],
  ['triar un exercici de tècnica',  async()=>{ await pg.click('#btnConfig'); await pg.waitForTimeout(200);
                                        await pg.click('#btnReptes'); await pg.waitForTimeout(250);
                                        await pg.click('#llistaReptes .repteItem:nth-child(2)'); await pg.waitForTimeout(300); }],
  ['teclat: pes, escota i pal',     async()=>{ for(const k of ['w','s','a','d','ArrowLeft','ArrowRight','q','e','r','f','x',' ','z','c','m','m']){
                                        await pg.keyboard.press(k); await pg.waitForTimeout(90);} }],
  ['control del pal (desplegar)',   async()=>{ await pg.click('#rakeToggle'); await pg.waitForTimeout(250); }],
  ['reiniciar i nova partida',      async()=>{ await pg.click('#btnRestart'); await pg.waitForTimeout(400);
                                        await pg.click('#btnNovaPartida'); await pg.waitForTimeout(600); }],
  ['guia des del menú',             async()=>{ await pg.click('#btnConfig'); await pg.waitForTimeout(200);
                                        await pg.click('#btnGuia'); await pg.waitForTimeout(500); }],
];
console.log('REVISIÓ DE LA INTERFÍCIE\n');
let fall = 0;
for(const [nom, acc] of passos){
  const n0 = errs.length;
  try { await acc(); } catch(e){ errs.push(nom+': '+e.message.split('\n')[0]); }
  const nou = errs.length - n0;
  if(nou) fall++;
  console.log(`  ${nou?'✗':'✔'} ${nom}${nou?'  → '+errs.slice(n0).join(' | ').slice(0,120):''}`);
}
// una estona navegant de debò, amb vent fort, per si peta en marxa
await pg.evaluate(()=>{ S.mode='mar'; S.everInWater=true; S.windKn=24; S.speed=0.8; });
await pg.waitForTimeout(2500);
console.log('\n  ' + (errs.length ? `${errs.length} errors ✗` : 'cap error de JavaScript en tota la sessió ✔'));
for(const e of errs) console.log('    · ' + e);
await b.close();
process.exit(fall?1:0);
