// RECORREGUT DE L'ESCOTA. A la realitat el cap no va del puny d'escota a la
// mà: de la vela baixa a la barra escotera de popa, d'allà torna cap endavant
// a una politja damunt la BANCADA CENTRAL (la 3a) i d'aquí puja a la mà.
//
// La prova NO classifica traços per colors — això ja ens ha enganyat altres
// vegades (l'escota blanca comptava com a onada). Fa servir el rastre amb nom
// que deixa el codi de dibuix (ESCOTA_PATH), que és inequívoc.
const noop=()=>{};
const mkGrad=()=>({addColorStop:noop});
const ctx=new Proxy({},{get:(t,p)=>{
  if(p==='createLinearGradient'||p==='createRadialGradient') return mkGrad;
  return typeof p==='string' ? noop : undefined;}});
const store={};function el(id){return{id,style:{},width:430,height:860,classList:{_s:new Set(),add(...c){c.forEach(x=>this._s.add(x));},remove(...c){c.forEach(x=>this._s.delete(x));},toggle(c,v){v?this._s.add(c):this._s.delete(c);},contains(c){return this._s.has(c);}},addEventListener:noop,setAttribute:noop,getContext:()=>ctx,appendChild:noop,getBoundingClientRect:()=>({top:0,left:0,right:0,bottom:0,width:0,height:0}),setPointerCapture:noop,textContent:"",innerHTML:"",value:12};}
const WW=430, HH=860;
global.window={innerWidth:WW,innerHeight:HH,devicePixelRatio:1,addEventListener:noop,requestAnimationFrame:noop};
global.innerWidth=WW;global.innerHeight=HH;global.devicePixelRatio=1;global.addEventListener=noop;
global.requestAnimationFrame=noop;global.performance={now:()=>0};
global.getComputedStyle=()=>({display:'block',visibility:'visible'});
global.document={getElementById:id=>(store[id]||(store[id]=el(id))),createElement:()=>el('nou'),addEventListener:noop};
global.navigator={maxTouchPoints:0};global.setTimeout=noop;global.clearTimeout=noop;
global.location={search:'',href:'file:///pati_vela_mobil.html'};
global.history={length:1,back:()=>{}};

const fs=require('fs');
let src=fs.readFileSync('simM.js','utf8').replace(/^'use strict';/,'');
src+="\n;globalThis.__api={S,F,cam,L,RIG,aparell,resetToBeach,renderWorld,updateCamera,physics,updateWeight,ESCOTA_PATH:()=>ESCOTA_PATH};\n";
eval(src);
const A=globalThis.__api, S=A.S, cam=A.cam, L=A.L, RIG=A.RIG;
let fall=0;
const ok=(b,t)=>{ if(!b) fall++; console.log(`  ${b?'✔':'✗'} ${t}`); return b; };

// munta una navegació qualsevol i pinta un fotograma de la vista demanada
function pinta(vista, {rumb=40, escota=0.7, pul=0.3}={}){
  A.resetToBeach();
  S.mode='mar'; S.px=0; S.py=-60; S.speed=0.5;
  S.heading=rumb*Math.PI/180; S.sheet=escota; S.pulley=pul;
  S.capsized=0; S.board=1;
  cam.mode=vista; cam.rot=0; cam.z=0.8; cam.zt=0.8;
  for(let i=0;i<6;i++){ A.updateWeight(1/60); A.physics(1/60); A.updateCamera(1/60); }
  A.renderWorld(1/60);
  return A.ESCOTA_PATH().slice();
}

const VISTES=[['persp','perspectiva'],['popa','zenital de popa'],['nord','zenital fixa']];
const ORDRE=['puny','barra','banc','ma'];
// En perspectiva el tram de la mà només es dibuixa quan el patró es veu amb el
// cap a la mà: si queda darrere la vela es pinta com a silueta i el cap no s'hi
// dibuixa. Això ja era així abans d'aquest canvi i no és el que es mesura aquí:
// el que importa és que el recorregut, fins allà on es dibuixa, sigui el bo.
const comenca = (noms, n) => JSON.stringify(noms)===JSON.stringify(ORDRE.slice(0,n));

