/* ProdPulse Dashboard V33 — regras de negócio e renderização.
   Fonte: arquivo JSON sintético distribuído junto ao projeto. */
(function(){
'use strict';
/* ProdPulse Dashboard - lógica principal
   Arquivo separado da interface para facilitar manutenção. */

let records=[];
let indexRecords=[];
let dataMeta={source:'none',updatedAt:'',receivedAt:'',warning:''};
let showAll=false,selectedBox='',detailView='all',detailReturnFocus=null;
let goalOverrides={},lastGoalReportText='';
const $=id=>document.getElementById(id);
const MEDIA=window.ProdPulseMediaConfig||{CAR_IMAGES:{},CAR_VIDEOS:{}};
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmt=n=>new Intl.NumberFormat('pt-BR').format(Number(n||0));
function parseDate(value){
 if(!value)return null;
 const s=String(value).trim();
 let m=s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
 if(!m){const br=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);if(br)m=[br[0],br[3],br[2].padStart(2,'0'),br[1].padStart(2,'0')];}
 if(!m)return null;
 const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]);
 if(mo<1||mo>12||d<1||d>31)return null;
 const dt=new Date(y,mo-1,d);
 if(dt.getFullYear()!==y||dt.getMonth()!==mo-1||dt.getDate()!==d)return null;
 return{y,m:mo,d};
}
function fmtDate(s){const d=parseDate(s);return d?`${String(d.d).padStart(2,'0')}/${String(d.m).padStart(2,'0')}/${d.y}`:'-'}
function monthKey(s){const d=parseDate(s);return d?`${d.y}-${String(d.m).padStart(2,'0')}`:''}
const monthNames=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
function monthLabel(k){if(!/^\d{4}-\d{2}$/.test(String(k||'')))return'—';const[y,m]=k.split('-').map(Number);return monthNames[m-1]?`${monthNames[m-1]}/${y}`:'—'}
function longMonth(k){if(!/^\d{4}-\d{2}$/.test(String(k||'')))return'—';const[y,m]=k.split('-').map(Number),name=monthNames[m-1];return name?`${name.charAt(0).toUpperCase()+name.slice(1)}/${y}`:'—'}
const QUALITY_INVALID=new Set(['','#N/A','N/A','NA','NULL','UNDEFINED','ERRO','ERROR','PENDENTE','PENDING','-','0','FALSE']);
function hasQuality(r){
 if(parseDate(r?.quality))return true;
 const raw=norm(r?.qualityRaw||'');
 return !!raw&&!QUALITY_INVALID.has(raw);
}
function allMonths(){return [...new Set(records.map(r=>monthKey(r.planned)).filter(Boolean))].sort()}
function currentDefault(){const now=new Date(),k=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`,m=allMonths();return m.includes(k)?k:(m[m.length-1]||'')}
function unique(arr){return [...new Set(arr.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'pt-BR'))}
function setSelectOptions(select,values,firstLabel){
 const current=select.value;
 select.replaceChildren();
 if(firstLabel!==null){const o=document.createElement('option');o.value='';o.textContent=firstLabel;select.append(o);}
 values.forEach(value=>{const o=document.createElement('option');o.value=value;o.textContent=value;select.append(o);});
 if([...select.options].some(o=>o.value===current))select.value=current;
}
function fillFilters(reset=false){
 const monthSelect=$('monthFilter');
 const previous=reset?currentDefault():monthSelect.value;
 const months=allMonths();
 monthSelect.replaceChildren();
 if(!months.length){const o=document.createElement('option');o.value='';o.textContent='Sem dados';monthSelect.append(o);}
 else months.forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent=longMonth(k);monthSelect.append(o);});
 monthSelect.value=months.includes(previous)?previous:currentDefault();
 const monthRows=records.filter(r=>monthKey(r.planned)===monthSelect.value);
 setSelectOptions($('familyFilter'),unique(monthRows.map(r=>r.family||r.sheet)),'Todas');
 setSelectOptions($('clientFilter'),unique(monthRows.map(r=>r.client)),'Todos');
}
function baseRows(){const mk=$('monthFilter').value,f=$('familyFilter').value,c=$('clientFilter').value,q=norm($('searchFilter').value);return records.filter(r=>monthKey(r.planned)===mk&&(!f||(r.family||r.sheet)===f)&&(!c||r.client===c)&&(!q||[r.tc,r.order,r.lot,r.client,r.box].some(v=>norm(v).includes(q))))}
function grouped(rows){const m=new Map();rows.forEach(r=>{const k=r.box||'SEM TIPO';if(!m.has(k))m.set(k,{box:k,rows:[],planned:0,done:0,pending:0,rate:0});const g=m.get(k);g.rows.push(r);g.planned++;if(hasQuality(r))g.done++});for(const g of m.values()){g.pending=g.planned-g.done;g.rate=g.planned?g.done/g.planned*100:0}return [...m.values()]}
function mediaKey(box){
  const n=norm(box);
  for(const key of ['ORION','ATLAS','VEGA','SOLARIS','NEO','PRISMA','PULSE','AURA']){
    if(n.includes(key))return key;
  }
  return '';
}
function photoSrcForBox(box){return MEDIA.CAR_IMAGES[mediaKey(box)]||''}
function videoSrcForBox(box){return MEDIA.CAR_VIDEOS[mediaKey(box)]||''}
function escText(s){return String(s??'').replace(/[<>]/g,'')}

function bindVideoFix(video,prefix){
 if(!video||video.dataset.fixBound==='1')return;
 video.dataset.fixBound='1';
 const fallback=()=>{
   video.dataset.hasVideo='';
   video.classList.add('video-failed');
   const vb=$(prefix+'ShowVideo'); if(vb) vb.style.display='none';
   const badge=$(prefix+'MediaBadge'); if(badge) badge.style.display='none';
   setMediaMode(prefix,'photo');
 };
 video.addEventListener('error',fallback);
 video.addEventListener('stalled',()=>{});
 video.addEventListener('loadeddata',()=>video.classList.remove('video-failed'));
}
function setMediaMode(prefix,mode){
 const video=$(prefix+'Video'),photo=$(prefix+'Photo'),vb=$(prefix+'ShowVideo'),pb=$(prefix+'ShowPhoto'),badge=$(prefix+'MediaBadge');
 if(!video||!photo)return;
 const hasVideo=video.dataset.hasVideo==='1',hasPhoto=photo.dataset.hasPhoto==='1';
 const showVideo=mode==='video'&&hasVideo;
 if(showVideo){
   photo.style.display='none';
   video.style.display='block';
   if(badge)badge.style.display='block';
   if(vb)vb.classList.add('active');
   if(pb)pb.classList.remove('active');
   const playPromise=video.play();
   if(playPromise&&typeof playPromise.catch==='function')playPromise.catch(()=>{});
   return;
 }
 video.pause();
 video.style.display='none';
 if(hasPhoto){photo.style.display='block'}else{photo.style.display='none'}
 if(badge)badge.style.display='none';
 if(vb)vb.classList.remove('active');
 if(pb)pb.classList.toggle('active',hasPhoto);
}
function applyProductMedia(prefix,box,preferVideo=true){
 const photo=$(prefix+'Photo'),video=$(prefix+'Video'),src=photoSrcForBox(box),vsrc=videoSrcForBox(box),k=mediaKey(box);
 if(photo){
   photo.dataset.hasPhoto=src?'1':'0';
   photo.onerror=()=>{photo.dataset.hasPhoto='0';photo.style.display='none';};
   photo.onload=()=>{photo.dataset.hasPhoto='1';};
   if(src){photo.src=src;photo.alt=`${box||'Produto'} - imagem`;}else{photo.removeAttribute('src');photo.alt='Sem imagem disponível';}
 }
 if(video){
   bindVideoFix(video,prefix);
   video.poster=src||'';
   video.dataset.hasVideo=vsrc?'1':'0'; video.preload='metadata';
   if(video.dataset.mediaKey!==k||video.dataset.mediaSrc!==vsrc){
     video.pause();
     try{video.currentTime=0;}catch(e){}
     video.removeAttribute('src');
     video.load();
     video.dataset.mediaKey=k||'';
     video.dataset.mediaSrc=vsrc||'';
     if(vsrc){
       video.src=vsrc;
       video.load();
     }
   }
 }
 const vb=$(prefix+'ShowVideo'),pb=$(prefix+'ShowPhoto');
 if(vb)vb.style.display=vsrc?'inline-flex':'none';
 if(pb)pb.style.display=src?'inline-flex':'none';
 setMediaMode(prefix,preferVideo&&vsrc?'video':'photo');
}
function setPhoto(box){applyProductMedia('type',box,false);applyProductMedia('detail',box,false);$('photoTitle').textContent=box||'Selecione um tipo';const hasV=!!videoSrcForBox(box),hasP=!!photoSrcForBox(box);$('photoText').textContent=hasV?'Vídeo e foto do produto selecionado. Use os botões para alternar a visualização.':hasP?'Imagem de referência do tipo selecionado.':'Sem mídia vinculada para este tipo.'}
function setDetailPhotoForRow(r){applyProductMedia('detail',r.box,false);$('detailSubtitle').textContent=`${escText(r.box||selectedBox)} · ${escText(r.client||'-')} · Item ${escText(r.tc||'-')}`;}
function goalContextRows(mk=$('monthFilter').value){const f=$('familyFilter').value,c=$('clientFilter').value;return records.filter(r=>monthKey(r.planned)===mk&&(!f||(r.family||r.sheet)===f)&&(!c||r.client===c))}
function goalContextKey(){return[$('monthFilter').value,$('familyFilter').value||'*',$('clientFilter').value||'*'].join('|')}
function previousMonthKey(k){if(!k)return'';let[y,m]=k.split('-').map(Number);m--;if(m<1){m=12;y--}return`${y}-${String(m).padStart(2,'0')}`}
function pct(v){return Number.isFinite(v)?v.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%':'—'}
function goalColor(rate){return rate>=100?'var(--green)':rate>=70?'#d09217':'var(--red)'}
function goalStatusClass(kind){return`goal-status ${kind}`}
function renderGoalReport(){
 const mk=$('monthFilter').value,rows=goalContextRows(mk),planned=rows.length,done=rows.filter(hasQuality).length,key=goalContextKey(),override=Number(goalOverrides[key]||0),goal=override>0?override:planned,rate=goal?done/goal*100:0,missing=Math.max(goal-done,0),over=Math.max(done-goal,0),ring=Math.max(0,Math.min(100,rate));
 const input=$('goalInput');if(document.activeElement!==input)input.value=goal||'';$('goalMode').textContent=override>0?'Meta manual':'Meta = planejado';$('goalMode').style.background=override>0?'var(--amber-soft)':'var(--navy-soft)';$('goalMode').style.color=override>0?'var(--amber)':'var(--navy2)';
 $('goalValue').textContent=fmt(goal);$('goalDone').textContent=fmt(done);$('goalMissing').textContent=fmt(missing);$('goalPlanned').textContent=fmt(planned);$('goalPct').textContent=pct(rate);$('goalFraction').textContent=`${fmt(done)} / ${fmt(goal)} unidades`;$('goalRemainingText').textContent=goal?(missing?`Faltam ${fmt(missing)} unidades para atingir a meta.`:`Meta atingida${over?` e superada em ${fmt(over)} unidades`:''}.`):'Defina uma meta para acompanhar.';
 const donut=$('goalDonut'),color=goalColor(rate);donut.style.setProperty('--goal-color',color);donut.style.setProperty('--goal-angle',`${ring*3.6}deg`);donut.setAttribute('aria-valuenow',String(Math.round(ring)));donut.classList.remove('good','warn','bad','pulse');donut.classList.add(rate>=100?'good':rate>=75?'good':rate>=45?'warn':'bad');if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){void donut.offsetWidth;donut.classList.add('pulse')}const chip=$('goalChip');if(chip){chip.textContent=rate>=100?'Meta atingida':rate>=75?'Ritmo forte':rate>=45?'Em evolução':'Atenção na meta';}
 const prevKey=previousMonthKey(mk),prevRows=goalContextRows(prevKey),prevPlanned=prevRows.length,prevDone=prevRows.filter(hasQuality).length,prevRate=prevPlanned?prevDone/prevPlanned*100:NaN,diff=Number.isFinite(prevRate)?rate-prevRate:NaN;$('previousMonthLabel').textContent=`${longMonth(prevKey)} · conclusão`;$('previousRate').textContent=pct(prevRate);const comp=$('previousComparison');if(Number.isFinite(diff)){const abs=Math.abs(diff).toLocaleString('pt-BR',{maximumFractionDigits:1});comp.textContent=`${diff>0?'▲':diff<0?'▼':'●'} ${abs} p.p. ${diff>0?'acima':diff<0?'abaixo':'igual'} ao mês anterior`;comp.className='comparison '+(diff>0?'up':diff<0?'down':'flat')}else{comp.textContent='Sem base suficiente para comparação.';comp.className='comparison flat'}
 const[y,m]=mk.split('-').map(Number),now=new Date(),sel=y*12+(m-1),cur=now.getFullYear()*12+now.getMonth();let statusKind='future',status='Mês futuro',expected=0,paceSentence='O período ainda não começou.';
 if(sel<cur){expected=100;if(rate>=100){statusKind='good';status='Meta atingida';paceSentence='O período já encerrou e a meta foi atingida.'}else{statusKind='bad';status='Meta não atingida';paceSentence=`O período já encerrou com ${pct(rate)} da meta.`}}
 else if(sel===cur){const days=new Date(y,m,0).getDate();expected=Math.min(100,now.getDate()/days*100);const delta=rate-expected;if(delta>=0){statusKind='good';status='Ritmo acima da meta';paceSentence=`O atingimento está ${Math.abs(delta).toLocaleString('pt-BR',{maximumFractionDigits:1})} p.p. acima do ritmo esperado para hoje.`}else if(delta>=-8){statusKind='warn';status='Ritmo próximo da meta';paceSentence=`O atingimento está ${Math.abs(delta).toLocaleString('pt-BR',{maximumFractionDigits:1})} p.p. abaixo do ritmo esperado, ainda dentro da faixa de atenção.`}else{statusKind='bad';status='Ritmo abaixo da meta';paceSentence=`O atingimento está ${Math.abs(delta).toLocaleString('pt-BR',{maximumFractionDigits:1})} p.p. abaixo do ritmo esperado para hoje.`}}
 const st=$('goalStatus');st.className=goalStatusClass(statusKind);st.textContent=status;$('pacePercent').textContent=`${pct(rate)} atual`;$('paceFill').style.width=`${ring}%`;$('paceFill').style.background=color;$('paceMarker').style.left=`${Math.max(0,Math.min(100,expected))}%`;$('paceMarker').style.display=sel>cur?'none':'block';$('paceCopy').textContent=sel===cur?`Ritmo esperado até hoje: ${pct(expected)}. ${paceSentence}`:paceSentence;
 const prevText=Number.isFinite(prevRate)?` No mês anterior, ${pct(prevRate)} dos unidades planejados estão liberados, uma diferença de ${Math.abs(diff).toLocaleString('pt-BR',{maximumFractionDigits:1})} p.p. ${diff>=0?'acima':'abaixo'} do atingimento atual.`:'';lastGoalReportText=`Em ${longMonth(mk)}, ${fmt(done)} unidades foram liberados pela Qualidade de uma meta de ${fmt(goal)}, atingindo ${pct(rate)}. ${missing?`Faltam ${fmt(missing)} unidades para alcançar a meta.`:`A meta foi atingida${over?` e superada em ${fmt(over)} unidades`:''}.`}${prevText} ${paceSentence}`;$('goalReportText').textContent=lastGoalReportText;
}
function setManualGoal(){const v=Math.round(Number($('goalInput').value));const key=goalContextKey();if(Number.isFinite(v)&&v>0)goalOverrides[key]=v;else delete goalOverrides[key];renderGoalReport()}
function usePlannedGoal(){delete goalOverrides[goalContextKey()];renderGoalReport()}
function downloadGoalReport(){const context=[`Relatório da Meta — ${longMonth($('monthFilter').value)}`,`Família: ${$('familyFilter').value||'Todas'}`,`Cliente: ${$('clientFilter').value||'Todos'}`,'',lastGoalReportText,'',`Gerado em: ${new Date().toLocaleString('pt-BR')}`].join('\n');const blob=new Blob(['\ufeff'+context],{type:'text/plain;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Relatorio_Meta_${$('monthFilter').value}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}

function renderKpis(rows){const p=rows.length,d=rows.filter(hasQuality).length,pen=p-d,rate=p?d/p*100:0,pendingRate=p?pen/p*100:0;$('kPlan').textContent=fmt(p);$('kDone').textContent=fmt(d);$('kPending').textContent=fmt(pen);$('kRate').textContent=rate.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%';$('kDoneNote').textContent=`${rate.toLocaleString('pt-BR',{maximumFractionDigits:1})}% do planejado`;$('kPendingNote').textContent=`${pendingRate.toLocaleString('pt-BR',{maximumFractionDigits:1})}% ainda pendente`;$('kRateNote').textContent=`${fmt(d)} de ${fmt(p)} unidades`;$('meterPlan').style.width=p?'100%':'0%';$('meterDone').style.width=`${Math.max(0,Math.min(100,rate))}%`;$('meterPending').style.width=`${Math.max(0,Math.min(100,pendingRate))}%`;$('meterRate').style.width=`${Math.max(0,Math.min(100,rate))}%`;return{p,d,pen,rate}}
function sortGroups(gs){const s=$('sortFilter').value;return gs.sort((a,b)=>s==='rate'?a.rate-b.rate:s==='planned'?b.planned-a.planned:s==='az'?a.box.localeCompare(b.box,'pt-BR'):b.pending-a.pending||a.rate-b.rate)}
function renderExecutive(gs,k){const crit=gs.filter(g=>g.pending>0&&g.rate<70);const worst=[...gs].sort((a,b)=>b.pending-a.pending)[0];$('execTitle').textContent=k.pen?`${fmt(k.pen)} unidades ainda dependem da liberação da Qualidade`:'Todos os unidades do período estão liberados pela Qualidade';$('execText').textContent=worst&&k.pen?`${crit.length} tipos estão abaixo de 70% de conclusão. Maior pendência: ${worst.box}, com ${worst.pending} unidades.`:'Não há pendência de qualidade nos filtros atuais.';$('execTag').textContent=k.pen?`${crit.length} tipos críticos`:'Período concluído';$('execTag').style.color=k.pen?'var(--red)':'var(--green)';$('execTag').style.background=k.pen?'var(--red-soft)':'var(--green-soft)'}
function groupProgressClass(rate){return rate<50?'low':rate<75?'mid':''}
function renderTypes(gs){
 const mode=$('viewFilter').value;
 let out=gs.filter(g=>mode==='pending'?g.pending>0:mode==='done'?g.done>0:true);
 out=sortGroups(out);const total=out.length;if(!showAll)out=out.slice(0,10);
 $('toggleTypes').textContent=showAll?'Mostrar Top 10':`Ver todos (${total})`;
 $('toggleTypes').style.display=total>10?'inline-block':'none';
 $('typeList').innerHTML=out.length?out.map(g=>`<button class="type-card" type="button" data-box="${esc(g.box)}"><div class="type-title"><strong title="${esc(g.box)}">${esc(g.box)}</strong><span>${esc(unique(g.rows.map(r=>r.family||r.sheet)).join(' · ')||'Produção')}</span></div><div class="num"><b>${g.planned}</b><span>carros</span></div><div class="num done"><b>${g.done}</b><span>qualidade</span></div><div class="num pending"><b>${g.pending}</b><span>faltam</span></div><div class="progress-cell"><div class="progress-top"><span>${g.done} liberados de ${g.planned}</span><b>${g.rate.toLocaleString('pt-BR',{maximumFractionDigits:1})}%</b></div><div class="progress-track"><div class="progress-fill ${groupProgressClass(g.rate)}" style="width:${Math.max(0,Math.min(100,g.rate))}%"></div></div><div class="progress-caption">Clique para abrir os unidades desse tipo.</div></div></button>`).join(''):'<div class="empty">Nenhum modelo encontrado para os filtros selecionados.</div>';
}
function renderCritical(gs){const arr=[...gs].filter(g=>g.pending>0).sort((a,b)=>b.pending-a.pending).slice(0,5);const max=arr[0]?.pending||1;$('criticalList').innerHTML=arr.length?arr.map(g=>`<div class="critical"><div class="critical-top"><strong title="${esc(g.box)}">${esc(g.box)}</strong><span class="critical-count">${g.pending} pendentes</span></div><div class="critical-meta">${g.done}/${g.planned} liberados · ${g.rate.toLocaleString('pt-BR',{maximumFractionDigits:1})}% concluído</div><div class="critical-bar"><span style="width:${g.pending/max*100}%"></span></div></div>`).join(''):'<div class="empty" style="padding:22px 8px">Nenhuma pendência.</div>'}
function renderMix(){
 const rows=baseRows();
 const total=rows.length;
 const q=norm($('mixSearch')?.value||'');
 const mode=$('mixMode')?.value||'all';
 const order=$('mixOrder')?.value||'planned';
 let data=grouped(rows).map(g=>({name:g.box,planned:g.planned,done:g.done,pending:g.pending,share:total?g.planned/total*100:0}));
 if(q)data=data.filter(x=>norm(x.name).includes(q));
 if(mode==='pending')data=data.filter(x=>x.pending>0);
 if(mode==='done')data=data.filter(x=>x.done>0);
 data.sort((a,b)=>order==='az'?a.name.localeCompare(b.name,'pt-BR'):order==='pending'?(b.pending-a.pending||b.planned-a.planned):order==='done'?(b.done-a.done||b.planned-a.planned):(b.planned-a.planned||a.name.localeCompare(b.name,'pt-BR')));
 $('mixSummary').textContent=`${data.length} produtos · ${fmt(data.reduce((s,x)=>s+x.planned,0))} unidades planejados`;
 const grid=$('mixGrid');
 if(!data.length){grid.style.gridTemplateColumns='1fr';grid.innerHTML='<div class="mix-empty">Nenhum produto encontrado com esse filtro no mix.</div>';return}
 grid.style.gridTemplateColumns=`repeat(${data.length},minmax(92px,1fr))`;
 const max=Math.max(1,...data.map(x=>x.planned));
 grid.innerHTML=data.map(x=>{
  const hp=x.planned/max*185,hd=x.done/max*185;
  const title=esc(x.name);
  return`<div class="mix-col" title="${title}: ${x.planned} planejados, ${x.done} liberados, ${x.pending} pendentes">
   <span class="mix-share">${x.share.toLocaleString('pt-BR',{maximumFractionDigits:1})}%</span>
   <div class="mix-bars">
    <div class="mix-bar plan ${x.planned?'':'zero'}" style="height:${Math.max(x.planned?5:2,hp)}px"><span class="mix-value">${x.planned||0}</span></div>
    <div class="mix-bar done ${x.done?'':'zero'}" style="height:${Math.max(x.done?5:2,hd)}px"><span class="mix-value">${x.done||0}</span></div>
   </div>
   <div class="mix-label">${title}</div>
  </div>`
 }).join('')
}
function isoLocal(y,m,d){return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
function easterDate(year){let a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=(h+l-7*m+114)%31+1;return new Date(year,month-1,day)}
function addDays(date,n){const d=new Date(date);d.setDate(d.getDate()+n);return d}
function factoryHolidays(year){const out=[
 [1,1,'Confraternização Universal'],[4,21,'Tiradentes'],[5,1,'Dia do Trabalho'],[7,9,'Revolução Constitucionalista (SP)'],[9,7,'Independência do Brasil'],[10,12,'Nossa Senhora Aparecida'],[11,2,'Finados'],[11,15,'Proclamação da República'],[11,20,'Consciência Negra'],[12,25,'Natal']
 ].map(([m,d,name])=>({date:isoLocal(year,m,d),name}));const easter=easterDate(year),gf=addDays(easter,-2),cc=addDays(easter,60);out.push({date:isoLocal(gf.getFullYear(),gf.getMonth()+1,gf.getDate()),name:'Sexta-feira Santa'});out.push({date:isoLocal(cc.getFullYear(),cc.getMonth()+1,cc.getDate()),name:'Corpus Christi'});return out.sort((a,b)=>a.date.localeCompare(b.date))}
function holidaysInMonth(mk){if(!mk)return[];const [y,m]=mk.split('-').map(Number);return factoryHolidays(y).filter(h=>Number(h.date.slice(5,7))===m).filter(h=>{const d=new Date(h.date+'T12:00:00');const wd=d.getDay();return wd!==0&&wd!==6})}
function factoryMonthDays(mk,extra=0){if(!mk)return 0;const h=holidaysInMonth(mk).length;return Math.max(0,22-h-Math.max(0,Number(extra)||0))}
function elapsedFactoryDays(mk,extra=0){if(!mk)return 0;const [y,m]=mk.split('-').map(Number),now=new Date(),sel=y*12+(m-1),cur=now.getFullYear()*12+now.getMonth();if(sel<cur)return factoryMonthDays(mk,extra);if(sel>cur)return 0;const hol=new Set(holidaysInMonth(mk).map(h=>h.date));let elapsed=0;for(let day=1;day<now.getDate();day++){const d=new Date(y,m-1,day),wd=d.getDay(),iso=isoLocal(y,m,day);if(wd!==0&&wd!==6&&!hol.has(iso))elapsed++}return Math.min(factoryMonthDays(mk,extra),elapsed)}
function remainingFactoryDays(mk,extra=0){if(!mk)return 0;const [y,m]=mk.split('-').map(Number),now=new Date(),sel=y*12+(m-1),cur=now.getFullYear()*12+now.getMonth(),total=factoryMonthDays(mk,extra);if(sel>cur)return total;if(sel<cur)return 0;return Math.max(0,total-elapsedFactoryDays(mk,extra))}
function dailyContextRows(){return goalContextRows($('monthFilter').value)}
function todayIso(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function allocateToday(groups,totalToday,totalPending){const data=groups.filter(g=>g.pending>0).map(g=>{const raw=totalPending?totalToday*g.pending/totalPending:0;return{...g,raw,today:Math.floor(raw),frac:raw-Math.floor(raw)}});let left=Math.max(0,totalToday-data.reduce((s,x)=>s+x.today,0));data.sort((a,b)=>b.frac-a.frac||b.pending-a.pending);for(let i=0;i<data.length&&left>0;i++){if(data[i].today<data[i].pending){data[i].today++;left--}}return data.sort((a,b)=>b.today-a.today||b.raw-a.raw||b.pending-a.pending)}
function renderDailyTarget(){const rows=dailyContextRows(),pendingRows=rows.filter(r=>!hasQuality(r)),mk=$('monthFilter').value,extra=Number($('dailyExtraHolidays')?.value||0),officialHolidays=holidaysInMonth(mk),monthDays=factoryMonthDays(mk,extra),days=remainingFactoryDays(mk,extra),total=pendingRows.length,avg=days?total/days:0,todayTarget=days?Math.ceil(avg):0,today=todayIso(),doneToday=rows.filter(r=>(r.quality||'')===today).length,gap=Math.max(todayTarget-doneToday,0),gs=grouped(rows).filter(g=>g.pending>0).sort((a,b)=>b.pending-a.pending),alloc=allocateToday(gs,todayTarget,total);$('dailyPending').textContent=fmt(total);$('dailyDays').textContent=fmt(days);$('dailyDaysNote').textContent=`${monthDays} dias no mês · base 22`;$('dailyHolidayCount').textContent=fmt(officialHolidays.length+extra);$('dailyHolidayNote').textContent=officialHolidays.length?officialHolidays.map(h=>h.name).join(' · ')+(extra?` · +${extra} extra${extra>1?'s':''}`:''):(extra?`${extra} parada${extra>1?'s':''} extra${extra>1?'s':''}`:'nenhum feriado em dia produtivo');$('dailyAvg').textContent=days?avg.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}):'—';$('dailyTodayTarget').textContent=days?fmt(todayTarget):'—';$('dailyTodayNote').textContent=days?`${fmt(total)} pendentes ÷ ${fmt(days)} dias restantes`:'período encerrado';$('dailyDoneToday').textContent=fmt(doneToday);$('dailyGap').textContent=days?fmt(gap):'—';$('dailyGapNote').textContent=days?(gap?`${fmt(doneToday)} de ${fmt(todayTarget)} já liberados hoje`:'meta de hoje atingida'):'sem meta diária';$('dailySummary').textContent=days?`${gs.length} tipos · ${fmt(total)} pendentes · ${avg.toLocaleString('pt-BR',{maximumFractionDigits:1})}/dia · ${monthDays} dias úteis no mês`:'Período encerrado';const bars=$('dailyBars');if(!gs.length){bars.innerHTML='<div class="daily-today-empty">Carteira fechada: não existem unidades pendentes nesse período.</div>'}else if(!days){bars.innerHTML='<div class="daily-today-empty">O período selecionado já encerrou. Se houver carteira residual, ajuste as paradas extras somente para planejamento futuro.</div>'}else{const max=Math.max(...gs.map(g=>g.pending/days),.01);bars.innerHTML=gs.map(g=>{const per=g.pending/days,w=Math.max(3,per/max*100);return `<div class="daily-bar-row" title="${esc(g.box)}: faltam ${g.pending}; média necessária ${per.toLocaleString('pt-BR',{maximumFractionDigits:2})} por dia"><div class="daily-bar-name">${esc(g.box)}</div><div class="daily-pending">${g.pending} faltam</div><div class="daily-meter"><span style="width:${w}%"></span></div><div class="daily-rate">${per.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})}<small>/dia</small></div></div>`}).join('')}const list=$('dailyTodayList'),active=alloc.filter(x=>x.today>0);list.innerHTML=days&&active.length?active.map(x=>`<div class="daily-today-item"><strong>${esc(x.box)}</strong><span>${x.today}</span><small>${x.pending} ainda pendentes · média ${(x.pending/days).toLocaleString('pt-BR',{maximumFractionDigits:1})}/dia</small></div>`).join(''):'<div class="daily-today-empty">Sem meta sugerida para hoje neste período.</div>';$('dailyFootnote').textContent=days?`Parâmetro ilustrativo: 22 dias de produção no mês menos feriados oficiais que caem em dias produtivos${extra?` e ${extra} parada${extra>1?'s':''} extra${extra>1?'s':''}`:''}. Restam ${days} dias para fechar a carteira; por isso a meta necessária é ${avg.toLocaleString('pt-BR',{maximumFractionDigits:1})} unidades/dia.`:'O mês selecionado não possui mais dias de produção disponíveis pela regra de calendário.'}


function normalizeProdFamily(f){return norm(f)}
function prodMonthKey(d){return String(d||'').slice(0,7)}
function prodMonthLabel(k){if(!k)return'';const [y,m]=k.split('-').map(Number);return new Intl.DateTimeFormat('pt-BR',{month:'short',year:'2-digit'}).format(new Date(y,m-1,1)).replace('.','')}
function prodIndexNonWorkingDays(year){
 const days=new Set(factoryHolidays(year).map(h=>h.date));
 const easter=easterDate(year);
 const carnivalMon=addDays(easter,-48),carnivalTue=addDays(easter,-47);
 days.add(isoLocal(carnivalMon.getFullYear(),carnivalMon.getMonth()+1,carnivalMon.getDate()));
 days.add(isoLocal(carnivalTue.getFullYear(),carnivalTue.getMonth()+1,carnivalTue.getDate()));
 
 return days
}
function prodDaysForMonth(k,monthRows){
 if(!k)return 0;
 const [y,m]=k.split('-').map(Number),now=new Date(),monthLast=new Date(y,m,0).getDate();
 const validDates=monthRows.map(r=>r.date).filter(d=>String(d||'').startsWith(k)).sort();
 if(!validDates.length)return 0;
 const lastRelease=validDates[validDates.length-1],lastReleaseDay=Number(String(lastRelease).slice(8,10))||monthLast;
 const selected=y*12+(m-1),current=now.getFullYear()*12+now.getMonth();
 const endDay=selected===current?Math.min(monthLast,lastReleaseDay):monthLast;
 const nonWorking=prodIndexNonWorkingDays(y);
 let days=0;
 for(let d=1;d<=endDay;d++){
   const dt=new Date(y,m-1,d),wd=dt.getDay(),iso=isoLocal(y,m,d);
   if(wd!==0&&wd!==6&&!nonWorking.has(iso))days++;
 }
 return days
}
function prodIndexData(){
 const per=$('prodIndexPeriod')?.value||'all',fams=['LINHA A','LINHA B','LINHA C','LINHA D'];
 const valid=indexRecords.filter(r=>{
   const month=prodMonthKey(r.date),f=normalizeProdFamily(r.family);
   return !!r.date&&month>='2025-01'&&fams.includes(f);
 });
 const months=[...new Set(valid.map(r=>prodMonthKey(r.date)))].sort();
 const useMonths=per==='all'?months:months.slice(-Number(per));
 const data=useMonths.map(month=>{
   const rows=valid.filter(r=>prodMonthKey(r.date)===month),counts={'LINHA A':0,'LINHA B':0,'LINHA C':0,'LINHA D':0};
   rows.forEach(r=>{const f=normalizeProdFamily(r.family);if(fams.includes(f))counts[f]++});
   const days=prodDaysForMonth(month,rows),avg={};
   fams.forEach(f=>avg[f]=days?counts[f]/days:0);
   return{month,days,counts,avg,total:days?Object.values(counts).reduce((a,b)=>a+b,0)/days:0,quantity:Object.values(counts).reduce((a,b)=>a+b,0)};
 });
 return{data,fams,mode:'active'};
}
function resetProductionIndex(){
 const pairs={prodIndexCurrent:'—',prodIndexDays:'—',prodIndexDaysLabel:'Sem dados',prodIndexLeader:'—',prodIndexLeaderValue:'—',prodIndexSummary:'Aguardando dados do base de demonstração',prodIndexAudit:'Sem dados'};
 Object.entries(pairs).forEach(([id,value])=>{const el=$(id);if(el)el.textContent=value;});
 const legend=$('prodIndexLegend');if(legend)legend.innerHTML='';
}
function renderProductionIndex(){const canvas=$('prodIndexCanvas');if(!canvas)return;const {data,fams,mode}=prodIndexData();const colors={'LINHA A':'#245c8d','LINHA B':'#e57a26','LINHA C':'#16845a','LINHA D':'#d7a515'},fallback=['#5d7184','#7f63a8','#3f8290','#9c6b58'];const legend=$('prodIndexLegend');legend.innerHTML=fams.map((f,i)=>`<span><i style="background:${colors[f]||fallback[i%fallback.length]}"></i>${esc(f)}</span>`).join('')+`<span><i class="line" style="background:var(--red)"></i>Média total diária</span>`;if(!data.length){resetProductionIndex();canvas.width=900;canvas.style.width='900px';const c=canvas.getContext('2d');c.clearRect(0,0,900,390);c.fillStyle='#667b8d';c.font='600 13px Segoe UI';c.fillText('Sem dados de produção disponíveis.',30,50);return}const latest=data[data.length-1],leader=fams.map(f=>({f,v:latest.avg[f]||0})).sort((a,b)=>b.v-a.v)[0];$('prodIndexCurrent').textContent=latest.total.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});$('prodIndexDays').textContent=fmt(latest.days);$('prodIndexDaysLabel').textContent=`dias produtivos · ${prodMonthLabel(latest.month)}`;$('prodIndexLeader').textContent=leader?.f||'—';$('prodIndexLeaderValue').textContent=leader?`${leader.v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})} unidades/dia`:'—';$('prodIndexSummary').textContent=`Simulação local · ${prodMonthLabel(data[0].month)} → ${prodMonthLabel(latest.month)} · ${fmt(latest.quantity)} unidades demonstrativas · ${fmt(latest.days)} dias úteis ilustrativos`;$('prodIndexNote').textContent='Média ilustrativa: unidades concluídas por família divididas por dias úteis estimados. Nenhum indicador representa produção real.';if($('prodIndexAudit'))$('prodIndexAudit').textContent='DEMO: indicadores calculados sobre dados fictícios';const isFs=document.fullscreenElement===$('productionIndexPanel'),parent=canvas.parentElement,cssH=isFs?Math.max(560,window.innerHeight-250):430,left=isFs?58:50,right=20,top=32,bottom=54,minGroup=isFs?100:90,cssW=Math.max(parent.clientWidth-28,left+right+data.length*minGroup),dpr=Math.min(window.devicePixelRatio||1,3);canvas.style.width=cssW+'px';canvas.style.height=cssH+'px';canvas.width=Math.round(cssW*dpr);canvas.height=Math.round(cssH*dpr);const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cssW,cssH);const plotW=cssW-left-right,plotH=cssH-top-bottom,maxVal=Math.max(1,...data.map(x=>x.total),...data.flatMap(x=>fams.map(f=>x.avg[f]||0))),step=maxVal<=5?1:maxVal<=10?2:Math.ceil(maxVal/5),yMax=Math.ceil(maxVal/step)*step;ctx.font='10px "Segoe UI Variable",Segoe UI,sans-serif';ctx.textAlign='right';ctx.textBaseline='middle';for(let i=0;i<=5;i++){const v=yMax*i/5,y=top+plotH-(v/yMax)*plotH;ctx.strokeStyle='rgba(80,105,124,.17)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(cssW-right,y);ctx.stroke();ctx.fillStyle='#718494';ctx.fillText(v.toLocaleString('pt-BR',{maximumFractionDigits:1}),left-8,y)}ctx.save();ctx.translate(13,top+plotH/2);ctx.rotate(-Math.PI/2);ctx.fillStyle='#6c8192';ctx.textAlign='center';ctx.font='10px "Segoe UI Variable",Segoe UI,sans-serif';ctx.fillText('Unidades por dia',0,0);ctx.restore();const groupW=plotW/data.length,barArea=Math.min(groupW*.68,58),barGap=2,barW=Math.max(5,Math.min(12,(barArea-(fams.length-1)*barGap)/Math.max(fams.length,1))),linePts=[];data.forEach((row,i)=>{const cx=left+groupW*(i+.5),totalBars=fams.length*barW+(fams.length-1)*barGap,start=cx-totalBars/2;fams.forEach((f,j)=>{const v=row.avg[f]||0,h=v/yMax*plotH,x=start+j*(barW+barGap),y=top+plotH-h;ctx.fillStyle=colors[f]||fallback[j%fallback.length];ctx.beginPath();const rad=Math.min(3,barW/2);ctx.roundRect(x,y,barW,h, [rad,rad,0,0]);ctx.fill();if(v>=.08){ctx.fillStyle='#29465e';ctx.font='700 8.5px "Segoe UI Variable",Segoe UI,sans-serif';ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText(v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}),x+barW/2,Math.max(top+10,y-3))}});const ly=top+plotH-(row.total/yMax)*plotH;linePts.push([cx,ly,row.total]);ctx.fillStyle='#536b7e';ctx.font='750 9px "Segoe UI Variable",Segoe UI,sans-serif';ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText(prodMonthLabel(row.month),cx,top+plotH+13);ctx.fillStyle='#91a0ab';ctx.font='8px "Segoe UI Variable",Segoe UI,sans-serif';ctx.fillText(`${row.days}d`,cx,top+plotH+28)});ctx.strokeStyle='#d71920';ctx.lineWidth=isFs?3.2:2.8;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();linePts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();linePts.forEach(p=>{ctx.fillStyle='#fff';ctx.strokeStyle='#d71920';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p[0],p[1],isFs?4.5:4,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#d71920';ctx.font=isFs?'800 10px "Segoe UI Variable",Segoe UI,sans-serif':'800 9px "Segoe UI Variable",Segoe UI,sans-serif';ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText(p[2].toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}),p[0],Math.max(top+10,p[1]-7))});}

function toggleProdIndexFullscreen(){const panel=$('productionIndexPanel');if(!panel)return;if(document.fullscreenElement===panel){document.exitFullscreen?.();return}panel.requestFullscreen?.().catch(()=>{})}
function syncProdIndexFullscreen(){const panel=$('productionIndexPanel'),btn=$('prodIndexFullscreen');if(btn)btn.textContent=document.fullscreenElement===panel?'↙ Sair da tela cheia':'⛶ Tela cheia';setTimeout(renderProductionIndex,80)}

function formatDataTimestamp(value){
 if(!value)return'—';const d=new Date(value);return Number.isNaN(d.getTime())?'—':d.toLocaleString('pt-BR');
}
function renderDataMeta(){
 $('headerMonth').textContent=longMonth($('monthFilter').value);
 $('headerBase').textContent=records.length?`${fmt(records.length)} registros · base de demonstração`:'Aguardando dados do base de demonstração';
 $('updatedAt').textContent=formatDataTimestamp(dataMeta.updatedAt);
}
function render(){
 const before=window.ProdPulseMotion?.capture?.()||{};
 const rows=baseRows(),k=renderKpis(rows),gs=grouped(rows);
 renderExecutive(gs,k);renderDailyTarget();renderGoalReport();renderTypes(gs);renderCritical(gs);renderProductionIndex();renderMix();
 renderDataMeta();
 $('baseSummary').textContent=records.length?`${fmt(rows.length)} unidades na carteira filtrada · dados sintéticos locais`:'Nenhum dado carregado ainda';
 if(selectedBox)setPhoto(selectedBox);
 if($('detailModal')?.classList.contains('open')){
   if(rowsForBox(selectedBox).length)renderDetail(); else closeDetail();
 }
 window.ProdPulseMotion?.afterRender?.(before);
}
function rowsForBox(box){return baseRows().filter(r=>r.box===box)}
function openDetail(box,opener=null){
 detailReturnFocus=opener||document.activeElement;selectedBox=box;setPhoto(box);detailView='all';$('detailSearch').value='';
 document.querySelectorAll('[data-detail]').forEach(b=>b.classList.toggle('active',b.dataset.detail==='all'));
 renderDetail();$('detailModal').classList.add('open');$('detailModal').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
 setTimeout(()=>$('closeDetail')?.focus(),0);
 if($('detailVideo').style.display!=='none')$('detailVideo').play().catch(()=>{});
}
function closeDetail(){
 const modal=$('detailModal');if(!modal?.classList.contains('open'))return;
 modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.style.overflow='';$('detailVideo').pause();
 const target=detailReturnFocus;detailReturnFocus=null;if(target&&typeof target.focus==='function')setTimeout(()=>target.focus(),0);
}
function detailRows(){let r=rowsForBox(selectedBox);if(detailView==='pending')r=r.filter(x=>!hasQuality(x));if(detailView==='done')r=r.filter(hasQuality);const q=norm($('detailSearch').value);if(q)r=r.filter(x=>[x.client,x.tc,x.order,x.lot].some(v=>norm(v).includes(q)));return r}
function renderDetail(){const all=rowsForBox(selectedBox),done=all.filter(hasQuality).length,pending=all.length-done,rate=all.length?done/all.length*100:0;$('detailTitle').textContent=selectedBox;$('detailSubtitle').textContent=`${longMonth($('monthFilter').value)} · ${all.length} unidades nesse tipo`;$('dPlan').textContent=fmt(all.length);$('dDone').textContent=fmt(done);$('dPending').textContent=fmt(pending);$('dRate').textContent=rate.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%';const rows=detailRows();$('detailBody').innerHTML=rows.length?rows.map((r,i)=>{const src=photoSrcForBox(r.box);return `<tr class="detail-row" data-index="${i}"><td class="thumb-cell">${src?`<img class="thumb-mini" src="${src}" alt="${esc(r.box||'Foto')}" onerror="this.style.display='none'">`:`<div class="thumb-placeholder">—</div>`}</td><td>${esc(r.client||'-')}</td><td>${esc(r.tc||'-')}</td><td>${esc(r.order||'-')}</td><td>${esc(r.lot||'-')}</td><td>${fmtDate(r.planned)}</td><td>${hasQuality(r)?fmtDate(r.quality||r.qualityRaw):'-'}</td><td><span class="chip ${hasQuality(r)?'ok':'pending'}"><i class="dot"></i>${hasQuality(r)?'Liberado':'Pendente'}</span></td></tr>`}).join(''):'<tr><td colspan="8">Nenhum registro encontrado.</td></tr>';if(rows.length){setDetailPhotoForRow(rows[0]);$('detailBody').querySelector('.detail-row')?.classList.add('selected');}}
function csvCell(v){
 let s=String(v??'');
 if(/^[=+\-@]/.test(s))s=`'${s}`;
 return /[;"\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
}
function exportDetail(){const rows=detailRows(),head=['Cliente','Item','Pedido','Lote','Data Planejada','Concluído em','Status'];const lines=[head.join(';'),...rows.map(r=>[r.client,r.tc,r.order,r.lot,fmtDate(r.planned),hasQuality(r)?fmtDate(r.quality||r.qualityRaw):'',hasQuality(r)?'Liberado':'Pendente'].map(csvCell).join(';'))];const blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${selectedBox.replace(/[^a-z0-9]+/gi,'_')}_${$('monthFilter').value}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}


