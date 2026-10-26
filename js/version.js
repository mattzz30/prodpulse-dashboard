/* Identificação e pequenos aprimoramentos não funcionais. */
(function(){
  'use strict';
  const cfg=window.ProdPulseConfig;
  document.body.dataset.build=`V${cfg.version}`;
  const build=document.getElementById('appBuildLabel');if(build)build.textContent=cfg.buildLabel;
  ['.kpi-note','.panel-sub','.mix-note','.photo-caption span','.goal-report-text'].forEach(sel=>{
    document.querySelectorAll(sel).forEach(el=>{if(!el.title)el.title=el.textContent.trim();});
  });
})();
