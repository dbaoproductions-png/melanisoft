/** Lecture seule : synthese courte des changements potentiels de jours ISO. */
function auditerFrontieresDatesISOBudgetSoft20261016(){
  verifierInitialisation_();
  const tz=Session.getScriptTimeZone(),ops=lireTable_('Operations');
  const ref='2026-09-28',today='2026-10-16',cible='05f09474-e55b-4b64-b438-e31439514fdc';
  const result={ok:true,lectureSeule:true,version:'2026-10-16.1',fuseau:tz,
    nombreOperations:ops.length,nombreDatesModifiees:0,parSource:{},parMois:{},
    franchissementReference:{entree:[],sortie:[],nombreEntree:0,nombreSortie:0,netEntree:0,netSortie:0},
    franchissementMois:{nombre:0,parSource:{}},metis:null};
  const arr=n=>Math.round(n*100)/100;
  const nouveau=(v)=>{
    if(v==null||v==='')return null;
    if(v instanceof Date)return isNaN(v.getTime())?null:Utilities.formatDate(v,tz,'yyyy-MM-dd');
    const s=String(v).trim();
    if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/i.test(s)){
      const d=new Date(s);return isNaN(d.getTime())?null:Utilities.formatDate(d,tz,'yyyy-MM-dd');
    }
    return jourCanonBudgetSoft20260906_(v);
  };
  const old=v=>{
    if(v==null||v==='')return null;
    if(v instanceof Date)return isNaN(v.getTime())?null:Utilities.formatDate(v,tz,'yyyy-MM-dd');
    const s=String(v).trim(),m=s.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/);
    return m?m[1]+'-'+m[2]+'-'+m[3]:jourCanonBudgetSoft20260906_(v);
  };
  for(const o of ops){
    const valeur=o.date_comptable||o.date,avant=old(valeur),apres=nouveau(valeur);
    if(!avant||!apres||avant===apres)continue;
    result.nombreDatesModifiees++;
    const src=String(o.source_bancaire||'sans_source'),mois=avant.slice(0,7);
    result.parSource[src]=(result.parSource[src]||0)+1;
    result.parMois[mois]=(result.parMois[mois]||0)+1;
    const montant=(String(o.type||'').toLowerCase()==='depense'?-1:1)*Math.abs(Number(o.montant||0));
    const entree=avant<=ref&&apres>ref&&apres<=today,sortie=apres<=ref&&avant>ref&&avant<=today;
    if(String(o.compte)===cible&&(entree||sortie)){
      const key=entree?'entree':'sortie',f=result.franchissementReference;
      f['nombre'+(entree?'Entree':'Sortie')]++;
      f['net'+(entree?'Entree':'Sortie')]=arr(f['net'+(entree?'Entree':'Sortie')]+montant);
      if(f[key].length<12)f[key].push({id:String(o.id||''),avant,apres,montant:arr(montant),source:src,
        libelle:String(o.libelle||'').slice(0,65)});
    }
    if(avant.slice(0,7)!==apres.slice(0,7)){
      result.franchissementMois.nombre++;
      result.franchissementMois.parSource[src]=(result.franchissementMois.parSource[src]||0)+1;
    }
    if(String(o.id)==='25e75f29-4efa-4985-859e-2636caa6b234')result.metis={avant,apres,montant:arr(montant),franchitReference:entree};
  }
  result.parMois=Object.fromEntries(Object.entries(result.parMois).sort((a,b)=>a[0].localeCompare(b[0])));
  result.impactNetReference=arr(result.franchissementReference.netEntree-result.franchissementReference.netSortie);
  result.avertissement='Simulation des dates, pas du dedoublonnage ni des regles completes de solde canonique. Aucun effet sur les donnees.';
  console.log('[AUDIT FRONTIERES ISO] '+JSON.stringify(result));return result;
}
