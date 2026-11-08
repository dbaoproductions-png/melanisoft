/**
 * Clôture du rapprochement Pluxee (08/11/2026) :
 * ajustement documenté du SOLDE INITIAL, sans mouvement artificiel.
 *
 * Contrôle strict contre le registre audité, sauvegarde de la valeur
 * précédente dans les propriétés du document, lecture/validation après
 * modification. Une nouvelle transaction ou un nouveau rechargement
 * bloque l'écriture jusqu'à réexamen du rapprochement.
 */
const PLUXEE_SOLDE_OUVERTURE_CORRECTION_20261108_VERSION='2026-11-08.1';
const PLUXEE_SOLDE_OUVERTURE_AVANT_20261108='PLUXEE_SOLDE_INITIAL_BACKUP_20261108';
const PLUXEE_SOLDE_OUVERTURE_TRACE_20261108='PLUXEE_SOLDE_INITIAL_AJUSTEMENT_20261108';

function verifierAjustementSoldeOuverturePluxee20261108_(){
  const arr=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
  const props=PropertiesService.getDocumentProperties();
  const soldeInitialBrut=props.getProperty('PLUXEE_SOLDE_INITIAL');
  const soldeInitial=soldeInitialBrut==null||soldeInitialBrut===''?
    Number(PLUXEE_SOLDE_INITIAL_DEFAUT):Number(soldeInitialBrut);
  const dateReference=String(props.getProperty('PLUXEE_DATE_REFERENCE')||
    PLUXEE_DATE_REFERENCE_DEFAUT);
  const etat=chargerPluxeeSource20260918_();
  const ops=lirePluxee_();
  const erreurs=[];
  if(!Array.isArray(ops))erreurs.push('Le registre Pluxee est inaccessible.');
  const lignes=Array.isArray(ops)?ops:[];
  const ids=lignes.map(o=>String(o.id||'').trim());
  const doublons=ids.filter((x,i)=>!x||ids.indexOf(x)!==i).length;
  const invalides=lignes.filter(o=>!Number.isFinite(Number(o.montant))||
    Number.isNaN(Date.parse(String(o.date||'')))).length;
  const refuses=lignes.filter(o=>String(o.statut||'valide').trim().toLowerCase()==='refuse').length;
  const futures=lignes.filter(o=>Date.parse(String(o.date||''))>=Date.parse('2026-11-01T00:00:00Z')).length;
  const net=arr(lignes.filter(o=>String(o.statut||'valide').trim().toLowerCase()!=='refuse')
    .reduce((s,o)=>s+Number(o.montant||0),0));
  if(!etat||!etat.ok)erreurs.push('État Pluxee indisponible.');
  if(lignes.length!==138)erreurs.push('Le nombre de mouvements a changé : '+lignes.length+' au lieu de 138.');
  if(doublons)erreurs.push('Identifiants absents/dupliqués : '+doublons+'.');
  if(invalides)erreurs.push('Dates ou montants invalides : '+invalides+'.');
  if(refuses)erreurs.push('Le statut de '+refuses+' transaction(s) a changé.');
  if(futures)erreurs.push('Des mouvements datés après le 31 octobre ont été importés : '+futures+'.');
  if(dateReference!=='2025-12-17')erreurs.push('Date du solde initial différente : '+dateReference+'.');
  if(net!==-179.03||!etat||arr(etat.netMouvements)!==-179.03)
    erreurs.push('Le net Pluxee ne correspond plus au rapprochement validé.');
  const dejaCorrige=arr(soldeInitial)===179.97&&etat&&arr(etat.solde)===0.94;
  const aCorriger=arr(soldeInitial)===177.42&&etat&&arr(etat.solde)===-1.61;
  if(!aCorriger&&!dejaCorrige)erreurs.push('Le solde initial/actuel a changé : aucune correction automatique autorisée.');
  const trace=props.getProperty(PLUXEE_SOLDE_OUVERTURE_TRACE_20261108);
  const sauvegarde=props.getProperty(PLUXEE_SOLDE_OUVERTURE_AVANT_20261108);
  if(aCorriger&&(trace||sauvegarde))
    erreurs.push('Un précédent ajustement/sauvegarde existe déjà : réexamen requis.');
  return {
    ok:erreurs.length===0,lectureSeule:true,
    version:PLUXEE_SOLDE_OUVERTURE_CORRECTION_20261108_VERSION,
    ancienneValeur:arr(soldeInitial),nouvelleValeur:179.97,ecart:2.55,
    soldeActuel:etat?arr(etat.solde):null,soldeAttendu:0.94,
    nombreOperations:lignes.length,netMouvements:net,dateReference,
    dejaCorrige:!!dejaCorrige,ajustementDejaTrace:!!trace,
    erreurNombre:erreurs.length,erreurs,
    justification:'Ajustement de rapprochement du solde initial Pluxee ; historique réel reconstitué et validé jusqu’au 31/10/2026, écart résiduel ancien de 2,55 €.'
  };
}