console.log("\nRECORREGUT DE L'ESCOTA — puny → barra de popa → bancada central → mà\n");

for(const [v,nom] of VISTES){
  const p = pinta(v);
  const noms = p.map(e=>e.n);
  ok(p.length===4, `${nom}: el cap passa per 4 punts (n'hi ha ${p.length})`);
  ok(JSON.stringify(noms)===JSON.stringify(ORDRE),
     `${nom}: en l'ordre correcte [${noms.join(' → ')}]`);
  const banc = p.find(e=>e.n==='banc'), barra = p.find(e=>e.n==='barra');
  if(banc && barra){
    const esperat = RIG.bancA + (RIG.bancB-RIG.bancA)*RIG.bancF[RIG.bancEsc];
    ok(Math.abs(banc.by - esperat) < 1e-6,
       `${nom}: la politja és a la bancada 3 (${banc.by.toFixed(4)} eslores)`);
    ok(banc.by < barra.by - 0.15,
       `${nom}: la bancada queda ben per davant de la barra (${banc.by.toFixed(3)} < ${barra.by.toFixed(3)})`);
  } else { ok(false, `${nom}: falten punts del recorregut`); fall++; }
}

// ─── la politja és damunt d'una bancada de debò, no a l'aire ──────────────
{
  const ap = A.aparell();
  const i = RIG.bancEsc;
  ok(Math.abs(ap.pulBanc[1] - ap.bancY(i)) < 1e-9,
     `la politja coincideix amb l'estació de la bancada ${i+1} (${(ap.bancY(i)/L).toFixed(4)} eslores)`);
  ok(ap.pulBanc[0]===0, 'va a la crugia, al centre del patí');
  const hBanc = (ap.pulBanc[2] - ap.HULLH)/L*5.6;
  ok(hBanc > 0.03 && hBanc < 0.20,
     `seu damunt la bancada, no sobre un pal (${(hBanc*100).toFixed(0)} cm sobre la coberta)`);
}

// ─── una sola font per a les bancades: cap vista se les pot inventar ──────
{
  const codi = fs.readFileSync('simM.js','utf8');
  const durs = codi.match(/\[\s*0\s*,\s*L\*0\.040\s*\]|0\.52\s*,\s*L\*0\.05/g) || [];
  ok(durs.length===0, 'cap vista escriu les mides de les bancades a mà');
  ok((codi.match(/RIG\.bancF/g)||[]).length >= 3,
     'les tres vistes i la politja surten de RIG.bancF');
}

// ─── el recorregut es manté en situacions diferents ──────────────────────
console.log('\nEN DIVERSES SITUACIONS\n');
for(const cas of [{rumb:0,escota:0.1,pul:-1}, {rumb:135,escota:1,pul:1},
                  {rumb:270,escota:0.5,pul:0}, {rumb:315,escota:0.88,pul:0.6}]){
  for(const [v,nom] of VISTES){
    const p = pinta(v, cas);
    const noms = p.map(e=>e.n);
    ok(comenca(noms, noms.length) && noms.length>=3,
       `${nom} · rumb ${cas.rumb}° escota ${cas.escota} politja ${cas.pul}`
       + (noms.length<4 ? '  (el patró queda rere la vela: sense tram de mà)' : ''));
  }
}

// ─── el rastre no creix sol (és d'un sol fotograma) ──────────────────────
{
  pinta('popa'); const n1 = A.ESCOTA_PATH().length;
  A.renderWorld(1/60); A.renderWorld(1/60);
  ok(A.ESCOTA_PATH().length === n1,
     `el rastre es buida a cada fotograma (${n1} punts, no ${n1*3})`);
}

console.log(fall ? `\n═══ ${fall} FALLADES ═══\n` : '\n═══ ESCOTA CORRECTA ✔ ═══\n');
process.exit(fall?1:0);
