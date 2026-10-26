/* Animações visuais desacopladas da regra de negócio. */
(function(){
  'use strict';
  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const ids=['kPlan','kDone','kPending','kRate','goalPct','goalValue','goalDone','goalMissing','goalPlanned','previousRate','dPlan','dDone','dPending','dRate'];
  const rafs=new WeakMap();
  let donutRaf=0;

  function parseDisplay(value){
    const str=String(value??'').trim();
    if(!str||str==='—') return null;
    const pct=str.includes('%');
    const raw=str.replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,'');
    const n=Number(raw);
    return Number.isFinite(n)?{n,pct,dec:/[,\.]\d/.test(str)?1:0}:null;
  }
  function formatDisplay(v,meta){
    return meta.pct
      ? v.toLocaleString('pt-BR',{minimumFractionDigits:meta.dec,maximumFractionDigits:meta.dec})+'%'
      : Math.round(v).toLocaleString('pt-BR');
  }
  function capture(){
    const out={};
    ids.forEach(id=>{
      const el=document.getElementById(id),meta=el&&parseDisplay(el.textContent);
      if(meta) out[id]=meta.n;
    });
    return out;
  }
  function animateValue(el,from,to,meta,duration=500){
    if(!el||reduce||from===to){if(el)el.textContent=formatDisplay(to,meta);return;}
    const old=rafs.get(el); if(old) cancelAnimationFrame(old);
    const start=performance.now();
    const step=now=>{
      const t=Math.min(1,(now-start)/duration),ease=1-Math.pow(1-t,3);
      el.textContent=formatDisplay(from+(to-from)*ease,meta);
      if(t<1) rafs.set(el,requestAnimationFrame(step));
      else {el.textContent=formatDisplay(to,meta);rafs.delete(el);}
    };
    rafs.set(el,requestAnimationFrame(step));
  }
  function animateNumbers(before={}){
    ids.forEach(id=>{
      const el=document.getElementById(id); if(!el)return;
      const meta=parseDisplay(el.textContent); if(!meta)return;
      const from=Number.isFinite(before[id])?before[id]:meta.n;
      animateValue(el,from,meta.n,meta,id==='goalPct'?650:500);
    });
  }
  function animateDonut(){
    const donut=document.getElementById('goalDonut'); if(!donut)return;
    if(donutRaf) cancelAnimationFrame(donutRaf);
    const target=Math.max(0,Math.min(100,Number(donut.getAttribute('aria-valuenow'))||0));
    const from=Number(donut.dataset.premiumRing||0);
    donut.dataset.premiumRing=String(target);
    if(reduce){donut.style.setProperty('--goal-angle',`${target*3.6}deg`);return;}
    const start=performance.now(),dur=720;
    const tick=now=>{
      const t=Math.min(1,(now-start)/dur),ease=1-Math.pow(1-t,3),value=from+(target-from)*ease;
      donut.style.setProperty('--goal-angle',`${value*3.6}deg`);
      if(t<1) donutRaf=requestAnimationFrame(tick); else donutRaf=0;
    };
    donutRaf=requestAnimationFrame(tick);
  }
  function afterRender(before={}){
    requestAnimationFrame(()=>{animateNumbers(before);animateDonut();});
  }
  window.ProdPulseMotion=Object.freeze({capture,afterRender});
})();
