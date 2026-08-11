function estOperationSalaire_(operation) {
  const montant = Number(operation && operation.montant || 0);
  if (montant <= 0) return false;
  const texte = normaliserTexteCycle_([operation && operation.libelle, operation && operation.details, operation && operation.categorie, operation && operation.commentaire].join(' '));
  const motSalaire = CYCLE_SALARY_WORDS.some(mot => texte.indexOf(mot) >= 0);
  const mairieToulouse = texte.indexOf('MAIRIE DE TOULOUSE') >= 0 || (texte.indexOf('TOULOUSE') >= 0 && texte.indexOf('PAYE') >= 0);
  return motSalaire || mairieToulouse;
}

function estOperationCarte_(operation) {
  if (operation && operation.estCarte === true) return true;
  const brut = [operation && operation.libelle, operation && operation.details, operation && operation.commentaire].join(' ');
  const texte = normaliserTexteCycle_(brut);
  // Exclusions prioritaires : ces mouvements ne doivent jamais être transformés en carte différée,
  // même si leur libellé contient une date sous la forme « DU 040626 ».
  if (/\bPRLV\b|\bPRELEVEMENT\b|\bVIR(?:EMENT)?\b|\bCHEQUE\b/.test(texte)) return false;
  if (/\bECHEANCE\s+PRET\b|\bPRET\b|\bCREDIT\b|\bINTERETS?\s+DEBITEURS?\b|\bCASDEN\b/.test(texte)) return false;
  if (/FACTURE\s*S?\s*CARTE/.test(texte)) return true;
  if (/\bDU\s+\d{6}\b/.test(texte)) return true;
  return false;
}

function normaliserTexteCycle_(texte) { return String(texte || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9()]+/g, ' ').trim(); }
function dernierJourDuMois_(date) { const d=date instanceof Date?date:new Date(date); return new Date(d.getFullYear(),d.getMonth()+1,0,12,0,0,0); }
function dateDebitCarte_(dateAchat) { return dernierJourDuMois_(dateAchat); }
function dateJourCycle_(date) { const d=date instanceof Date?date:new Date(date); return new Date(d.getFullYear(),d.getMonth(),d.getDate(),12,0,0,0); }
function ecartJoursCycle_(a,b) { return Math.round((dateJourCycle_(b)-dateJourCycle_(a))/86400000); }

function cleSalaire_(operation) {
  const texte=normaliserTexteCycle_([operation&&operation.libelle,operation&&operation.details,operation&&operation.commentaire].join(' '));
  if (texte.indexOf('MAIRIE DE TOULOUSE')>=0 || (texte.indexOf('TOULOUSE')>=0&&texte.indexOf('PAYE')>=0)) return 'MAIRIE DE TOULOUSE';
  return texte.replace(/\b(SALAIRE|PAYE|TRAITEMENT)\b/g,'').replace(/\bVIR\b|\bSEPA\b|\bRECU\b|\bMOTIF\b/g,' ').replace(/\b\d{1,2}[ .\/]\d{1,2}(?:[ .\/]\d{2,4})?\b/g,' ').replace(/\b(?:19|20)\d{2}\b/g,' ').replace(/\bPAYE\d+\b/g,' ').replace(/\s+/g,' ').trim()||'SALAIRE';
}

