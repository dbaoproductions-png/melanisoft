const CERBERE_SS1_LAYER_TRACE_20260928_VERSION='2026-09-28.1';

function auditerTraceSs1Cerbere20260928(){
  const base=chargerCerbereCockpitBaseRapide20260903_();
  const trace=[];
  function s(etape){const p=base&&base.periodes&&base.periodes[0]||{},v=p.v37||{},c=v.cockpit20260902||{};trace.push({etape:ss(etape),ss1:Number(v.ss1||0),shbt1:Number(v.shbt1||0),rt1:Number(v.rt1||0),cft1:Number(v.cft1||0),het1:Number(v.het1||0),p1:Number(c.p1Total||0),statut:ss(v.ss1Statut)});}
  function ss(x){return String(x||'');}
  s('base rapide');
  corrigerSuspensionsActionsEvenements20260903_(base);s('apres suspensions');
  corrigerReelPilotableDateAchat20260902_(base);s('apres reel pilotable');
  (base.periodes||[]).forEach(function(p,i){enrichirCycleCockpitCerbere20260902_(p,i);});s('apres enrichissement cockpit');
  const a=typeof lireAjustementsChargesFixes==='function'?lireAjustementsChargesFixes():null;
  appliquerDoctrineP1ComptableGuideVieCerbere20260912_(base,a);s('apres doctrine P1');
  appliquerReportCbCycleSuivant20260905_(base,a);s('apres report CB');
  const out={ok:true,version:CERBERE_SS1_LAYER_TRACE_20260928_VERSION,trace:trace};
  console.log('[AUDIT TRACE SS1 CERBERE 20260928] '+JSON.stringify(out));
  return out;
}