function showNotice(msg,error=false){const el=$('notice');if(!el)return;el.className='notice'+(error?' error':'');el.textContent=msg;el.style.display='block';}
function clearNotice(){const el=$('notice');if(el){el.style.display='none';el.textContent='';}}
function replaceData(payload,meta={}){
 if(!payload||!Array.isArray(payload.records)||!Array.isArray(payload.indexRecords))throw new Error('Payload validado inválido.');
 const previous={records,indexRecords,dataMeta:{...dataMeta},month:$('monthFilter')?.value||'',family:$('familyFilter')?.value||'',client:$('clientFilter')?.value||''};
 try{
   records=payload.records.map(x=>({...x}));
   indexRecords=payload.indexRecords.map(x=>({...x}));
   dataMeta={source:meta.source||'live',updatedAt:meta.updatedAt||'',receivedAt:meta.receivedAt||new Date().toISOString(),warning:meta.warning||''};
   fillFilters(false);
   if(previous.month&&[...$('monthFilter').options].some(o=>o.value===previous.month))$('monthFilter').value=previous.month;
   fillFilters(false);
   if(previous.family&&[...$('familyFilter').options].some(o=>o.value===previous.family))$('familyFilter').value=previous.family;
   if(previous.client&&[...$('clientFilter').options].some(o=>o.value===previous.client))$('clientFilter').value=previous.client;
   render();
   return true;
 }catch(error){
   records=previous.records;indexRecords=previous.indexRecords;dataMeta=previous.dataMeta;
   try{fillFilters(true);render();}catch(_){}
   throw error;
 }
}
function init(){fillFilters(true);render();}
function handleMonthChange(){const oldFam=$('familyFilter').value,oldCli=$('clientFilter').value;fillFilters(false);if([...$('familyFilter').options].some(o=>o.value===oldFam))$('familyFilter').value=oldFam;if([...$('clientFilter').options].some(o=>o.value===oldCli))$('clientFilter').value=oldCli;showAll=false;render();}
function toggleTypes(){showAll=!showAll;render();}
function hasData(){return records.length>0;}
function getDataMeta(){return {...dataMeta,records:records.length,indexRecords:indexRecords.length};}

function selectDetailRow(index,rowElement){
 const rows=detailRows(),row=rows[Number(index)];if(!row)return;
 $('detailBody').querySelectorAll('.detail-row').forEach(x=>x.classList.remove('selected'));
 rowElement?.classList.add('selected');setDetailPhotoForRow(row);
}
function setDetailView(view){detailView=['all','pending','done'].includes(view)?view:'all';document.querySelectorAll('[data-detail]').forEach(b=>b.classList.toggle('active',b.dataset.detail===detailView));renderDetail();}
window.addEventListener('ProdPulse:detail-filter',e=>setDetailView(e.detail));
window.ProdPulseApp=Object.freeze({
 init,replaceData,render,renderMix,renderDetail,renderDailyTarget,renderProductionIndex,toggleProdIndexFullscreen,syncProdIndexFullscreen,
 handleMonthChange,toggleTypes,openDetail,closeDetail,exportDetail,setManualGoal,usePlannedGoal,downloadGoalReport,setMediaMode,
 showNotice,clearNotice,hasData,getDataMeta,setDetailView,selectDetailRow
});

})();
