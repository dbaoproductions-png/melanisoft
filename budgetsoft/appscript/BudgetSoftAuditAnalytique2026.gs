function texteAuditAnalytique2026_(o){
  return normaliserTexteBanque_([o.marchand_normalise||'',o.libelle_bancaire||'',o.libelle||''].join(' '));
}

function auditTypesOperationsBudgetSoft2026(){
  verifierInitialisation_();
  const ops=lireTable_('Operations');
  const categories=lireTable_('Categories');
  const typesCategories=new Map(categories.map(c=>[String(c.nom||'').trim(),String(c.type||'').trim().toLowerCase()]));
  const problemes=[];
  let incoherencesSigneType=0,incoherencesCategorieType=0,categoriesInconnues=0,typesBancairesNonDirectionnels=0;
  let mouvementsTresorerie=0,tresorerieEntrante=0,tresorerieSortante=0,montantTresorerieEntrante=0,montantTresorerieSortante=0;
  let mouvementsEpargne=0,epargneEntrante=0,epargneSortante=0,montantEpargneEntrante=0,montantEpargneSortante=0;

  ops.forEach(o=>{
    const montant=Number(o.montant||0),type=String(o.type||'').trim().toLowerCase(),categorie=String(o.categorie||'').trim();
    const attendu=montant>0?'revenu':montant<0?'depense':type;
    if(type&&type!=='depense'&&type!=='revenu'){
      typesBancairesNonDirectionnels++;
      if(problemes.length<200)problemes.push({id:o.id,date:o.date,libelle:o.libelle,montant,type,categorie,probleme:'type_bancaire_non_directionnel',attendu});
    }else if((type==='depense'||type==='revenu')&&attendu!==type){
      incoherencesSigneType++;
      if(problemes.length<200)problemes.push({id:o.id,date:o.date,libelle:o.libelle,montant,type,categorie,probleme:'signe_type',attendu});
    }
    if(categorie){
      const typeCat=typesCategories.get(categorie);
      if(!typeCat){categoriesInconnues++;if(problemes.length<200)problemes.push({id:o.id,date:o.date,libelle:o.libelle,montant,type,categorie,probleme:'categorie_inconnue'});}
      else if(typeCat==='tresorerie'){
        mouvementsTresorerie++;
        if(montant>0){tresorerieEntrante++;montantTresorerieEntrante+=montant;}
        else if(montant<0){tresorerieSortante++;montantTresorerieSortante+=Math.abs(montant);}
      }else if(typeCat==='epargne'){
        mouvementsEpargne++;
        if(montant>0){epargneEntrante++;montantEpargneEntrante+=montant;}
        else if(montant<0){epargneSortante++;montantEpargneSortante+=Math.abs(montant);}
      }else if((typeCat==='depense'||typeCat==='revenu')&&typeCat!==type){
        incoherencesCategorieType++;
        if(problemes.length<200)problemes.push({id:o.id,date:o.date,libelle:o.libelle,montant,type,categorie,probleme:'categorie_type',typeCategorie:typeCat});
      }
    }
  });
  const resultat={total:ops.length,incoherencesSigneType,incoherencesCategorieType,categoriesInconnues,typesBancairesNonDirectionnels,
    tresorerie:{operations:mouvementsTresorerie,entrantes:tresorerieEntrante,sortantes:tresorerieSortante,montantEntrant:Math.round(montantTresorerieEntrante*100)/100,montantSortant:Math.round(montantTresorerieSortante*100)/100,soldeNet:Math.round((montantTresorerieEntrante-montantTresorerieSortante)*100)/100},
    epargne:{operations:mouvementsEpargne,entrantes:epargneEntrante,sortantes:epargneSortante,montantEntrant:Math.round(montantEpargneEntrante*100)/100,montantSortant:Math.round(montantEpargneSortante*100)/100,soldeNet:Math.round((montantEpargneEntrante-montantEpargneSortante)*100)/100},problemes};
  console.log(JSON.stringify(resultat));return resultat;
}

