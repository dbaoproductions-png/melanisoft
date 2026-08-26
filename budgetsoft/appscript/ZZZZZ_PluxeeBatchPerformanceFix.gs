// Optimisation Pluxee : le contexte de catégorisation est construit une seule fois par lot.
// Evite les relectures répétées de Operations/Categories/Regles/Correspondances pour chaque ligne.

var PLUXEE_CATEGORISATION_CTX_ = null;

function construireContexteCategorisationPluxee_(){
  const index = typeof indexCategoriesIntelligentes_ === 'function' ? indexCategoriesIntelligentes_() : new Map();
  const ops = typeof lireTable_ === 'function' ? lireTable_('Operations') : [];
  const hist = typeof construireHistoriqueCategories_ === 'function' ? construireHistoriqueCategories_(ops,index) : new Map();
  const regles = typeof lireReglesCategories === 'function' ? lireReglesCategories() : [];
  const corr = typeof lireCorrespondancesBancaires === 'function' ? lireCorrespondancesBancaires() : [];
  return {index,ops,hist,regles,corr};
}

function categoriePluxee_(o){
  const lib=normaliserTexteBanque_(o.libelle||'');
  if(/^restauration$/.test(lib))return'Restaurants';
  try{
    const ctx=PLUXEE_CATEGORISATION_CTX_||construireContexteCategorisationPluxee_();
    const fake={date:o.date,libelle:o.libelle,libelle_bancaire:o.libelle,marchand_normalise:o.libelle,montant:-Math.abs(Number(o.montant||0)),type:'depense',compte:'PLUXEE'};
    const p=propositionCategorieOperation_(fake,ctx.corr,ctx.regles,ctx.index,ctx.hist),c=p&&p.statut==='propose'?String(p.best.categorie||''):'';
    if(['Courses','Restaurants'].includes(c))return c;
  }catch(e){}
  return'';
}

function analyserLotPluxee_(operations,source){
  const exist=lirePluxee_(),cles=new Set(exist.map(o=>String(o.cle_rapprochement||''))),details=[];
  let nouvelles=0,existantes=0,refusees=0,ambigues=0;
  PLUXEE_CATEGORISATION_CTX_=construireContexteCategorisationPluxee_();
  try{
    operations.forEach((brut,i)=>{
      if(brut.refuse){
        refusees++;
        details.push({index:i+1,statutImport:'refusee',raison:brut.raison||'Transaction refusée',operation:brut});
        return;
      }
      try{
        const op=normaliserOperationPluxee_(Object.assign({},brut,{source:source||brut.source||'import'}));
        if(cles.has(op.cle_rapprochement)){
          existantes++;
          details.push({index:i+1,statutImport:'existante',operation:op});
          return;
        }
        nouvelles++;
        cles.add(op.cle_rapprochement);
        details.push({index:i+1,statutImport:'nouvelle',operation:op});
      }catch(e){
        ambigues++;
        details.push({index:i+1,statutImport:'ambigue',raison:e.message,operation:brut});
      }
    });
  } finally {
    PLUXEE_CATEGORISATION_CTX_=null;
  }
  return {ok:ambigues===0,version:PLUXEE_VERSION,detectees:operations.length,nouvelles,existantes,refusees,ambigues,details};
}
