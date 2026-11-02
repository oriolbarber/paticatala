// APARELL: comprova que el pal, la vela i la barra escotera segueixen les mides
// de la làmina de nomenclatura del patí, i que les TRES vistes dibuixen el
// MATEIX aparell (abans el pal feia 1,15 eslores en perspectiva i 1,00 en
// zenital: el mateix patí es veia diferent segons la càmera).
const noop=()=>{};
let OUT=[], CAP=false;
const col = v => (typeof v==='string') ? v : '#degradat';
const mkGrad = () => ({addColorStop:noop});
const ctx = {
  save:noop,restore:noop,setTransform:noop,resetTransform:noop,translate:noop,rotate:noop,
  scale:noop,clip:noop,setLineDash:noop,rect:noop,closePath:noop,
  createLinearGradient:mkGrad, createRadialGradient:mkGrad,
  beginPath(){this._p=[];},
  moveTo(x,y){this._p.push([x,y]);}, lineTo(x,y){this._p.push([x,y]);},
  quadraticCurveTo(cx,cy,x,y){this._p.push([x,y]);},
  bezierCurveTo(a,b,c,d,x,y){this._p.push([x,y]);},
  arc(x,y,r){this._p.push([x,y]);}, ellipse:noop,
  fill(){ if(CAP&&this._p&&this._p.length) OUT.push({k:'fill',c:col(this.fillStyle),p:this._p.slice()}); },
  stroke(){ if(CAP&&this._p&&this._p.length) OUT.push({k:'stroke',c:col(this.strokeStyle),w:this.lineWidth,p:this._p.slice()}); },
  fillRect:noop, strokeRect:noop, fillText:noop, strokeText:noop, drawImage:noop,
  fillStyle:'#000', strokeStyle:'#000', lineWidth:1, lineCap:'butt', lineJoin:'miter',
  font:'', textAlign:'left', globalAlpha:1, _p:[]
};
const store={};function el(id){return{id,style:{},width:300,height:380,classList:{_s:new Set(),add(...c){c.forEach(x=>this._s.add(x));},remove(...c){c.forEach(x=>this._s.delete(x));},toggle(c,v){v?this._s.add(c):this._s.delete(c);},contains(c){return this._s.has(c);}},addEventListener:noop,setAttribute:noop,getContext:()=>ctx,appendChild:noop,getBoundingClientRect:()=>({top:0,left:0,right:0,bottom:0,width:0,height:0}),setPointerCapture:noop,textContent:"",innerHTML:"",value:12};}
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
let src=fs.readFileSync("simM.js","utf8").replace(/^'use strict';/,"");
src+="\n;globalThis.__api={S,F,cam,L,RIG,aparell,calatRel,resetToBeach,renderWorld,updateCamera,shoreFn};\n";
eval(src);
const A=globalThis.__api, S=A.S, cam=A.cam, L=A.L, M=L/5.6;
let fall=0;
const ok=(b,t)=>{ if(!b) fall++; console.log(`  ${b?'✔':'✗'} ${t}`); return b; };
const prop = v => v/L;

// ─── 1) GEOMETRIA CONTRA LA LÀMINA ───────────────────────────────────────
// mesures preses sobre el plànol: eslora 521 px, coberta a y=660 px
console.log("\nGEOMETRIA DE L'APARELL — codi contra làmina (fraccions d'eslora)\n");
console.log('    magnitud                        làmina    codi');
S.rake=0; S.boomDir=0; S.heel=0;
const ap = A.aparell();
const files = [
  ["estació del pal (bancada 1)",      -0.275, prop(ap.peuPal[1])],
  ["alçada del pal sobre la coberta",   1.186, prop(ap.capPal[2]-ap.HULLH)],
  ["caiguda del cap cap a popa",        0.219, prop(ap.capPal[1]-ap.peuPal[1])],
  ["alçada del puny d'amura",           0.115, prop(ap.amura[2]-ap.HULLH)],
  ["alçada del puny d'escota",          0.246, prop(ap.escota[2]-ap.HULLH)],
  ["pujament (amura → escota)",         0.581, prop(Math.hypot(ap.escota[0]-ap.amura[0], ap.escota[1]-ap.amura[1]))],
  ["barra escotera: potes",             0.452, prop(ap.barraY(1))],
  ["barra escotera: recula al centre",  0.028, prop(ap.barraY(0)-ap.barraY(1))],
  ["barra escotera: alçada de l'arc",   0.020, prop(ap.barraZ(0)-ap.barraZ(1))],
];
for(const [nom, plan, codi] of files){
  const d = Math.abs(plan-codi);
  if(d>0.045) fall++;
  console.log(`  ${(d<=0.045?'✔':'✗')} ${nom.padEnd(32)} ${plan.toFixed(3).padStart(6)}  ${codi.toFixed(3).padStart(6)}`);
}
const grausCai = Math.atan2(ap.capPal[1]-ap.peuPal[1], ap.capPal[2]-ap.HULLH)*180/Math.PI;
ok(grausCai>8 && grausCai<14, `el pal cau ${grausCai.toFixed(1)}° cap a popa (làmina: 11,5°)`);