function reparerDeuxiemeVagueCategorisation2026(){
  verifierInitialisation_();
  const ops=lireTable_('Operations');
  let modifiees=0;
  const detail={voyages:0,voitures:0,remboursements:0,cours:0,aides:0,concerts:0,telecom:0,achats:0,maison:0,sante:0,loisirs:0,courses:0,fraisPro:0,correctionsCiblees:0,floaRevolving:0,virementsInternes55296:0,aubagneRetroactif:0};
  ops.forEach(o=>{
    const texte=texteAuditAnalytique2026_(o),type=String(o.type||'').toLowerCase(),actuelle=String(o.categorie||'').trim();
    const montant=Number(o.montant||0),date=String(o.date||'').slice(0,10);let cible='';

    if(date==='2025-07-15'&&type==='depense'&&Math.abs(Math.abs(montant)-45)<0.001&&/CHEQUE/.test(texte)){cible='Loisirs';detail.correctionsCiblees++;}
    else if(type==='revenu'&&/HPY KILMA JONAK/.test(texte)){cible='Remboursements';detail.correctionsCiblees++;}
    // FLOA : les débits sont des remboursements du revolving, les crédits restent des tirages de trésorerie.
    else if(type==='depense'&&/FLOA/.test(texte)&&actuelle!=='Crédits revolving'){cible='Crédits revolving';detail.floaRevolving++;}
    // Compte finissant par 55296 confirmé comme compte propre : les mouvements dans les deux sens sont internes.
    else if(/55296/.test(texte)&&actuelle!=='Virements internes'){cible='Virements internes';detail.virementsInternes55296++;}
    // Toutes les dépenses à Aubagne sont professionnelles, y compris celles déjà catégorisées auparavant.
    else if(type==='depense'&&/AUBAGNE/.test(texte)&&actuelle!=='Frais professionnels'){cible='Frais professionnels';detail.aubagneRetroactif++;}

    else if(!actuelle&&type==='depense'&&/(FLIXBUS|TRAINLINE|SANDAYA)/.test(texte)){cible='Voyages / vacances';detail.voyages++;}
    else if(!actuelle&&type==='depense'&&/(HOTEL DE VILLE SETE|FORF P STAT WEB RENNES|FEU VERT|HYPROMAT LAVAGE|CERTAS ESSO|REL TOTAL|STATION TOTAL)/.test(texte)){cible='Voitures';detail.voitures++;}
    else if(type==='revenu'&&/(TOTALENERGIES|MAIF)/.test(texte)&&!actuelle){cible='Remboursements';detail.remboursements++;}
    else if(type==='revenu'&&/ASSOCIATION METIS/.test(texte)&&/NDF/.test(texte)&&!actuelle){cible='Cours';detail.cours++;}
    else if(type==='revenu'&&/CASC SVP/.test(texte)&&/REMB/.test(texte)&&!actuelle){cible='Prestations / aides';detail.aides++;}
    else if(type==='revenu'&&/SPEDIDAM/.test(texte)&&!actuelle){cible='Concerts';detail.concerts++;}
    else if(type==='depense'&&/WIFIRST/.test(texte)&&!actuelle){cible='Télécom / Internet / TV';detail.telecom++;}
    else if(type==='depense'&&/(VINTED|BIJOU BRIGITTE|MANGO|SHOWROOMPRIVE|PARFOIS)/.test(texte)&&!actuelle){cible='Achats personnels';detail.achats++;}
    else if(type==='depense'&&/CASTORAMA/.test(texte)&&!actuelle){cible='Maison / entretien';detail.maison++;}
    else if(type==='depense'&&/(DR IRLES|DR VO VAN FLORE)/.test(texte)&&!actuelle){cible='Santé';detail.sante++;}
    else if(type==='depense'&&/(ESTHETIC CENTER|ESCALE BEAUTE)/.test(texte)&&!actuelle){cible='Loisirs';detail.loisirs++;}
    else if(type==='depense'&&/(CARREFOUR CITY|PETIT CASINO|\bSPAR\b|BRESSOLS PRIMEUR)/.test(texte)&&!actuelle){cible='Courses';detail.courses++;}
    else if(type==='depense'&&!actuelle&&/MARSEILLE/.test(texte)){cible='Frais professionnels';detail.fraisPro++;}

    if(!cible||cible===actuelle)return;
    enregistrerLigne('Operations',Object.assign({},o,{categorie:cible,montant:Math.abs(Number(o.montant||0))}));modifiees++;
  });
  return{modifiees,detail,auditTypes:auditTypesOperationsBudgetSoft2026()};
}
