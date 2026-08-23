const RELEVES_CERTIFIES_BUDGETSOFT_=[
 {debut:'2026-01-15',fin:'2026-02-15',ouverture:621.05,cloture:-290.61,debits:7819.12,credits:6907.46},
 {debut:'2026-02-15',fin:'2026-03-15',ouverture:-290.61,cloture:115.14,debits:6206.89,credits:6612.64},
 {debut:'2026-03-15',fin:'2026-04-15',ouverture:115.14,cloture:622.34,debits:7372.95,credits:7880.15},
 {debut:'2026-04-15',fin:'2026-05-15',ouverture:622.34,cloture:919.63,debits:7268.18,credits:7565.47},
 {debut:'2026-05-15',fin:'2026-06-15',ouverture:919.63,cloture:-532.86,debits:7542.00,credits:6089.51},
 {debut:'2026-06-15',fin:'2026-07-15',ouverture:-532.86,cloture:121.82,debits:7290.27,credits:7944.95}
];
function arrReleve_(n){return Math.round(Number(n)*100)/100;}
function controleChaineRelevesCertifiesBudgetSoft(){
 const r=RELEVES_CERTIFIES_BUDGETSOFT_,details=[];let ok=true;
 r.forEach((x,i)=>{const calc=arrReleve_(x.ouverture-x.debits+x.credits),ecart=arrReleve_(calc-x.cloture),continuite=i?arrReleve_(r[i-1].cloture-x.ouverture):0,ligneOk=Math.abs(ecart)<.011&&Math.abs(continuite)<.011;ok=ok&&ligneOk;details.push(Object.assign({},x,{clotureCalculee:calc,ecart,ecartContinuite:continuite,ok:ligneOk}));});
 return{ok,baseHistorique:{date:'2026-01-15',solde:621.05},dernierSoldeCertifie:{date:r[r.length-1].fin,solde:r[r.length-1].cloture},releves:details};
}
function installerBaseHistoriqueSoldeBudgetSoft(){
 verifierInitialisation_();const comptes=lireTable_('Comptes').filter(c=>convertirBooleen_(c.actif));const c=comptes.find(c=>/compte\s*(joint|courant)|compte\s*cheques?/i.test(String((c.nom||'')+' '+(c.type||'')))&&!/livret|epargne|épargne/i.test(String((c.nom||'')+' '+(c.type||''))));if(!c)throw new Error('Compte courant introuvable.');
 const audit=controleChaineRelevesCertifiesBudgetSoft();if(!audit.ok)throw new Error('Chaîne des relevés certifiés incohérente : installation refusée.');
 const ss=SpreadsheetApp.getActiveSpreadsheet(),f=ss.getSheetByName('Parametres');if(!f)throw new Error('Onglet Parametres introuvable.');const rows=f.getLastRow()>1?f.getRange(2,1,f.getLastRow()-1,Math.max(2,f.getLastColumn())).getValues():[];const id=String(c.id),vals={['solde_releve_'+id]:'621.05',['date_solde_releve_'+id]:'2026-01-15T12:00:00',['solde_releve_source_'+id]:'Hello bank! relevé 15/01/2026 — base historique certifiée'};Object.keys(vals).forEach(k=>{let n=rows.findIndex(r=>String(r[0])===k);if(n>=0){f.getRange(n+2,2).setValue(vals[k]);rows[n][1]=vals[k];}else{f.appendRow([k,vals[k]]);rows.push([k,vals[k]]);}});return{ok:true,compte:String(c.nom||id),base:audit.baseHistorique,controle:audit};
}
function verifierSoldeApresImportPdfBudgetSoft(meta){
 const audit=controleChaineRelevesCertifiesBudgetSoft();if(!meta)return audit;const norm=n=>arrReleve_(Number(String(n||0).replace(',','.'))),d=String(meta.dateDebut||meta.debut||'').slice(0,10),f=String(meta.dateFin||meta.fin||'').slice(0,10),x=RELEVES_CERTIFIES_BUDGETSOFT_.find(r=>r.debut===d&&r.fin===f);if(!x)return{ok:audit.ok,chaine:audit,controleImport:null,message:'Relevé hors chaîne certifiée connue : contrôle arithmétique du parseur à effectuer.'};const rec={debut:d,fin:f,ouverture:norm(meta.soldeOuverture||meta.ouverture),cloture:norm(meta.soldeCloture||meta.cloture),debits:norm(meta.totalDebits||meta.debits),credits:norm(meta.totalCredits||meta.credits)};const ecarts={ouverture:arrReleve_(rec.ouverture-x.ouverture),cloture:arrReleve_(rec.cloture-x.cloture),debits:arrReleve_(rec.debits-x.debits),credits:arrReleve_(rec.credits-x.credits)};const ok=Object.values(ecarts).every(v=>Math.abs(v)<.011);return{ok,chaine:audit,controleImport:{attendu:x,recu:rec,ecarts},message:ok?'Relevé conforme au référentiel bancaire certifié.':'Écart détecté avec le relevé bancaire certifié.'};
}