// ─── 2) ROCAIA DEL FONS ──────────────────────────────────────────────────
console.log('\nROCAIA DEL BUC (0 = proa, 1 = popa)');
const r = [0,0.15,0.3,0.5,0.7,0.88,1].map(t=>[t, A.calatRel(t)]);
console.log('  ' + r.map(([t,v])=>`${t}:${v.toFixed(2)}`).join('  '));
ok(A.calatRel(0)===0, "la proa surt de l'aigua");
ok(A.calatRel(1)<0.8 && A.calatRel(1)>0.3, 'la popa torna a pujar, però menys que la proa');
let creix=true; for(let i=1;i<5;i++) if(r[i][1] <= r[i-1][1]) creix=false;
ok(creix, 'el calat creix de proa cap a la panxa');

// el peu és el pivot: les mordasses només mouen el cap del pal
{ const peus=[-1,-0.5,0,0.5,1].map(r=>{ S.rake=r; return A.aparell().peuPal[1]; }); S.rake=0;
  ok(peus.every(y=>y===peus[0]), 'el peu del pal no es mou amb les mordasses');
  ok(Math.abs(peus[0]-ap.bancY(0))<1e-9, 'el peu del pal és al punt mig de la bancada 1'); }
// el número del menú és el de la memòria cau: si no, no serveix per saber què hi ha
{ const fs=require('fs');
  const v=fs.readFileSync('pati_vela_mobil.html','utf8').match(/id="versio">Versió (v\d+)</);
  const c=fs.readFileSync('pwa/service-worker.js','utf8').match(/pati-vela-(v\d+)/);
  ok(v && c && v[1]===c[1], `la versió del menú (${v&&v[1]}) és la de la memòria cau (${c&&c[1]})`); }
// el sentit, explícit: prop() és un valor absolut i la barra invertida passava
ok(ap.barraY(0) > ap.barraY(1), 'la barra escotera es corba ENFORA: el centre queda a popa de les potes');

// ─── 3) LES TRES VISTES ──────────────────────────────────────────────────
function retrat(mode){
  A.resetToBeach();
  cam.mode=mode; cam.z=1; cam.zt=1;
  S.mode='mar'; S.everInWater=true; S.board=1;
  S.px=0; S.py=A.shoreFn(0)-220*M; S.heading=0; S.speed=0.5;
  S.sheet=0.6; S.sailSide=1; S.pulley=1; S.rake=0; S.time=3;
  S.wx=0; S.wxT=0; S.wf=0; S.wfT=0;
  for(let i=0;i<90;i++){ A.updateCamera(1/60); A.renderWorld(1/60); }
  OUT=[]; CAP=true; A.renderWorld(1/60); CAP=false;
  const pal = OUT.filter(o=>o.k==='stroke' && o.c==='#5c451f' && o.p.length===2).pop();
  // la barra escotera és l'únic traç llarg (21-27 punts) del conjunt del patí
  const barra = OUT.filter(o=>o.k==='stroke' && o.p.length>=21 && o.p.length<=27).pop();
  return {pal, barra};
}
console.log('\nLES TRES VISTES DIBUIXEN EL MATEIX APARELL');
// pal/mànega mesurat amb la càmera estàndard. En perspectiva el cap del pal
// queda més lluny que la barra i la relació surt més petita que la geomètrica.
const esperat = { persp:2.65, popa:2.56, nord:2.56 };
for(const mode of ['persp','popa','nord']){
  const {pal, barra} = retrat(mode);
  if(!ok(!!pal, `${mode.padEnd(6)} · hi ha pal dibuixat`)) continue;
  const [a,b] = pal.p;
  const llarg = Math.hypot(b[0]-a[0], b[1]-a[1]);
  ok(Math.abs(a[1]-b[1]) > 20, `${mode.padEnd(6)} · el pal s'aixeca a la pantalla`);
  if(!ok(!!barra, `${mode.padEnd(6)} · hi ha barra escotera`)) continue;
  const xs = barra.p.map(p=>p[0]);
  const ys = barra.p.map(p=>p[1]);
  const manega = Math.max(...xs) - Math.min(...xs);
  const ratio = llarg/manega, e = esperat[mode];
  ok(Math.abs(ratio-e)/e < 0.22, `${mode.padEnd(6)} · pal/mànega = ${ratio.toFixed(2)} (esperat ${e})`);
  // l'arc: el centre de la barra no està alineat amb els extrems
  const mig = barra.p[Math.floor(barra.p.length/2)];
  const recta = (ys[0]+ys[ys.length-1])/2;
  ok(Math.abs(mig[1]-recta) > 1, `${mode.padEnd(6)} · la barra escotera fa arc (no és recta)`);
}

// ─── 4) UNA SOLA FONT DE VERITAT ─────────────────────────────────────────
console.log('\nCAP VISTA NO ES POT INVENTAR LA SEVA GEOMETRIA');
const codi = fs.readFileSync('simM.js','utf8');
ok(!/MASTH\s*=\s*L\s*\*\s*1\.\d/.test(codi), "la perspectiva no fixa l'alçada del pal a mà");
ok(!/const\s+mastH\s*=\s*L\s*\*/.test(codi),  "la zenital no fixa l'alçada del pal a mà");
ok((codi.match(/aparell\(\)/g)||[]).length >= 4, 'totes les vistes criden aparell()');
ok(!/backstay/.test(codi), "no hi ha estai de popa (el patí no en porta)");

console.log(fall ? `\n═══ ${fall} COMPROVACIONS FALLEN ✗ ═══` : '\n═══ APARELL CORRECTE ✔ ═══');
