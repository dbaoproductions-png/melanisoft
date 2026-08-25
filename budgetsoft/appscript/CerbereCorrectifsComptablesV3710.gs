const CERBERE_CORRECTIFS_COMPTABLES_V3710_VERSION='3.7.10';

/**
 * Passe comptable ciblée 3.7.10.
 * Ne touche ni à P0/P1, ni à l'UI, ni au Plan, ni à l'historisation R0.
 * Elle corrige uniquement trois briques auditées sur le classeur réel :
 * - SS1 depuis le relevé PDF certifié le plus proche de la frontière 27/28 ;
 * - exclusion des mouvements de trésorerie des recettes économiques Rt1 ;
 * - occurrences de charges fixes comparées au jour civil (pas à l'heure).
 */
function appliquerCorrectifsComptablesV3710_(base){
  if(!base||base.ok===false)return base;
  const operations=tableauCerbereV379_(lireTable_('Operations'));
  const charges=tableauCerbereV379_(lireTable_('Charges_fixes'));
  const controles=lireFeuilleDynamiqueCerbereV379_('Controles_releves');
  const categories=tableauCerbereV379_(lireTable_('Categories'));
  const actions=typeof lireFeuilleDynamiquePlan_==='function'
    ? tableauCerbereV379_(lireFeuilleDynamiquePlan_('Plan_Actions'))
    : lireFeuilleDynamiqueCerbereV379_('Plan_Actions');
  const rapprochements=typeof lireRapprochementsChargesFixes==='function'
    ? tableauCerbereV379_(lireRapprochementsChargesFixes())
    : lireFeuilleDynamiqueCerbereV379_('Rapprochements_charges_fixes');
  const cfMatchByOp=construireLiensCfCertainsV377_(operations,charges,rapprochements);
  const typesCat={};categories.forEach(c=>{typesCat[String(c&&c.nom||'').trim()]=normaliserV377_(c&&c.type);});
  const periodes=tableauCerbereV379_(base.periodes);
  let report=null;

  periodes.forEach((p,i)=>{
    if(!p||typeof p!=='object')return;
    const v=p.v37||(p.v37={}),periode=p.periode||p;

    // SS1 : le relevé peut être avant OU après le 28 ; on reconstitue dans les deux sens.
    if(i===0){
      const ss=calculerSS1ReleveProcheV3710_(operations,controles,periode);
      if(ss&&Number.isFinite(ss.montant)){
        v.ss1=arrV377_(ss.montant);v.soldeOuverture=v.ss1;v.ss1Audit=ss;
        v.ss1Statut='reconstitué depuis le relevé PDF certifié le plus proche de la frontière 27/28';
      }
    }else if(report!==null){
      v.ss1=arrV377_(report);v.soldeOuverture=v.ss1;
      v.ss1Statut='projeté depuis la fin Cerbère corrigée de la période précédente';
    }

    // Rt1 : les catégories de type tresorerie ne sont jamais des revenus économiques.
    if(i===0){
      let tresoreriePositive=0;const detail={};
      operations.forEach(o=>{
        const d=dateOperationBanqueV377_(o),m=Number(o&&o.montant||0),cat=String(o&&o.categorie||'').trim();
        if(!d||!dateDansCycleV377_(d,periode)||m<=0||typesCat[cat]!=='tresorerie')return;
        tresoreriePositive+=m;detail[cat]=arrV377_(Number(detail[cat]||0)+m);
      });
      v.rt1=arrV377_(Number(v.rt1||0)-tresoreriePositive);
      v.rt1Audit=v.rt1Audit&&typeof v.rt1Audit==='object'?v.rt1Audit:{};
      v.rt1Audit.tresorerieExclue=arrV377_(tresoreriePositive);
      v.rt1Audit.tresorerieExclueDetail=detail;
    }

    // CFt1 : même doctrine qu'en 3.7.9, mais dates normalisées au jour civil.
    const cfRef=calculerCfReferenceCycleV3710_(charges,actions,periode);
    const remplacements={};
    operations.forEach(o=>{
      const opId=String(o&&o.id||'').trim(),cfId=cfMatchByOp[opId],d=dateOperationBanqueV377_(o);
      if(!cfId||!d||!dateDansCycleV377_(d,periode))return;
      remplacements[cfId]=Number(remplacements[cfId]||0)+Math.abs(Number(o&&o.montant||0));
    });
    let cft1=0;
    tableauCerbereV379_(cfRef.lignes).forEach(c=>{
      cft1+=Object.prototype.hasOwnProperty.call(remplacements,c.id)?Number(remplacements[c.id]):Number(c.montant||0);
    });
    v.chargesFixesTotal=arrV377_(cfRef.total);v.cft1=arrV377_(cft1);
    v.cft1Audit={reference:arrV377_(cfRef.total),remplacements:remplacements,actionsAppliquees:cfRef.actionsAppliquees,version:CERBERE_CORRECTIFS_COMPTABLES_V3710_VERSION};

    // Recalcul strict des agrégats ; les molettes/enveloppes restent celles de la passe précédente.
    v.dt1=arrV377_(Number(v.cft1||0)+Number(v.dpt1||0)+Number(v.het1||0));
    v.sct1=arrV377_(Number(v.ss1||0)+Number(v.rt1||0)-v.dt1);
    v.rpt1=v.sct1;v.resteReellementPilotable=v.sct1;v.disponibleJusquau27=v.sct1;
    p.resteReellementPilotable=v.sct1;p.capacitePilotable=v.sct1;p.capaciteTresorerie=v.sct1;
    report=v.sct1;
  });

  base.version=CERBERE_CORRECTIFS_COMPTABLES_V3710_VERSION;
  base.diagnostic=base.diagnostic||{};
  base.diagnostic.correctifs_3710='SS1 relevé proche + trésorerie exclue de Rt1 + CF au jour civil';
  return base;
}

