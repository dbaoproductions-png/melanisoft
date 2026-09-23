/*
 * BudgetSoft — reprise historique intermodule des charges fixes — 2026-09-23.
 *
 * Règle : uniquement des identités bancaires démontrées par mandat/contrat,
 * libellé marchand stable ou, pour deux doublons connus, par cadence observée.
 * Aucune décision par score seul.
 */
const MAINT_CF_HIST_IDENTITES_20260923_VERSION='2026-09-23.1';

function reparerHistoriqueChargesFixesIdentites20260923(){
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    if(typeof migrerLienHistoriqueChargeFixeBudgetSoft_!=='function')
      throw new Error('Primitive canonique de migration historique indisponible.');

    const charges=lireTable_('Charges_fixes')||[];
    const operations=lireTable_('Operations')||[];
    const byId={};charges.forEach(function(c){byId[String(c&&c.id||'').trim()]=c;});
    function uniqueLabel_(libelle){
      const n=String(libelle||'').trim().toLowerCase();
      const m=charges.filter(function(c){return String(c&&c.libelle||'').trim().toLowerCase()===n;});
      if(m.length!==1)throw new Error('Charge non unique pour libellé "'+libelle+'" : '+m.length);
      return String(m[0].id||'');
    }
    function brut_(o){return String(o&&o.libelle_bancaire||o&&o.libelle||'');}
    function debit_(o){return Number(o&&o.montant||0)<0;}
    function date_(o){const d=new Date(o&&o.date_comptable||o&&o.date||0);return isNaN(d)?null:d;}
    function iso_(d){return d?Utilities.formatDate(d,Session.getScriptTimeZone()||'Europe/Paris','yyyy-MM-dd'):'';}

    const ids={
      creatis:uniqueLabel_('Creatis'),
      audiens:uniqueLabel_('Audiens Sante Prevoyance'),
      chatgpt:uniqueLabel_('Chatgpt'),
      casden:uniqueLabel_('Casden'),
      free:uniqueLabel_('Free Telecom'),
      hello:uniqueLabel_('Hello Prime Duo Cotisation'),
      cofidis:uniqueLabel_('Cofidis'),
      gaz:uniqueLabel_('Totalenergies gaz'),
      elec:uniqueLabel_('Totalenergies électricité'),
      kozoo:uniqueLabel_('Prélèvement Kozoo'),
      ionos:uniqueLabel_('Ionos Sarl'),
      surav36:'13a6e96a-05ec-4d91-b237-bd96142cf156',
      surav743:'ed1dab46-9a5c-4b23-88fc-c222541e6931',
      surav1039:'561894c1-826a-481f-8bc5-f30db10e01c5',
      surav5:'14ec2d0e-81e7-4def-ad29-3b4b76e476bf',
      googleFin:'4f91ac6e-513e-4329-b32e-72d5127602f9',
      google15:'14138a72-50a8-4f5c-89e9-db6d60f0bb92',
      impotPas:'306469a1-1301-4694-b024-2542041d5d76',
      impot169:'eba61538-6162-458b-8f2c-9d94f8df7ea1',
      impot194:'434e9697-9708-4ee8-83e1-bc3535bcf199',
      nrj186:'6de33ef0-5013-4ab2-8838-22059624cee7',
      nrj189Actif:'17fa9825-9a4c-41f2-9c9c-a9f321279f54',
      nrj189Ancien:'a4700cb4-ca20-4353-ac5d-91588717d53d',
      oney:'8b29a127-0c69-47e2-89b4-7fa01dd8d772',
      floa:'bdcbe33b-8df3-427f-985c-9d6b467ffd57',
      carrefour:'22d488fe-6304-4bd0-ae87-28020fcd447f'
    };
    Object.keys(ids).forEach(function(k){if(!byId[ids[k]])throw new Error('Charge cible absente '+k+' '+ids[k]);});

    const connuWrong=new Set(['8f56156c-141b-4531-8e4a-1169e8dddf67']);
    const candidats=[];
    function propose_(o,cfId,motif){
      if(!debit_(o)||!cfId)return;
      const opId=String(o&&o.id||'').trim();if(!opId)return;
      const avant=String(o&&o.charge_fixe_id||'').trim();
      if(avant===cfId)return;
      if(avant&&avant!==cfId&&!connuWrong.has(opId))
        throw new Error('Lien existant différent sur '+opId+' : '+avant+' -> '+cfId+' ('+motif+')');
      candidats.push({op:o,cfId:cfId,motif:motif,avant:avant});
    }

    operations.forEach(function(o){
      if(!debit_(o))return;
      const b=brut_(o),u=b.toUpperCase(),d=date_(o),m=Math.abs(Number(o.montant||0));

      if(/CREATIS/.test(u)&&/KF20250506150721693214/.test(u))return propose_(o,ids.creatis,'CREATIS · mandat KF20250506150721693214');
      if(/AUDIENS SANTE PREVOYANCE/.test(u)&&/RUOP000265832Y/.test(u))return propose_(o,ids.audiens,'AUDIENS · mandat RUOP000265832Y');
      if(/OPENAI\s*\*?CHATGPT/.test(u))return propose_(o,ids.chatgpt,'OPENAI CHATGPT');
      if(/S0064401451/.test(u))return propose_(o,ids.casden,'CASDEN · prêt S0064401451');
      if(/FREE TELECOM/.test(u)&&/MDT\/48916213/.test(u))return propose_(o,ids.free,'FREE TELECOM · mandat 48916213');
      if(/HELLO PRIME DUO/.test(u))return propose_(o,ids.hello,'HELLO PRIME DUO');
      if(/COFIDIS/.test(u)&&/KF20251230162056318408/.test(u))return propose_(o,ids.cofidis,'COFIDIS · mandat KF20251230162056318408');
      if(/TOTALENERGIES/.test(u)&&/101208284/.test(u)&&Math.abs(m-220)<0.001)return propose_(o,ids.gaz,'TOTALENERGIES client 101208284 · échéance 220');
      if(/TOTALENERGIES/.test(u)&&/101208284/.test(u)&&Math.abs(m-61)<0.001)return propose_(o,ids.elec,'TOTALENERGIES client 101208284 · échéance 61');
      if(/KOZOO/.test(u)&&/KOZOO035471/.test(u))return propose_(o,ids.kozoo,'KOZOO · mandat KOZOO035471');
      if(/IONOS SARL/.test(u))return propose_(o,ids.ionos,'IONOS SARL');

      if(/SURAVENIR/.test(u)&&/MDT\/7168249702201/.test(u))return propose_(o,ids.surav36,'SURAVENIR · mandat 7168249702201');
      if(/SURAVENIR/.test(u)&&/MDT\/7168249701101/.test(u))return propose_(o,ids.surav743,'SURAVENIR · mandat 7168249701101');
      if(/SURAVENIR/.test(u)&&/MDT\/7167932601101/.test(u))return propose_(o,ids.surav1039,'SURAVENIR · mandat 7167932601101');
      if(/SURAVENIR/.test(u)&&/MDT\/7167932602201/.test(u))return propose_(o,ids.surav5,'SURAVENIR · mandat 7167932602201');

      if(/GOOGLE ONE/.test(u)){
        if(/\bDU\s+15\d{4}\b/.test(u))return propose_(o,ids.google15,'GOOGLE ONE · abonnement échéance 15');
        if(/\bDU\s+(28|29|30|31)\d{4}\b/.test(u))return propose_(o,ids.googleFin,'GOOGLE ONE · abonnement fin de mois');
      }

      if(/D\.G\.F\.I\.P\.|DGFIP|IMPOT/.test(u)){
        if(/NNFR46ZZZ0050020F89B4D176418PAS2A(?:\s|$|REF)/.test(u))return propose_(o,ids.impotPas,'DGFIP PAS · mandat PAS2A');
        if(/\+\+FR46ZZZ005002M331018201519/.test(u))return propose_(o,ids.impot169,'DGFIP · mandat M331018201519');
        if(/NNFR46ZZZ005002M331053221190/.test(u))return propose_(o,ids.impot194,'DGFIP · mandat M331053221190');
      }

      if(/BOUYGUES TELECOM/.test(u)&&/MDT\/REF0018674091/.test(u))
        return propose_(o,ids.nrj186,'NRJ MOBILE · mandat REF0018674091');
      if(/BOUYGUES TELECOM/.test(u)&&/MDT\/REF0018919719/.test(u)){
        const cible=d&&d>=new Date('2026-08-01T00:00:00')?ids.nrj189Actif:ids.nrj189Ancien;
        return propose_(o,cible,'NRJ MOBILE · mandat REF0018919719 · régime '+(cible===ids.nrj189Actif?'actuel':'historique'));
      }

      if(/ONEY BANQUE ACCORD/.test(u)&&/BA444D8D69734A8CA9731B0749D00E33/.test(u))
        return propose_(o,ids.oney,'ONEY · mandat BA444D8D69734A8CA9731B0749D00E33');
      if(/\bFLOA\b/.test(u)&&/DE00FIN100051859932/.test(u))
        return propose_(o,ids.floa,'FLOA · mandat DE00FIN100051859932');
      if(/CARREFOUR BANQUE/.test(u)&&/CS00-50209416123100/.test(u)&&/LIB\/50209416123100\b/.test(u))
        return propose_(o,ids.carrefour,'CARREFOUR BANQUE · mandat CS00-50209416123100 · sous-compte 50209416123100');
    });

    const vus=new Set(),appliques=[];
    candidats.forEach(function(x){
      const opId=String(x.op.id||'');
      if(vus.has(opId))throw new Error('Opération proposée deux fois : '+opId);
      vus.add(opId);
      appliques.push(migrerLienHistoriqueChargeFixeBudgetSoft_(opId,x.cfId,x.motif));
    });

    if(typeof supprimerSnapshotChargesFixes20260828_==='function')supprimerSnapshotChargesFixes20260828_();
    if(typeof invaliderProjectionBudgetSoft_==='function')invaliderProjectionBudgetSoft_('maintenance-historique-cf-identites-20260923');

    const audit=typeof auditerChargesFixesIntermoduleBudgetSoft20260922==='function'
      ?auditerChargesFixesIntermoduleBudgetSoft20260922(6):null;
    const restant=typeof auditerHistoriqueChargesFixesNonRapprochees20260922==='function'
      ?auditerHistoriqueChargesFixesNonRapprochees20260922(6):null;
    const out={
      ok:!!(audit&&audit.ok),
      version:MAINT_CF_HIST_IDENTITES_20260923_VERSION,
      migrations:appliques.length,
      auditIntermodule:audit&&audit.synthese||null,
      chargesEncoreAvecCandidats:restant&&restant.chargesAvecCandidats,
      doctrine:'Migration par identité bancaire prouvée ; aucun score seul ; aucun amortissement de crédit rejoué.'
    };
    console.log('[MAINT HISTORIQUE CF IDENTITES 20260923] '+JSON.stringify(out));
    return out;
  }finally{lock.releaseLock();}
}
