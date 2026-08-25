const CERBERE_SALAIRE_CYCLE_V3712_VERSION='3.7.12';

/**
 * Correctif de doctrine salaire 3.7.12.
 *
 * Le salaire qui ouvre un cycle appartient conventionnellement au 28 de ce cycle,
 * quelle que soit sa date bancaire réelle (27, 28 ou 29). Cette passe s'applique
 * à toutes les périodes affichées, pas seulement à M : un salaire tombé le 27 ne
 * doit donc jamais rester dans le cycle qui se termine ce 27.
 *
 * SS1 est le dernier solde du cycle précédent avant ce salaire. Pour M, si le
 * salaire bancaire est daté du 27, la reconstruction bancaire au 28 l'a déjà
 * inclus : on le retire une fois. Pour M+1 et suivants, le report corrigé de la
 * période précédente est déjà un solde avant salaire et ne doit pas être corrigé
 * une deuxième fois.
 */
function appliquerConventionSalaireTousCyclesV3712_(base){
  if(!base||base.ok===false)return base;
  const operations=tableauCerbereV379_(lireTable_('Operations'));
  const periodes=tableauCerbereV379_(base.periodes);
  const postes=tableauCerbereV379_(base&&base.recettesCanon&&base.recettesCanon.postes);
  const salaireCanonCourant=Number((postes.find(x=>String(x&&x.categorie||'').trim()==='Salaires')||{}).montant||0);
  let report=null;

  periodes.forEach((p,i)=>{
    if(!p||typeof p!=='object')return;
    const v=p.v37||(p.v37={}),periode=p.periode||p;
    const debut=jourCivilV3712_(periode&&periode.debut);if(!debut)return;

    // Le report M -> M+1 est toujours calculé après correction du salaire de M.
    if(i>0&&report!==null){
      v.ss1=arrV3712_(report);v.soldeOuverture=v.ss1;
      v.ss1Statut='dernier solde reporté de M−1 avant le salaire d’ouverture';
    }

    const candidats=operations.map(o=>({o:o,d:jourCivilV3712_(dateOperationBanqueV377_(o))}))
      .filter(x=>x.d&&Number(x.o&&x.o.montant||0)>0&&normaliserV377_(x.o&&x.o.categorie)==='salaires')
      .filter(x=>Math.abs((x.d-debut)/86400000)<=1)
      .sort((a,b)=>Math.abs(a.d-debut)-Math.abs(b.d-debut));
    const candidat=candidats[0]||null;

    const hist=v.rt1Audit&&v.rt1Audit.canonEffectifParCategorie&&v.rt1Audit.canonEffectifParCategorie['Salaires'];
    const canonCycle=Number(hist&&hist.cycle!=null?hist.cycle:salaireCanonCourant);
    let retenuAvant=0;

    // Si la première passe 3.7.12 a déjà traité M, son salaire réel est déjà retenu.
    if(v.salaireOuverture&&v.salaireOuverture.trouve){
      retenuAvant=Number(v.salaireOuverture.montant||0);
    }else if(hist&&hist.retenu!=null){
      retenuAvant=Number(hist.retenu||0);
    }else{
      const reelAudit=Number(v.rt1Audit&&v.rt1Audit.reelParCategorie&&v.rt1Audit.reelParCategorie['Salaires']||0);
      retenuAvant=i===0&&reelAudit>0?Math.max(canonCycle,reelAudit):canonCycle;
    }

    const montantRetenu=candidat?Number(candidat.o.montant||0):canonCycle;
    const delta=arrV3712_(montantRetenu-retenuAvant);
    if(Math.abs(delta)>.001)v.rt1=arrV3712_(Number(v.rt1||0)+delta);

    // Pour M seulement : un salaire bancaire au 27 est présent dans le solde
    // reconstruit à la frontière du 28. La première passe peut déjà l'avoir retiré.
    let ajustementSS1=0;
    if(i===0&&candidat&&candidat.d<debut){
      const deja=Number(v.salaireOuverture&&v.salaireOuverture.ajustementSS1||0);
      if(Math.abs(deja)<.001){
        ajustementSS1=-Number(candidat.o.montant||0);
        v.ss1=arrV3712_(Number(v.ss1||0)+ajustementSS1);v.soldeOuverture=v.ss1;
      }
    }

    v.salaireOuverture={
      trouve:!!candidat,
      montant:arrV3712_(montantRetenu),
      dateBancaire:candidat?formatJourV3712_(candidat.d):'',
      dateCerbere:formatJourV3712_(debut),
      operationId:candidat?String(candidat.o&&candidat.o.id||''):'',
      canonRemplace:arrV3712_(retenuAvant),
      deltaRt1:delta,
      ajustementSS1:arrV3712_(ajustementSS1),
      doctrine:'salaire d’ouverture imputé au 28 Cerbère ; la banque 27/28/29 ne change que le montant rapproché'
    };
    v.ss1Statut='dernier solde de M−1 avant le salaire d’ouverture · salaire imputé conventionnellement au 28';

    // Recalcul strict des cartes dépendantes, sans toucher aux allocations.
    v.capaciteAvantPilotable=arrV3712_(Number(v.ss1||0)+Number(v.rt1||0)-Number(v.cft1||0)-Number(v.het1||0));
    const enveloppes=tableauCerbereV379_(p.enveloppes);
    const allocation=arrV3712_(enveloppes.reduce((s,x)=>s+Math.max(0,Number(x&&x.prevu||0)),0));
    const depassements=arrV3712_(enveloppes.reduce((s,x)=>{
      const engage=Number(x&&x.engageV37!=null?x.engageV37:(Number(x&&x.reelNetPrevisionnel||0)+Number(x&&x.planifie||0)));
      return s+Math.max(0,engage-Math.max(0,Number(x&&x.prevu||0)));
    },0));
    v.allocationP1Courante=allocation;v.depassementsPilotables=depassements;
    v.aReequilibrer=arrV3712_(v.capaciteAvantPilotable-allocation-depassements);
    v.aReequilibrerReference=v.aReequilibrer;
    v.dt1=arrV3712_(Number(v.cft1||0)+Number(v.dpt1||0)+Number(v.het1||0));
    v.sct1=arrV3712_(Number(v.ss1||0)+Number(v.rt1||0)-v.dt1);
    v.rpt1=v.sct1;v.resteReellementPilotable=v.sct1;v.disponibleJusquau27=v.sct1;
    v.auditReequilibrage={attendu:v.sct1,reel:v.aReequilibrer,ecart:arrV3712_(v.aReequilibrer-v.sct1),ok:Math.abs(v.aReequilibrer-v.sct1)<.011};
    const absorbable=arrV3712_(enveloppes.reduce((s,x)=>s+Math.max(0,Number(x&&x.prevu||0)-Number(x&&x.engageV37||0)),0));
    v.absorbableParAllocations=absorbable;
    v.incompressible=arrV3712_(v.aReequilibrer<0?Math.max(0,Math.abs(v.aReequilibrer)-absorbable):0);
    p.resteReellementPilotable=v.sct1;p.capacitePilotable=v.sct1;p.capaciteTresorerie=v.sct1;
    report=v.sct1;
  });

  base.version=CERBERE_SALAIRE_CYCLE_V3712_VERSION;
  base.fenetreRoulante=typeof fenetreV37_==='function'?fenetreV37_(periodes):base.fenetreRoulante;
  base.diagnostic=base.diagnostic||{};
  base.diagnostic.salaire_3712='date Cerbère 28 sur tous les cycles ; SS1 avant salaire ; montant réel seul rapproché';
  base.diagnostic.non_regression_3712=typeof verifierDoctrineCycleV3712_==='function'?verifierDoctrineCycleV3712_(base):base.diagnostic.non_regression_3712;
  return base;
}
