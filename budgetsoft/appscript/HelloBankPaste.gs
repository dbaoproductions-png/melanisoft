function analyserCollerHelloBank(texte, compteId) {
  verifierInitialisation_();
  const brut = String(texte || '').replace(/\u00a0/g, ' ').replace(/\u202f/g, ' ');
  if (!brut.trim()) throw new Error('Collez d’abord les opérations copiées depuis Hello bank!.');
  const compte = String(compteId || '').trim();
  if (!compte) throw new Error('Choisissez le compte bancaire concerné.');

  const mois = {janvier:0,fevrier:1,'février':1,mars:2,avril:3,mai:4,juin:5,juillet:6,aout:7,'août':7,septembre:8,octobre:9,novembre:10,decembre:11,'décembre':11};
  const lignes = brut.split(/\r?\n/).map(s=>String(s||'').trim()).filter(Boolean);
  const reJour = /^(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+(\d{1,2})\s+([A-Za-zÀ-ÿ]+)$/i;
  const reCreditee = /^Créditée le (\d{2})\/(\d{2})\/(\d{4})$/i;
  const reMontant = /^\*{0,2}([+−-])\s*([\d\s]+,\d{2})\s*€\*{0,2}$/;
  const structure = new Set(['CatégorieLibelléMontantPointage','Autres dépenses à catégoriser','À catégoriser']);
  const anneeParDefaut = new Date().getFullYear();
  let dateCourante = null, resultats = [];

  function montant_(m) {
    const n = Number(String(m[2]).replace(/\s/g,'').replace(',','.'));
    return m[1] === '+' ? n : -n;
  }
  function ligneOperation_(date, libelle, montant) {
    const type = montant >= 0 ? 'revenu' : 'depense';
    return {date:Utilities.formatDate(date,Session.getScriptTimeZone(),'yyyy-MM-dd'),libelle:String(libelle||'').trim(),categorie:'',compte:compte,montant:Math.abs(montant),type:type,commentaire:'[HELLOBANK_COLLER] Libellé bancaire : '+String(libelle||'').trim()};
  }

  for (let i=0;i<lignes.length;i++) {
    const ligne = lignes[i];
    let m = ligne.match(reJour);
    if (m) {
      const cle = normaliserTexteCycle_(m[2]).toLowerCase();
      const indexMois = mois[m[2].toLowerCase()] !== undefined ? mois[m[2].toLowerCase()] : mois[cle];
      if (indexMois !== undefined) dateCourante = new Date(anneeParDefaut,indexMois,Number(m[1]),12,0,0,0);
      continue;
    }
    m = ligne.match(reCreditee);
    if (m) {
      dateCourante = new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),12,0,0,0);
      if (i>0 && i+1<lignes.length) {
        const am = lignes[i+1].match(reMontant);
        if (am) { resultats.push(ligneOperation_(dateCourante,lignes[i-1],montant_(am))); i++; }
      }
      continue;
    }
    if (structure.has(ligne)) continue;
    if (dateCourante && i+2<lignes.length && (lignes[i+1]==='Autres dépenses à catégoriser'||lignes[i+1]==='À catégoriser')) {
      const am = lignes[i+2].match(reMontant);
      if (am) { resultats.push(ligneOperation_(dateCourante,ligne,montant_(am))); i+=2; }
    }
  }

  const params = Object.fromEntries(lireTable_('Parametres').map(p=>[String(p.cle),p.valeur]));
  const dateDernierReleve = params['date_solde_releve_'+compte] ? new Date(params['date_solde_releve_'+compte]) : null;
  const existantes = lireTable_('Operations').filter(o=>!String(o.commentaire||'').includes('[RECURRENCE:'));
  const norm = s => normaliserTexteCycle_(s).replace(/\bLIBELLE BANCAIRE\b/g,'').trim();
  function estDoublon_(r) {
    const d = new Date(r.date), montantSigne = r.type==='depense' ? -Math.abs(Number(r.montant)) : Math.abs(Number(r.montant));
    return existantes.some(o=>{
      const od=new Date(o.date); if(isNaN(od)||Utilities.formatDate(od,Session.getScriptTimeZone(),'yyyy-MM-dd')!==r.date)return false;
      if(Math.abs(Number(o.montant||0)-montantSigne)>0.005)return false;
      const a=norm(r.libelle), b=norm([o.libelle,o.commentaire].join(' '));
      return a && b && (a===b || a.indexOf(b)>=0 || b.indexOf(a)>=0);
    });
  }

  resultats = resultats.map(r=>{
    const date = new Date(r.date+'T12:00:00');
    const avantReleve = dateDernierReleve && !isNaN(dateDernierReleve) && date <= dateJourCycle_(dateDernierReleve);
    const doublon = estDoublon_(r);
    return Object.assign({},r,{valide:!doublon&&!avantReleve,doublon,avantReleve,action:(doublon||avantReleve)?'ignorer':'importer'});
  });

  const importables=resultats.filter(r=>r.valide), revenus=importables.filter(r=>r.type==='revenu').reduce((s,r)=>s+Number(r.montant||0),0), depenses=importables.filter(r=>r.type==='depense').reduce((s,r)=>s+Number(r.montant||0),0);
  return {total:resultats.length,importables:importables.length,doublons:resultats.filter(r=>r.doublon).length,avantReleve:resultats.filter(r=>r.avantReleve).length,revenus:arrondirCycle_(revenus),depenses:arrondirCycle_(depenses),net:arrondirCycle_(revenus-depenses),dateDernierReleve:dateDernierReleve&&!isNaN(dateDernierReleve)?dateDernierReleve.toISOString():null,lignes:resultats};
}

function importerCollerHelloBank(lignes) {
  verifierInitialisation_();
  const valides=(lignes||[]).filter(r=>r&&r.action==='importer'&&r.valide!==false);
  let importees=0,erreurs=[];
  valides.forEach(r=>{try{enregistrerLigne('Operations',{date:r.date,libelle:r.libelle,categorie:r.categorie||'',compte:r.compte,montant:r.montant,type:r.type,commentaire:r.commentaire||'[HELLOBANK_COLLER]'});importees++;}catch(e){erreurs.push((r.libelle||'Opération')+' : '+e.message);}});
  return {importees,ignorees:(lignes||[]).length-valides.length,erreurs};
}