function calculerSS1ReleveProcheV3710_(operations,controles,periode){
  const debut=debutJourV377_(periode&&periode.debut);if(!debut)return null;
  const candidats=tableauCerbereV379_(controles).map(c=>({c:c,d:dateV377_(c&&c.date_cloture)}))
    .filter(x=>x.d&&Number.isFinite(Number(x.c&&x.c.solde_cloture)))
    .sort((a,b)=>Math.abs(a.d-debut)-Math.abs(b.d-debut));
  if(!candidats.length)return null;
  const ref=candidats[0],compte=String(ref.c.compte||''),refJour=debutJourV377_(ref.d),refFin=finJourV377_(ref.d);
  let montant=Number(ref.c.solde_cloture||0),variation=0,nb=0;
  tableauCerbereV379_(operations).forEach(o=>{
    const d=dateOperationBanqueV377_(o);if(!d||!operationDefinitiveV377_(o))return;
    if(compte&&String(o&&o.compte||'')!==compte)return;
    if(refJour>=debut){
      if(d>=debut&&d<=refFin){variation+=Number(o&&o.montant||0);nb++;}
    }else{
      if(d>refFin&&d<debut){variation+=Number(o&&o.montant||0);nb++;}
    }
  });
  montant=refJour>=debut?montant-variation:montant+variation;
  return {montant:arrV377_(montant),releveCloture:ref.d.toISOString(),soldeReleve:Number(ref.c.solde_cloture||0),variationEntreFrontiereEtReleve:arrV377_(variation),operationsUtilisees:nb,sens:refJour>=debut?'retour depuis relevé postérieur':'avance depuis relevé antérieur'};
}

function calculerCfReferenceCycleV3710_(charges,actions,periode){
  const lignes=[];let total=0;const actionsAppliquees=[],actionParCf={};
  tableauCerbereV379_(actions).forEach(a=>{
    const cf=String(a&&a.source_id||'').trim(),typ=normaliserV377_(a&&a.impact_type),d=jourCivilV3710_(a&&(a.date_effet||a.date_prevue));
    if(!cf||(typ.indexOf('baisse charge')<0&&typ.indexOf('baisse_charge')<0))return;
    (actionParCf[cf]||(actionParCf[cf]=[])).push({a:a,d:d});
  });
  tableauCerbereV379_(charges).forEach(c=>{
    const actif=String(c&&c.actif==null?'true':c.actif).toLowerCase();if(['false','non','0'].includes(actif))return;
    const occ=occurrenceChargeCycleV3710_(c,periode);if(!occ)return;
    const id=String(c&&c.id||''),montant=Math.abs(Number(c&&c.montant!=null?c.montant:c&&c.montant_indicatif||0));let neutralisee=false;
    tableauCerbereV379_(actionParCf[id]).forEach(x=>{if(x.d&&x.d<=occ){neutralisee=true;actionsAppliquees.push(String(x.a&&x.a.libelle||id));}});
    if(neutralisee)return;lignes.push({id:id,montant:montant,libelle:String(c&&c.libelle||'')});total+=montant;
  });
  return {total:arrV377_(total),lignes:lignes,actionsAppliquees:actionsAppliquees};
}

function occurrenceChargeCycleV3710_(c,periode){
  const p0=jourCivilV3710_(periode&&periode.debut),p1=jourCivilV3710_(periode&&periode.fin);if(!p0||!p1)return null;
  const dd=jourCivilV3710_(c&&c.date_debut),df=jourCivilV3710_(c&&c.date_fin);if(dd&&dd>p1)return null;if(df&&df<p0)return null;
  const freq=normaliserV377_(c&&c.frequence||'mensuelle'),jour=Math.max(1,Math.min(31,Number(c&&c.jour_execution||1)));
  if(freq.indexOf('ann')>=0){
    const base=dd||p0;
    for(let y=p0.getFullYear()-1;y<=p1.getFullYear()+1;y++){
      const d=new Date(y,base.getMonth(),Math.min(jour||base.getDate(),new Date(y,base.getMonth()+1,0).getDate()));
      if(d>=p0&&d<=p1&&(!dd||d>=dd)&&(!df||d<=df))return d;
    }
    return null;
  }
  for(let m=-1;m<=2;m++){
    const d=new Date(p0.getFullYear(),p0.getMonth()+m,Math.min(jour,new Date(p0.getFullYear(),p0.getMonth()+m+1,0).getDate()));
    if(d>=p0&&d<=p1&&(!dd||d>=dd)&&(!df||d<=df))return d;
  }
  return null;
}
function jourCivilV3710_(v){const d=dateV377_(v);return d?new Date(d.getFullYear(),d.getMonth(),d.getDate()):null;}
