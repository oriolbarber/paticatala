// BRAÇOS DEL PATRÓ: una mà sempre a l'escota, en línia amb la politja de la
// bancada central, i l'altra agafada a un punt real del patí: cintes, regala
// (cara interior o exterior) o obencs. Es recorre tota la coberta, no un cas.
const carrega = require('./_entorn.js');
const A = carrega(), {S,F,L,RIG} = A;
const {MANS,agafada,maEscota,patroZen,aparell,ABAST,updateWeight,physics,crewY,penjat} = A;
let fall = 0;
const ok = (b,t) => { if(!b) fall++; console.log(`  ${b?'✔':'✗'} ${t}`); return b; };
const cm = x => x/L*560;
const ap0 = aparell();
function posa(wx, wf, escota=0.6){
  S.mode='mar'; S.board=1; S.capsized=0; S.wx=wx; S.wxT=wx; S.wf=wf; S.wfT=wf;
  S.speed=0.5; S.sheet=escota; S.px=0; S.py=-60;
  // la postura la decideix physics(), no updateWeight(): sense això la prova
  // només veia 'assegut' i sortia verda igualment
  updateWeight(1/60); physics(1/60);
  S.wx=wx; S.wxT=wx; S.wf=wf; S.wfT=wf; S.capsized=0; F.accompanying=false;
  MANS.suport=null; for(let i=0;i<30;i++) A.actualitzaMans(1/30);
}
// els punts reals, escrits independentment de agafada()
function tipus(m){
  const H=ap0.HULLH, x=Math.abs(m[0])/L;
  if(Math.abs(m[2]-H)>1e-6){              // enlaire: ha de ser sobre un obenc
    const ap=aparell();
    return RIG.cadenots.slice(1).some(c=>{
      const t=(m[2]-H)/(ap.capPal[2]-H), est=c*L;
      return Math.hypot(Math.abs(m[0])-0.150*L*(1-t), m[1]-(est+(ap.capPal[1]-est)*t)) < L*0.002;
    }) ? 'obenc' : null;
  }
  if(Math.abs(x-0.045)<0.002) return 'cinta';
  if(Math.abs(x-(0.150-0.042*0.9))<0.002) return 'regala interior';
  if(Math.abs(x-(0.150+0.042*0.95))<0.002) return 'regala exterior';
  return null;
}
console.log('\nBRAÇOS: TOTA LA COBERTA, CADA POSTURA\n');
const compte={}; const lluny={}; let nul=0, passa=0, mal=0, casos=0, pitjor=0;
for(let wx=-1;wx<=1.001;wx+=0.1) for(let wf=-1;wf<=1.001;wf+=0.1){
  posa(wx,wf); casos++;
  const post=F.posture||'assegut', m=MANS.suport, g=tipus(m);
  if(!g){ nul++; continue; }
  compte[post+' → '+g]=(compte[post+' → '+g]||0)+1;
  // abast des de l'espatlla de la vista de perspectiva
  const U=L*0.29, bx=wx*(L*0.15+L*0.042*0.35), by=crewY(wf), H=ap0.HULLH;
  const sgn=Math.sign(wx||1), TOR=U*0.40, LEG=U*0.46, e=-MANS.k*U*0.135*0.8;
  const sh = post==='dret' ? [bx+e,by+U*0.04,H+LEG+TOR]
           : post==='peus' ? [bx+e,by-U*0.04,H+U*0.12+TOR*0.9]
           : post==='fora' ? [sgn*(L*0.15-L*0.042*0.1+penjat()*L*0.055)+sgn*TOR*0.92,by+e,H+U*0.26]
           : [bx+e,by+U*0.06,H+U*0.10+TOR*0.8];
  const d=Math.hypot(sh[0]-m[0],sh[1]-m[1],sh[2]-m[2])-ABAST;
  if(d>0){ passa++; pitjor=Math.max(pitjor,d); }
  // la mà de l'escota, exactament sobre la recta espatlla → politja
  const q=maEscota(sh), p=aparell().pulBanc;
  const a=[q[0]-sh[0],q[1]-sh[1],q[2]-sh[2]], b=[p[0]-sh[0],p[1]-sh[1],p[2]-sh[2]];
  const cos=(a[0]*b[0]+a[1]*b[1]+a[2]*b[2])/Math.hypot(...a)/Math.hypot(...b);
  if(Math.acos(Math.min(1,cos))*180/Math.PI>0.5) mal++;
}
Object.keys(compte).sort().forEach(k=>console.log(`    ${k}: ${compte[k]}`));
ok(nul===0, `la mà lliure sempre és en un punt real (${casos} posicions, ${nul} a l'aire)`);
ok(mal===0, `el braç de l'escota apunta a la politja central en les ${casos}`);
ok(pitjor<L*0.02, `la mà arriba a l'agafada: ${passa} posicions justes, com a molt ${cm(pitjor).toFixed(1)} cm de més`);

for(const p of ['assegut','dret','fora']) ok(Object.keys(compte).some(k=>k.startsWith(p)), `la prova ha vist la postura «${p}»`);
posa(0, 0.9, 0.05);
ok(F.posture==='peus' && tipus(MANS.suport)==='obenc', `posició neutra (peus a l'aigua): la mà va a l'obenc`);
console.log('\nRECORREGUT DEL COS\n');
ok(Math.abs(crewY(-1)/L-0.37) < 0.001, `a popa arriba a ${(crewY(-1)/L).toFixed(3)} eslores (abans 0,300)`);
ok(crewY(-1) < ap0.barraY(1), 'els malucs es queden davant la barra de popa');
ok(Math.abs(crewY(-1e-9)-crewY(1e-9)) < 1e-3, 'el recorregut és continu al centre');
posa(-1,0); ok(penjat()===1 && F.posture==='fora', 'amb el pes a tota la banda es penja del tot');
console.log('\nZENITAL: L\'ESCOTA ACABA A LA MÀ\n');
for(const [wx,wf] of [[-0.7,0],[0.7,0],[-0.1,0],[-0.5,0.7],[-1,0],[0.05,0.8]]){
  posa(wx,wf);
  const Z=patroZen(), e=Z.aPati(MANS.k*Z.shX, Z.shY), m=maEscota([e[0],e[1],ap0.pulBanc[2]]);
  const t=Z.aTors(m[0],m[1]), b=Z.aPati(t[0],t[1]);
  ok(Math.hypot(b[0]-m[0],b[1]-m[1])<1e-6, `${F.posture}: el pas tors ↔ patí és exacte`);
}
console.log('\nCANVI DE MÀ: CONTINU\n');
posa(-0.5,0); let salt=0, ant=MANS.suport.slice();
for(let i=0;i<120;i++){ S.wx=-0.5+i/120; S.wxT=S.wx; updateWeight(1/60); A.actualitzaMans(1/60);
  salt=Math.max(salt,Math.hypot(MANS.suport[0]-ant[0],MANS.suport[1]-ant[1],MANS.suport[2]-ant[2]));
  ant=MANS.suport.slice(); }
ok(salt<L*0.03, `travessant el patí, la mà no salta (màxim ${cm(salt).toFixed(1)} cm per fotograma)`);
console.log(fall ? `\n═══ ${fall} FALLADES ✗ ═══\n` : '\n═══ BRAÇOS CORRECTES ✔ ═══\n');
process.exit(fall?1:0);
