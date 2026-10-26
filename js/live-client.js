/* Demo local: não aceita endpoints externos nem persiste dados corporativos. */
(function(){
  'use strict';
  const APP=window.ProdPulseApp;
  const $=id=>document.getElementById(id);
  let busy=false;
  function status(message,kind){const el=$('liveStatus');if(el){el.className='live-status '+kind;el.textContent=message;}}
  function isSynthetic(data){
    if(data?.source!=='DEMONSTRACAO - BASE TOTALMENTE SINTETICA' ||
       !Array.isArray(data.records) || !Array.isArray(data.indexRecords) ||
       data.records.length===0)return false;
    const clients=new Set();
    for(const row of data.records){
      const client=String(row?.client||'');
      clients.add(client);
      if(!/^Cliente Fictício (0[1-9]|10)$/.test(client) ||
         !/^DEMO-LOTE-\d{5}$/.test(String(row?.lot||'')) ||
         !/^EXEMPLO-PED-\d{5}-\d{4}$/.test(String(row?.order||'')) ||
         !/^ITEM-FICT-(ORION|ATLAS|VEGA|SOLARIS|NEO|PRISMA|PULSE|AURA)-\d{5}$/.test(String(row?.tc||'')) ||
         !/^Modelo (Orion|Atlas|Vega|Solaris|Neo|Prisma|Pulse|Aura)$/.test(String(row?.box||'')))return false;
    }
    return clients.size<=10;
  }
  async function refresh(){
    if(busy)return false;
    busy=true;status('● DEMO: lendo dados fictícios locais','loading');
    try{
      const response=await fetch('demo-data.json',{cache:'no-store',credentials:'omit'});
      if(!response.ok)throw new Error('Não foi possível carregar o JSON demonstrativo.');
      const data=await response.json();
      if(!isSynthetic(data))throw new Error('Bloqueado: esta versão só aceita registros fictícios do pacote público.');
      APP.replaceData(data,{source:'demo',updatedAt:data.updatedAt,receivedAt:new Date().toISOString()});
      status('● DEMO · dados 100% fictícios','online');
      APP.clearNotice();return true;
    }catch(error){status('⚠ DEMO indisponível','offline');APP.showNotice(error.message,true);return false;}
    finally{busy=false;}
  }
  function init(){$('refreshLiveToolbar')?.addEventListener('click',refresh);refresh();}
  window.ProdPulseLive=Object.freeze({init,refresh});
})();
