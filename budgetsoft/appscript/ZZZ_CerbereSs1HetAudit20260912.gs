/* Audit SS1 + HEt1 — lecture seule, aucune valeur métier modifiée. */
const CERBERE_SS1_HET_AUDIT_20260912_VERSION='2026-09-12.1';

function auditerSS1EtHEt1Cerbere20260912(){
  const c=recalculerCerbereCockpitP1Frais20260912_();
  const p=c&&Array.isArray(c.periodes)?c.periodes[0]:null;
  if(!p)throw new Error('Cycle Cerbère courant indisponible.');
  const v=p.v37||{};
  const periode=p.periode||p;
  const cle=String(p.clePilotage||periode.cle||periode.debut||'');
  const propKey='CERBERE_SS1_'+cle;
  const propRaw=PropertiesService.getDocumentProperties().getProperty(propKey);
  const propNum=propRaw!==null&&propRaw!==''&&Number.isFinite(Number(propRaw))?Number(propRaw):null;

  let auditHet=null;
  if(typeof auditerCerbereHorsPilotableExact_==='function'){
    auditHet=auditerCerbereHorsPilotableExact_(c,p);
  }

  const lignesHet=Array.isArray(auditHet&&auditHet.lignes)?auditHet.lignes:[];
  const resultat={
    ok:!!(c&&c.ok!==false),
    version:CERBERE_SS1_HET_AUDIT_20260912_VERSION,
    source:c&&c.sourceBudgetSoft||'',
    periode:periode,
    ss1:{
      valeur:Number(v.ss1||0),
      statut:String(v.ss1Statut||''),
      valide:!!v.ss1Valide,
      clePilotage:cle,
      propertyKey:propKey,
      propertyPresente:propNum!==null,
      propertyValeur:propNum,
      shbt1:Number(v.shbt1||0),
      scPresent:Number(v.scPresent||0),
      ecartHelloCerbere:Number(v.ecartHelloCerbere||0)
    },
    het1:{
      valeurMoteur:Number(v.het1!=null?v.het1:(v.horsPilotableAControler||0)),
      valeurAudit:Number(auditHet&&auditHet.total||0),
      ecart:Number(auditHet&&auditHet.ecart||0),
      nonCb:Number(auditHet&&auditHet.nonCb||0),
      cb:Number(auditHet&&auditHet.cb||0),
      nombreLignes:lignesHet.length,
      lignes:lignesHet.map(function(x){return{
        date:x.date_imputation,
        montant:Number(x.montant||0),
        categorie:String(x.categorie||''),
        libelle:String(x.libelle||''),
        cb:!!x.cb,
        diagnostic:String(x.diagnostic||'')
      };})
    }
  };
  console.log('[AUDIT SS1 HET1 20260912] '+JSON.stringify(resultat));
  return resultat;
}
