/**
 * Audit declaratif du compte courant depuis la reference bancaire certifiee.
 * Reprend les primitives du proprietaire Comptes, sans ecriture.
 */
function auditerEcartHelloReferenceBudgetSoft20261016(){
  verifierInitialisation_();
  const comptes=lireTable_('Comptes');
  const compte=comptes.find(c=>String(c.type||'').toLowerCase()==='courant'&&String(c.actif)!=='false'&&String(c.actif)!=='0');
  if(!compte)throw new Error('Aucun compte courant actif');
  const id=String(compte.id),p=Object.fromEntries(lireTable_('Parametres').map(r=>[String(r.cle),r.valeur]));
  const ref=Number(String(p['solde_releve_'+id]||'').replace(',','.'));
  const dateRef=jourCanonBudgetSoft20260906_(p['date_solde_releve_'+id]);
  const today=jourReferenceCanonBudgetSoft20260906_(new Date());
  if(!Number.isFinite(ref)||!dateRef)throw new Error('Reference bancaire absente ou invalide');
  const source=String(p['solde_releve_source_'+id]||'');
  const certifiee=/observation bancaire certifi[ée]e/i.test(source);
  const brut=lireTable_('Operations');
  const canon=typeof dedoublonnerOperationsCartesBudgetSoft_==='function'?dedoublonnerOperationsCartesBudgetSoft_(brut):brut;
  const cents=n=>Math.round(n*100)/100;
  const jours={},retenues=[],exclues=[],metis=[];
  for(const o of canon){
    if(String(o.compte)!==id)continue;
    const reel=operationReelleCanoniqueBudgetSoft20260906_(o);
    const jour=jourComptableCanonBudgetSoft20260906_(o);
    if(!jour||jour>today||!reel)continue;
    const type=String(o.type||'').toLowerCase();
    if(type!=='revenu'&&type!=='depense')continue;
    const signe=(type==='depense'?-1:1)*Math.abs(Number(o.montant||0));
    if(!Number.isFinite(signe)||signe===0)continue;
    const mouvement=jourCanonBudgetSoft20260906_(o.date);
    const provisoire=!certifiee&&/provisoire/i.test(String(o.statut_bancaire||''))&&!!mouvement&&mouvement>=dateRef&&jour<=dateRef;
    const ajoute=jour>dateRef||provisoire;
    const entree={date:jour,montant:cents(signe),id:String(o.id||''),libelle:String(o.libelle||'').slice(0,80),statut:String(o.statut_bancaire||'')};
    if(/association metis/i.test(String(o.libelle||'')+' '+String(o.libelle_bancaire||''))&&Math.abs(signe-156.68)<.005)metis.push({...entree,ajoute});
    if(ajoute){
      const d=jours[jour]||(jours[jour]={jour,montant:0,nombre:0});
      d.montant=cents(d.montant+signe);d.nombre++;
      retenues.push(entree);
    }else if(jour>=dateRef&&exclues.length<25)exclues.push({...entree,raison:'hors periode de reference'});
  }
  const somme=cents(Object.values(jours).reduce((s,x)=>s+x.montant,0));
  const s=construireSyntheseComptes20260828_();
  const reel=s&&s.comptes&&s.comptes.find(c=>String(c.id)===id);
  const calcul=cents(ref+somme);
  const out={ok:!!reel&&Math.abs(calcul-Number(reel.soldeReel))<.011,lectureSeule:true,version:'2026-10-16.1',
    compte:String(compte.nom||''),reference:ref,dateReference:dateRef,sourceReference:source,
    dateCalcul:today,mouvementsDepuisReference:somme,soldeReconstitue:calcul,soldeMoteur:reel&&reel.soldeReel,
    ecartAvecSoldeHello16047:cents(160.47-calcul),lignesBrutes:brut.length,lignesCanon:canon.length,
    metis,parJour:Object.values(jours).sort((a,b)=>a.jour.localeCompare(b.jour)),excluesAutourReference:exclues};
  console.log('[AUDIT ECART HELLO REFERENCE 20261016] '+JSON.stringify(out));return out;
}
