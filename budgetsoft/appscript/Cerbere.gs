const CERBERE_VERSION='1.0';
const CERBERE_ACTIONS_HEADERS=['id','nom','type','date_effet','montant','cible','statut','commentaire'];
const CERBERE_OBJECTIFS_HEADERS=['id','nom','type','cible','montant_cible','date_cible','priorite','statut','commentaire'];

function assurerTableCerbere_(nom,headers){
  const ss=SpreadsheetApp.getActiveSpreadsheet();let f=ss.getSheetByName(nom);
  if(!f){f=ss.insertSheet(nom);f.getRange(1,1,1,headers.length).setValues([headers]);f.setFrozenRows(1);f.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#0f6b57').setFontColor('#fff');}
  else{const w=Math.max(1,f.getLastColumn()),h=f.getRange(1,1,1,w).getValues()[0].map(x=>String(x||'').trim());const miss=headers.filter(x=>!h.includes(x));if(miss.length)f.getRange(1,w+1,1,miss.length).setValues([miss]);}
  return f;
}
function lireTableCerbere_(nom,headers){const f=assurerTableCerbere_(nom,headers);if(f.getLastRow()<2)return[];const vals=f.getRange(2,1,f.getLastRow()-1,headers.length).getValues();return vals.filter(r=>r.some(v=>v!==''&&v!==null)).map(r=>Object.fromEntries(headers.map((h,i)=>[h,serialiserValeur_(r[i])])));}
function ajouterCerbere_(nom,headers,obj){const f=assurerTableCerbere_(nom,headers),o=Object.assign({},obj);if(!o.id)o.id=Utilities.getUuid();f.appendRow(headers.map(h=>normaliserValeur_(o[h])));return o;}
function dateCerbere_(v){return dateLocaleBudgetSoft_(v||new Date());}
function isoCerbere_(v){return Utilities.formatDate(dateCerbere_(v),Session.getScriptTimeZone(),'yyyy-MM-dd');}
function dansPeriodeCerbere_(v,p){const d=dateCerbere_(v),a=dateCerbere_(p.debut),b=dateCerbere_(p.fin);return d>=a&&d<=b;}
function sommeCerbere_(xs){return Math.round(xs.reduce((s,v)=>s+Number(v||0),0)*100)/100;}

function initialiserCerbereV1(){
  assurerTableCerbere_('Cerbere_Actions',CERBERE_ACTIONS_HEADERS);assurerTableCerbere_('Cerbere_Objectifs',CERBERE_OBJECTIFS_HEADERS);
  const actions=lireTableCerbere_('Cerbere_Actions',CERBERE_ACTIONS_HEADERS),objectifs=lireTableCerbere_('Cerbere_Objectifs',CERBERE_OBJECTIFS_HEADERS);
  function actionUnique(nom,type,date,montant,cible,commentaire){if(actions.some(a=>String(a.nom)===nom))return;ajouterCerbere_('Cerbere_Actions',CERBERE_ACTIONS_HEADERS,{nom,type,date_effet:date,montant,cible,statut:'Prévu',commentaire});}
  actionUnique('Revenu exceptionnel septembre','revenu_exceptionnel','2026-09-01',1200,'Budget','Ressource connue, à arbitrer par Cerbère.');
  actionUnique('Report CASDEN septembre','report_credit','2026-09-04',576.33,'CASDEN','Capacité temporaire réservée au désendettement, pas un revenu structurel.');
  actionUnique('Report CASDEN octobre','report_credit','2026-10-04',576.33,'CASDEN','Capacité temporaire réservée au désendettement, pas un revenu structurel.');
  actionUnique('Prime novembre','revenu_exceptionnel','2026-11-15',600,'Désendettement','Prime connue, affectation prioritaire au désendettement.');
  actionUnique('Prime décembre','revenu_exceptionnel','2026-12-15',800,'Désendettement','Prime connue, affectation prioritaire au désendettement.');
  if(!objectifs.some(o=>/ONEY/i.test(String(o.nom||'')+' '+String(o.cible||'')))){
    const credits=lireTable_('Credits'),oney=credits.find(c=>/ONEY/i.test(String(c.nom||'')));const encours=Math.max(0,Number(oney&&oney.capital_restant||0));
    ajouterCerbere_('Cerbere_Objectifs',CERBERE_OBJECTIFS_HEADERS,{nom:'Solder Oney en 3 mois',type:'désendettement',cible:'Oney Carte b+',montant_cible:encours||2773.71,date_cible:'2026-11-30',priorite:1,statut:'Actif',commentaire:'Objectif prioritaire : libérer la mensualité et stopper le coût du revolving.'});
  }
  return{ok:true,version:CERBERE_VERSION};
}

function construirePeriodesCerbere_(n){const r=[];let ref=new Date();for(let i=0;i<n;i++){const d=new Date(ref.getFullYear(),ref.getMonth()+i,ref.getDate(),12);const p=calculerCycleDepuisSalaire_(d,[],28,null);r.push(p);}return r;}
function revenusHistoriquesCerbere_(ops){const limite=new Date();limite.setMonth(limite.getMonth()-4);const pos=ops.filter(o=>Number(o.montant||0)>0&&dateCerbere_(o.date_comptable||o.date)>=limite&&!/COFIDIS|CREDIT|FINANCEMENT|VIREMENT DE M MME HERNEBRING/i.test(String(o.libelle_bancaire||o.libelle||''))).map(o=>Number(o.montant||0));return pos.length?sommeCerbere_(pos)/4:0;}
function chargesFixesPeriodeCerbere_(charges,p){let total=0;const a=dateCerbere_(p.debut),b=dateCerbere_(p.fin);charges.filter(c=>convertirBooleen_(c.actif)!==false).forEach(c=>{const deb=c.date_debut?dateCerbere_(c.date_debut):a,fin=c.date_fin?dateCerbere_(c.date_fin):b;calculerEcheancesJusqua_(c,deb,fin,b).filter(d=>d>=a&&d<=b).forEach(()=>{const m=Math.abs(Number(c.montant||0));total+=String(c.type||'depense').toLowerCase()==='revenu'?-m:m;});});return Math.round(total*100)/100;}
function protectionCbCerbere_(ops,p){const now=dateCerbere_(new Date());return sommeCerbere_(ops.filter(o=>{const achat=o.date_achat?dateCerbere_(o.date_achat):null,comp=o.date_comptable?dateCerbere_(o.date_comptable):null;if(!achat||!comp||comp<now)return false;return comp>achat&&dansPeriodeCerbere_(comp,p)&&estOperationCarte_(o);}).map(o=>Math.abs(Number(o.montant||0))));}
function effortObjectifsCerbere_(objectifs,p,index){let total=0;objectifs.filter(o=>String(o.statut||'Actif').toLowerCase()!=='terminé').forEach(o=>{const cible=Math.max(0,Number(o.montant_cible||0));if(!cible)return;const dateC=o.date_cible?dateCerbere_(o.date_cible):null;const restantes=Math.max(1,dateC?Math.min(6,Math.max(1,(dateC.getFullYear()-dateCerbere_(p.debut).getFullYear())*12+dateC.getMonth()-dateCerbere_(p.debut).getMonth()+1)):3);if(index<restantes)total+=cible/restantes;});return Math.round(total*100)/100;}
function actionsPeriodeCerbere_(actions,p){let revenus=0,reserves=0,libelles=[];actions.filter(a=>String(a.statut||'Prévu').toLowerCase()!=='annulé'&&dansPeriodeCerbere_(a.date_effet,p)).forEach(a=>{const m=Math.abs(Number(a.montant||0));if(a.type==='revenu_exceptionnel')revenus+=m;else if(a.type==='report_credit')reserves+=m;else if(a.type==='charge_fixe_delta')reserves+=Number(a.montant||0);libelles.push({nom:a.nom,type:a.type,montant:Number(a.montant||0),cible:a.cible||''});});return{revenus:Math.round(revenus*100)/100,reserves:Math.round(reserves*100)/100,libelles};}
function depensesReellesCerbere_(ops,p){const rows=ops.filter(o=>Number(o.montant||0)<0&&dansPeriodeCerbere_(o.date_achat||o.date||o.date_comptable,p));const par={};rows.forEach(o=>{const c=String(o.categorie||'Sans catégorie');par[c]=(par[c]||0)+Math.abs(Number(o.montant||0));});return{total:sommeCerbere_(rows.map(o=>Math.abs(Number(o.montant||0)))),parCategorie:par};}
function poidsCategoriesCerbere_(ops,categories){const limite=new Date();limite.setMonth(limite.getMonth()-4);const par={};ops.filter(o=>Number(o.montant||0)<0&&dateCerbere_(o.date_achat||o.date)>=limite).forEach(o=>{const c=String(o.categorie||'Sans catégorie');if(/crédit|impôt|mutuelle|assurance|loyer|énergie|télécom/i.test(c))return;par[c]=(par[c]||0)+Math.abs(Number(o.montant||0));});let total=Object.values(par).reduce((s,v)=>s+v,0)||1;const cmap=new Map((categories||[]).map(c=>[String(c.nom),c]));return Object.keys(par).map(c=>({categorie:c,poids:par[c]/total,couleur:(cmap.get(c)||{}).couleur||'#7a8b88'})).sort((a,b)=>b.poids-a.poids);}

function chargerCerbereV1(){
  initialiserCerbereV1();verifierInitialisation_();
  const ops=lireTable_('Operations'),charges=lireTable_('Charges_fixes'),cats=lireTable_('Categories'),actions=lireTableCerbere_('Cerbere_Actions',CERBERE_ACTIONS_HEADERS),objectifs=lireTableCerbere_('Cerbere_Objectifs',CERBERE_OBJECTIFS_HEADERS),periodes=construirePeriodesCerbere_(6),revenuBase=revenusHistoriquesCerbere_(ops),poids=poidsCategoriesCerbere_(ops,cats),epargne=50;
  const result=periodes.map((p,i)=>{const act=actionsPeriodeCerbere_(actions,p),fixes=chargesFixesPeriodeCerbere_(charges,p),cb=protectionCbCerbere_(ops,p),obj=effortObjectifsCerbere_(objectifs,p,i),recettes=Math.round((revenuBase+act.revenus)*100)/100,reserveObjectifs=Math.max(0,obj-act.reserves),pilotable=Math.max(0,Math.round((recettes-fixes-epargne-cb-reserveObjectifs)*100)/100),reel=depensesReellesCerbere_(ops,p);const enveloppes=poids.slice(0,14).map(x=>{const prev=Math.round(pilotable*x.poids*100)/100,dep=Math.round(Number(reel.parCategorie[x.categorie]||0)*100)/100,ratio=prev>0?dep/prev:0;return{categorie:x.categorie,couleur:x.couleur,prevu:prev,reel:dep,reste:Math.round((prev-dep)*100)/100,etat:ratio>1?'rouge':ratio>=.85?'orange':'vert'};});let etat='vert';if(enveloppes.some(x=>x.etat==='rouge')||pilotable<=0)etat='rouge';else if(enveloppes.some(x=>x.etat==='orange'))etat='orange';return{index:i+1,periode:p,etat,recettes,revenuBase:Math.round(revenuBase*100)/100,revenusExceptionnels:act.revenus,chargesFixes:fixes,epargne,protectionCb:cb,objectifs:reserveObjectifs,actions:act.libelles,enveloppePilotable:pilotable,depensesReelles:reel.total,enveloppes};});
  return{version:CERBERE_VERSION,mode:'prévisionnel_lecture_seule',regles:{epargneMensuelle:epargne,cycle:'28 → 27',principe:'Cerbère ne modifie jamais Operations, Charges_fixes, Credits ou Comptes.'},periodes:result,actions,objectifs};
}
