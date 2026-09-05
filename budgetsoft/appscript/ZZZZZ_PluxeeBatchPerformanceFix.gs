// Optimisation Pluxee : le contexte de catégorisation est construit au plus une fois par lot,
// et seulement si une opération nouvelle a réellement besoin d'être catégorisée.
// Evite les relectures répétées de Operations/Categories/Regles/Correspondances,
// notamment lorsque le lot ne contient que des opérations déjà importées.

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
    if(!PLUXEE_CATEGORISATION_CTX_)PLUXEE_CATEGORISATION_CTX_=construireContexteCategorisationPluxee_();
    const ctx=PLUXEE_CATEGORISATION_CTX_;
    const fake={date:o.date,libelle:o.libelle,libelle_bancaire:o.libelle,marchand_normalise:o.libelle,montant:-Math.abs(Number(o.montant||0)),type:'depense',compte:'PLUXEE'};
    const p=propositionCategorieOperation_(fake,ctx.corr,ctx.regles,ctx.index,ctx.hist),c=p&&p.statut==='propose'?String(p.best.categorie||''):'';
    if(['Courses','Restaurants'].includes(c))return c;
  }catch(e){}
  return'';
}

function analyserLotPluxee_(operations,source){
  const exist=lirePluxee_(),cles=new Set(exist.map(o=>String(o.cle_rapprochement||''))),details=[];
  let nouvelles=0,existantes=0,refusees=0,ambigues=0;
  PLUXEE_CATEGORISATION_CTX_=null;
  try{
    operations.forEach((brut,i)=>{
      if(brut.refuse){
        refusees++;
        details.push({index:i+1,statutImport:'refusee',raison:brut.raison||'Transaction refusée',operation:brut});
        return;
      }
      try{
        // La clé brute est calculée d'abord lorsque c'est possible : les lots entièrement
        // déjà présents évitent ainsi de charger le moteur de catégorisation.
        const d=dateHeurePluxee_(brut.date),lib=nettoyerLibellePluxee_(brut.libelle),m=Number(brut.montant||0);
        if(d&&!isNaN(d.getTime())&&lib&&Number.isFinite(m)&&Math.abs(m)>=.001){
          const type=m>0?'rechargement':'depense';
          const iso=Utilities.formatDate(d,Session.getScriptTimeZone(),"yyyy-MM-dd'T'HH:mm:ss");
          const cle=clePluxee_(iso,lib,m,type);
          if(cles.has(cle)){
            existantes++;
            details.push({index:i+1,statutImport:'existante',operation:Object.assign({},brut,{date:iso,libelle:lib,montant:arrondirPluxee_(type==='depense'?-Math.abs(m):Math.abs(m)),type,cle_rapprochement:cle})});
            return;
          }
        }
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