function auditerAjustementSoldeInitialPluxee20261108(){
  const r=verifierAjustementSoldeOuverturePluxee20261108_();
  console.log('[AUDIT AJUSTEMENT SOLDE INITIAL PLUXEE 20261108] '+JSON.stringify(r));
  return r;
}

/**
 * À lancer une fois après accord explicite de l'utilisateur.
 * Sauvegarde PLUXEE_SOLDE_INITIAL, ajuste 177.42 -> 179.97, contrôle
 * 0.94 € ; invalide/reconstruit le snapshot sans créer aucune dépense.
 */
function appliquerAjustementSoldeInitialPluxee20261108(){
  const lock=LockService.getDocumentLock()||LockService.getScriptLock();
  lock.waitLock(30000);
  let result;
  try{
    const audit=verifierAjustementSoldeOuverturePluxee20261108_();
    if(!audit.ok)throw new Error('Rapprochement Pluxee non conforme : '+audit.erreurs.join(' | '));
    if(audit.dejaCorrige){
      result={ok:true,applique:false,dejaCorrige:true,soldeActuel:0.94,
        message:'Le solde initial est déjà 179,97 € ; aucune écriture effectuée.'};
    }else{
      const p=PropertiesService.getDocumentProperties();
      const oldValue=p.getProperty('PLUXEE_SOLDE_INITIAL');
      const ancien=oldValue==null||oldValue===''?String(PLUXEE_SOLDE_INITIAL_DEFAUT):oldValue;
      // Sauvegarde de la valeur précédente AVANT toute mise à jour.
      p.setProperty(PLUXEE_SOLDE_OUVERTURE_AVANT_20261108,ancien);
      let modifie=false;
      try{
        if(typeof marquerSnapshotGlobalBudgetSoftObsolete20260916_==='function')
          marquerSnapshotGlobalBudgetSoftObsolete20260916_('pluxee_solde_initial_rapprochement_20261108');
        p.setProperty('PLUXEE_SOLDE_INITIAL','179.97');
        modifie=true;
        const etat=chargerPluxeeSource20260918_();
        const cible=Math.round(Number(etat.solde)*100)/100;
        if(!etat.ok||cible!==0.94||Number(etat.nombreOperations)!==138||
           Math.round(Number(etat.netMouvements)*100)/100!==-179.03)
          throw new Error('Le solde après correction ne correspond pas à 0,94 € ou les mouvements ont changé.');
        p.setProperty(PLUXEE_SOLDE_OUVERTURE_TRACE_20261108,JSON.stringify({
          version:PLUXEE_SOLDE_OUVERTURE_CORRECTION_20261108_VERSION,
          date:new Date().toISOString(),soldeReference:'2025-12-17',
          ancien:177.42,nouveau:179.97,ecart:2.55,
          soldeApplicationAu31Octobre2026:0.94,nbMouvements:138,
          methode:'ajustement_solde_initial_sans_mouvement_fictif',
          motif:'rapprochement du registre avec l’application Pluxee'
        }));
        result={ok:true,applique:true,ancienneValeur:177.42,
          nouvelleValeur:179.97,ajustement:2.55,soldeApres:0.94,
          nombreOperations:138,sauvegardePropriete:PLUXEE_SOLDE_OUVERTURE_AVANT_20261108,
          tracePropriete:PLUXEE_SOLDE_OUVERTURE_TRACE_20261108,
          aucuneTransactionModifiee:true};
      }catch(e){
        if(modifie){
          p.setProperty('PLUXEE_SOLDE_INITIAL',ancien);
          if(typeof marquerSnapshotGlobalBudgetSoftObsolete20260916_==='function'){
            try{marquerSnapshotGlobalBudgetSoftObsolete20260916_('pluxee_rollback_20261108');}
            catch(_){}
          }
        }
        throw e;
      }
    }
  }finally{
    lock.releaseLock();
  }
  if(result&&result.applique&&
      typeof reconstruireSnapshotGlobalSyntheseBudgetSoft20260907==='function'){
    try{
      const s=reconstruireSnapshotGlobalSyntheseBudgetSoft20260907('rapprochement_pluxee_cloture_20261108');
      result.snapshot={ok:!!(s&&s.ok),revisionBudgetSoft:s&&s.revisionBudgetSoft||'',erreur:s&&s.erreur||''};
    }catch(e){
      result.snapshot={ok:false,erreur:String(e&&e.message||e)};
    }
  }
  console.log('[AJUSTEMENT SOLDE INITIAL PLUXEE 20261108] '+JSON.stringify(result));
  return result;
}
