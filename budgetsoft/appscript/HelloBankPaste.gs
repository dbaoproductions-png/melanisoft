function analyserCollerHelloBank(texte, compteId) {
  verifierInitialisation_();
  const brut=String(texte||'').replace(/\u00a0/g,' ').replace(/\u202f/g,' ');
  if(!brut.trim()) throw new Error('Collez d’abord les opérations copiées depuis Hello bank!.');
  const compte=String(compteId||'').trim(); if(!compte) throw new Error('Choisissez le compte bancaire concerné.');
  const mois={janvier:0,fevrier:1,'février':1,mars:2,avril:3,mai:4,juin:5,juillet:6,aout:7,'août':7,septembre:8,octobre:9,novembre:10,decembre:11,'décembre':11};
  const lignes=brut.split(/\r?\n/).map(s=>String(s||'').trim()).filter(Boolean);
  const reJour=/^(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+(\d{1,2})\s+([A-Za-zÀ-ÿ]+)$/i;
  const reCreditee=/^Créditée le (\d{2})\/(\d{2})\/(\d{4})$/i,reDebitee=/^Débitée le (\d{2})\/(\d{2})\/(\d{4})$/i,reMontant=/^\*{0,2}([+−-])\s*([\d\s]+,\d{2})\s*€\*{0,2}$/;
  const structure=new Set(['CatégorieLibelléMontantPointage','CatégorieLibelléMontant','Autres dépenses à catégoriser','À catégoriser']);
  const annee=new Date().getFullYear(); let dateCourante=null,resultats=[];
  const iso=d=>Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');
  const montant=m=>{const n=Number(String(m[2]).replace(/\s/g,'').replace(',','.'));return m[1]==='+'?n:-n;};
  const dateAchat=lib=>{const m=String(lib||'').match(/\b(?:CB|PAIEMENT\s+CB)\s+DU\s+(\d{2})(\d{2})(\d{2})\b/i);if(!m)return null;const d=new Date(2000+Number(m[3]),Number(m[2])-1,Number(m[1]),12);return isNaN(d)?null:d;};
  function creer(date,lib,mont,opt){opt=opt||{};const diff=!!opt.differee,achat=diff?(opt.dateAchat||dateAchat(lib)):null,com=['[HELLOBANK_COLLER]','Libellé bancaire : '+String(lib||'').trim()];if(diff){com.push('[CARTE_DIFFEREE:'+iso(date)+']');if(achat)com.push('Date achat : '+Utilities.formatDate(achat,Session.getScriptTimeZone(),'dd/MM/yyyy'));com.push('Débit prévu : '+Utilities.formatDate(date,Session.getScriptTimeZone(),'dd/MM/yyyy'));}return{date:iso(date),libelle:String(lib||'').trim(),categorie:'',compte,montant:Math.abs(mont),type:mont>=0?'revenu':'depense',commentaire:com.join(' '),carteDifferee:diff,dateAchat:achat?iso(achat):null,dateDebit:diff?iso(date):null};}
  for(let i=0;i<lignes.length;i++){
    const l=lignes[i]; let m=l.match(reJour);
    if(m){const idx=mois[m[2].toLowerCase()];if(idx!==undefined)dateCourante=new Date(annee,idx,Number(m[1]),12);continue;}
    m=l.match(reCreditee);if(m){const d=new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),12);if(i>0&&i+1<lignes.length){const am=lignes[i+1].match(reMontant);if(am){resultats.push(creer(d,lignes[i-1],montant(am)));i++;}}continue;}
    m=l.match(reDebitee);if(m){const d=new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),12);if(i>0&&i+1<lignes.length){const lib=lignes[i-1],am=lignes[i+1].match(reMontant);if(am){resultats.push(creer(d,lib,montant(am),{differee:true,dateAchat:dateAchat(lib)}));i++;}}continue;}
    if(structure.has(l))continue;
    if(dateCourante&&i+2<lignes.length&&(lignes[i+1]==='Autres dépenses à catégoriser'||lignes[i+1]==='À catégoriser')){const am=lignes[i+2].match(reMontant);if(am){resultats.push(creer(dateCourante,l,montant(am)));i+=2;}}
  }
  const params=Object.fromEntries(lireTable_('Parametres').map(p=>[String(p.cle),p.valeur]));
  const dateDernierReleve=params['date_solde_releve_'+compte]?new Date(params['date_solde_releve_'+compte]):null;
  const existantes=lireTable_('Operations').filter(o=>!String(o.commentaire||'').includes('[RECURRENCE:'));
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const index={};
  existantes.forEach(o=>{const d=new Date(o.date);if(isNaN(d))return;const ds=Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd'),ms=Number(o.montant||0),cle=ds+'|'+ms.toFixed(2);(index[cle]||(index[cle]=[])).push(norm([o.libelle,o.commentaire].join(' ')));});
  resultats=resultats.map(r=>{const d=new Date(r.date+'T12:00:00'),avant=!!(dateDernierReleve&&!isNaN(dateDernierReleve)&&d<=dateJourCycle_(dateDernierReleve)),ms=r.type==='depense'?-Math.abs(Number(r.montant)):Math.abs(Number(r.montant)),cands=index[r.date+'|'+ms.toFixed(2)]||[],a=norm(r.libelle),doublon=cands.some(b=>a&&b&&(a===b||a.indexOf(b)>=0||b.indexOf(a)>=0));return Object.assign({},r,{valide:!doublon&&!avant,doublon,avantReleve:avant,action:(doublon||avant)?'ignorer':'importer'});});
  const imp=resultats.filter(r=>r.valide),rev=imp.filter(r=>r.type==='revenu').reduce((s,r)=>s+Number(r.montant||0),0),dep=imp.filter(r=>r.type==='depense').reduce((s,r)=>s+Number(r.montant||0),0),cb=imp.filter(r=>r.carteDifferee),totCb=cb.reduce((s,r)=>s+Number(r.montant||0),0);
  return{total:resultats.length,importables:imp.length,doublons:resultats.filter(r=>r.doublon).length,avantReleve:resultats.filter(r=>r.avantReleve).length,revenus:arrondirCycle_(rev),depenses:arrondirCycle_(dep),net:arrondirCycle_(rev-dep),cartesDifferees:cb.length,totalCartesDifferees:arrondirCycle_(totCb),dateDernierReleve:dateDernierReleve&&!isNaN(dateDernierReleve)?dateDernierReleve.toISOString():null,lignes:resultats};
}

function importerCollerHelloBank(lignes){
  verifierInitialisation_();
  const valides=(lignes||[]).filter(r=>r&&r.action==='importer'&&r.valide!==false);
  if(!valides.length)return{importees:0,ignorees:(lignes||[]).length,erreurs:[]};

  const feuille=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Operations');
  const entetes=TABLES.Operations;
  const maintenant=new Date().toISOString();
  const erreurs=[];
  const lignesPretes=[];

  valides.forEach(r=>{
    try{
      const copie={
        id:Utilities.getUuid(),
        date:r.date,
        libelle:r.libelle,
        categorie:r.categorie||'',
        compte:r.compte,
        montant:r.montant,
        type:r.type,
        commentaire:r.commentaire||'[HELLOBANK_COLLER]',
        cree_le:maintenant,
        modifie_le:maintenant
      };
      normaliserOperation_(copie);
      lignesPretes.push(entetes.map(cle=>normaliserValeur_(copie[cle])));
    }catch(e){
      erreurs.push((r.libelle||'Opération')+' : '+e.message);
    }
  });

  if(lignesPretes.length){
    const verrou=LockService.getDocumentLock();
    verrou.waitLock(15000);
    try{
      const premiereLigne=feuille.getLastRow()+1;
      feuille.getRange(premiereLigne,1,lignesPretes.length,entetes.length).setValues(lignesPretes);
      SpreadsheetApp.flush();
    }finally{
      verrou.releaseLock();
    }
  }

  return{
    importees:lignesPretes.length,
    ignorees:(lignes||[]).length-valides.length,
    erreurs:erreurs
  };
}