function detecterSalairePrincipal_(operations, moisHistorique) {
  const limite=new Date(); limite.setMonth(limite.getMonth()-Math.max(3,Number(moisHistorique)||12));
  const candidats=(operations||[]).filter(estOperationSalaire_).map(o=>({operation:o,date:new Date(o.date),montant:Math.abs(Number(o.montant||0)),cle:cleSalaire_(o)})).filter(c=>!isNaN(c.date)&&c.date>=limite);
  if(!candidats.length)return null;
  const groupes={}; candidats.forEach(c=>{if(!groupes[c.cle])groupes[c.cle]=[];groupes[c.cle].push(c);});
  const groupe=Object.values(groupes).sort((a,b)=>b.length-a.length||moyenne_(b.map(x=>x.montant))-moyenne_(a.map(x=>x.montant)))[0];
  const jours=groupe.map(c=>c.date.getDate()).sort((a,b)=>a-b),montants=groupe.map(c=>c.montant),dernier=groupe.slice().sort((a,b)=>b.date-a.date)[0];
  return {cle:dernier.cle,libelle:dernier.cle==='MAIRIE DE TOULOUSE'?'Salaire — Mairie de Toulouse':(dernier.operation.libelle||'Salaire principal'),compte:dernier.operation.compte||'',occurrences:groupe.length,montantMoyen:arrondirCycle_(moyenne_(montants)),jourMoyen:Math.round(moyenne_(jours)),jourMin:Math.min.apply(null,jours),jourMax:Math.max.apply(null,jours),derniereDate:dernier.date.toISOString(),confiance:Math.min(100,35+groupe.length*10)};
}
function estSalairePrincipal_(operation,salairePrincipal){if(!operation||!salairePrincipal||!estOperationSalaire_(operation))return false;if(salairePrincipal.compte&&String(operation.compte||'')!==String(salairePrincipal.compte))return false;return cleSalaire_(operation)===salairePrincipal.cle;}
function calculerCycleDepuisSalaire_(reference,operations,jourRepli,salairePrincipal){const dateRef=reference instanceof Date?reference:new Date(reference||new Date());const filtre=salairePrincipal?o=>estSalairePrincipal_(o,salairePrincipal):o=>estOperationSalaire_(o);const salaires=(operations||[]).filter(filtre).map(o=>new Date(o.date)).filter(d=>!isNaN(d)).sort((a,b)=>a-b);const precedent=salaires.filter(d=>d<=dateRef).pop(),suivant=salaires.find(d=>d>dateRef);if(precedent){let fin;if(suivant)fin=new Date(suivant.getTime()-1);else{const jourEstime=Math.max(1,Math.min(28,Number(salairePrincipal&&salairePrincipal.jourMoyen)||Number(jourRepli)||28));let prochainEstime=new Date(precedent.getFullYear(),precedent.getMonth()+1,jourEstime,0,0,0,0);if(prochainEstime<=precedent)prochainEstime=new Date(precedent.getFullYear(),precedent.getMonth()+2,jourEstime,0,0,0,0);fin=new Date(prochainEstime.getTime()-1);}return construirePeriodeCycle_(precedent,fin,true);}const jour=Math.max(1,Math.min(28,Number(jourRepli)||28));const debut=dateRef.getDate()>=jour?new Date(dateRef.getFullYear(),dateRef.getMonth(),jour):new Date(dateRef.getFullYear(),dateRef.getMonth()-1,jour);const fin=new Date(new Date(debut.getFullYear(),debut.getMonth()+1,jour).getTime()-1);return construirePeriodeCycle_(debut,fin,false);}
function construirePeriodeCycle_(debut,fin,salaireDetecte){const maintenant=new Date(),debutJour=dateJourCycle_(debut),finJour=dateJourCycle_(fin),maintenantJour=dateJourCycle_(maintenant),duree=Math.max(1,ecartJoursCycle_(debutJour,finJour)+1),jourCourant=maintenantJour<debutJour?0:maintenantJour>finJour?duree:Math.min(duree,ecartJoursCycle_(debutJour,maintenantJour)+1),moisNom=new Date(debut.getFullYear(),debut.getMonth()+1,1),libelle=moisNom.toLocaleDateString('fr-FR',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase());return {debut:debut.toISOString(),fin:fin.toISOString(),cle:Utilities.formatDate(moisNom,Session.getScriptTimeZone(),'yyyy-MM'),libelle,salaireDetecte,dureeJours:duree,jourCourant,termine:maintenantJour>finJour,progression:Math.max(0,Math.min(100,Math.round(jourCourant/duree*100))),joursRestants:Math.max(0,ecartJoursCycle_(maintenantJour,finJour))};}
function moyenne_(valeurs){return valeurs.length?valeurs.reduce((s,v)=>s+Number(v||0),0)/valeurs.length:0;}
function arrondirCycle_(valeur){return Math.round(Number(valeur||0)*100)/100;}
