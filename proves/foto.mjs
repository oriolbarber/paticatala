// FOTOS REALS: obre el simulador amb Chromium i captura el llenç de debò.
// No és una prova automàtica: serveix per MIRAR com queda el patí a cada vista
// i per atrapar qualsevol error de JavaScript en marxa (pageerror).
import { chromium } from 'playwright';
import path from 'path';
const URL = 'file://' + path.resolve('pati_vela_mobil.html');
const ESCENES = [
  { nom:'1-persp-traves', mode:'persp', z:1,   rumb:0.95, escota:0.60, rake:0,  wf:0.10, wx:-0.55 },
  { nom:'2-persp-ceny',   mode:'persp', z:1,   rumb:0.60, escota:0.88, rake:1,  wf:0.65, wx:-0.90 },
  { nom:'3-persp-lluny',  mode:'persp', z:0.6, rumb:0.95, escota:0.60, rake:0,  wf:0.10, wx:-0.55 },
  { nom:'4-platja',       mode:'persp', z:1,   platja:true },
  { nom:'5-zenital-popa', mode:'popa',  z:1,   rumb:0.95, escota:0.60, rake:0,  wf:0.10, wx:-0.55 },
  { nom:'6-zenital-fixa', mode:'nord',  z:0.8, rumb:2.30, escota:0.30, rake:-1, wf:-0.40, wx:0.55 },
];
const b = await chromium.launch({ executablePath: process.env.CHROME });
const pg = await b.newPage({ viewport:{ width:430, height:860 }, deviceScaleFactor:2 });
let errors = 0;
pg.on('pageerror', e => { errors++; console.log('  ERROR DE PÀGINA:', e.message); });
await pg.goto(URL, { waitUntil:'load' });
await pg.waitForTimeout(700);
await pg.evaluate(() => { for(const id of ['ovGuia','ovManual','ovConfig','ovReptes'])
  document.getElementById(id)?.classList.remove('on'); });
for(const e of ESCENES){
  await pg.evaluate(sc => {
    cam.mode = sc.mode; cam.z = sc.z; cam.zt = sc.z;
    if(sc.platja){ resetToBeach(); }
    else {
      S.mode='mar'; S.everInWater=true; S.board=1;
      document.getElementById('btnEntrar').style.display='none';
      S.px=0; S.py=shoreFn(0)-220*(L/5.6); S.heading=sc.rumb; S.speed=0.55;
      S.sheet=sc.escota; S.sailSide=1; S.pulley=1;
      S.wf=sc.wf; S.wfT=sc.wf; S.wx=sc.wx; S.wxT=sc.wx;
    }
    S.rake=sc.rake||0; S.rakeT=sc.rake||0;
    globalThis.__pin = ()=>{ if(!sc.platja){ S.px=0; S.py=shoreFn(0)-220*(L/5.6);
      S.heading=sc.rumb; S.speed=0.55; S.sheet=sc.escota; } S.rake=sc.rake||0; };
  }, e);
  for(let i=0;i<60;i++){ await pg.evaluate(()=>globalThis.__pin()); await pg.waitForTimeout(16); }
  await pg.screenshot({ path:`foto_${e.nom}.png` });
  console.log('  foto_'+e.nom+'.png');
}
await b.close();
console.log(errors ? `\n${errors} ERRORS DE JAVASCRIPT ✗` : '\nCap error de JavaScript en cap vista ✔');
