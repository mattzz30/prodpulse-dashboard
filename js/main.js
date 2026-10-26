/* Bootstrap e eventos da interface. */
(function(){
  'use strict';
  const APP=window.ProdPulseApp,LIVE=window.ProdPulseLive,$=id=>document.getElementById(id);
  function debounce(fn,wait=150){let timer=0;return(...args)=>{clearTimeout(timer);timer=setTimeout(()=>fn(...args),wait);};}
  function trapFocus(event,modal){
    if(event.key!=='Tab'||!modal?.classList.contains('open'))return;
    const focusable=[...modal.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(el=>el.offsetParent!==null);
    if(!focusable.length)return;const first=focusable[0],last=focusable[focusable.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
  function bind(){
    $('monthFilter')?.addEventListener('change',APP.handleMonthChange);
    ['familyFilter','clientFilter','viewFilter','sortFilter','mixMode','mixOrder'].forEach(id=>$(id)?.addEventListener('change',APP.render));
    $('searchFilter')?.addEventListener('input',debounce(APP.render,150));
    $('mixSearch')?.addEventListener('input',debounce(APP.renderMix,120));
    $('toggleTypes')?.addEventListener('click',APP.toggleTypes);
    $('typeList')?.addEventListener('click',event=>{const card=event.target.closest('.type-card');if(card)APP.openDetail(card.dataset.box,card);});
    $('closeDetail')?.addEventListener('click',APP.closeDetail);
    $('detailModal')?.addEventListener('click',event=>{if(event.target===$('detailModal'))APP.closeDetail();});
    $('detailSearch')?.addEventListener('input',debounce(APP.renderDetail,120));
    $('detailBody')?.addEventListener('click',event=>{const row=event.target.closest('.detail-row');if(row)APP.selectDetailRow(row.dataset.index,row);});
    document.querySelectorAll('[data-detail]').forEach(button=>button.addEventListener('click',()=>{
      // detail view is internal to app; simulate existing state via button dataset through a small app hook if available.
      window.dispatchEvent(new CustomEvent('ProdPulse:detail-filter',{detail:button.dataset.detail}));
    }));
    $('exportBtn')?.addEventListener('click',APP.exportDetail);
    document.addEventListener('keydown',event=>{if(event.key==='Escape')APP.closeDetail();trapFocus(event,$('detailModal'));trapFocus(event,$('liveConfigModal'));});
    $('dailyExtraHolidays')?.addEventListener('input',APP.renderDailyTarget);
    $('dailyAuto')?.addEventListener('click',()=>{$('dailyExtraHolidays').value='0';APP.renderDailyTarget();});
    $('prodIndexPeriod')?.addEventListener('change',APP.renderProductionIndex);
    $('prodIndexDaysMode')?.addEventListener('change',APP.renderProductionIndex);
    $('prodIndexFullscreen')?.addEventListener('click',APP.toggleProdIndexFullscreen);
    document.addEventListener('fullscreenchange',APP.syncProdIndexFullscreen);
    window.addEventListener('resize',debounce(APP.renderProductionIndex,160));
    $('goalInput')?.addEventListener('change',APP.setManualGoal);
    $('goalInput')?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();APP.setManualGoal();$('goalInput').blur();}});
    $('usePlannedGoal')?.addEventListener('click',APP.usePlannedGoal);
    $('downloadGoalReport')?.addEventListener('click',APP.downloadGoalReport);
    $('typeShowVideo')?.addEventListener('click',()=>APP.setMediaMode('type','video'));
    $('typeShowPhoto')?.addEventListener('click',()=>APP.setMediaMode('type','photo'));
    $('detailShowVideo')?.addEventListener('click',()=>APP.setMediaMode('detail','video'));
    $('detailShowPhoto')?.addEventListener('click',()=>APP.setMediaMode('detail','photo'));
  }
  APP.init();bind();LIVE.init();
})();
