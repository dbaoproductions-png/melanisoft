/**
 * Vue économique C2 : les deux échéances copro sont déclarées distinctes
 * par l'utilisateur le 21/10/2026. Pas de débit daté pour l'ancien cycle.
 * NE modifie pas les montants canoniques Cerbère / trésorerie.
 */
function calculerVueEconomiqueCoproC2BudgetSoft20261021_(args){
 const x=args||{}, d=x.dashboard||{},c=d.cycleSuivant||{},
  suivi=d.suiviAttentesChargesFixes20261021||{},
  lignes=x.lignesProjection||[],id='d476505c-189d-48a3-9eb1-51467df7fbc1',
  cle=id+'|2026-09-28',anomalies=[];
 if(c.debut!=='2026-10-28'||c.fin!=='2026-11-27')
  return{ok:true,applicable:false,lectureSeule:true,motif:'hors_cycle_cible',impactFinancierCanonique:0};
 const attends=(suivi.attentes||[]).filter(z=>z.cle===cle);
 if(suivi.ok!==true||attends.length!==1||Number(attends[0].montant)!==550)
  anomalies.push('provision_persistante_invalide');
 const futurs=lignes.filter(z=>String(z.sourceId||'')===id&&
  String(z.date||'').slice(0,10)>='2026-10-28'&&String(z.date||'').slice(0,10)<='2026-11-27');
 if(futurs.length!==1||String(futurs[0]&&futurs[0].date||'').slice(0,10)!=='2026-11-15'||
  Math.abs(Number(futurs[0]&&futurs[0].montantSigne||0))!==550)
  anomalies.push('nouvelle_echeance_non_verifiee');
 // Ne présumer aucun règlement : si une décision de paiement ou d'annulation
 // vise l'ancienne provision, la publication économique doit être suspendue.
 const decisions=Array.isArray(x.decisions)?x.decisions:[],
  reg=projeterDecisionsOccurrencesCfBudgetSoft20261021_(decisions);
 if(!reg.ok)anomalies.push('registre_invalide');
 if((reg.paiements||[]).some(p=>p.chargeId===id&&p.origine==='2026-09-28'))
  anomalies.push('paiement_a_rapprocher');
 if((decisions||[]).some(p=>String(p.charge_fixe_id||'')===id&&
   dateOrigineDecisionCfBudgetSoft20261021_(p.date_origine)==='2026-09-28'&&
   String(p.decision||'')==='annulee'&&p.actif!==false))
  anomalies.push('annulation_a_rapprocher');
 const base=Number(c.depensesPrevisionnelles);
 if(!Number.isFinite(base))anomalies.push('total_projection_indisponible');
 const ok=anomalies.length===0;
 return{ok,applicable:true,lectureSeule:true,anomalies,
  identiteReport:cle,reportEconomique:ok?550:0,
  echeanceNovembreDansProjection:ok?550:0,
  totalCoproDistinctes:ok?1100:0,
  depensesPrevisionnellesCanoniques:Number.isFinite(base)?base:null,
  depensesEconomiquesAvecReport:ok?Math.round((base+550)*100)/100:null,
  impactFinancierCanonique:0,operationBancaireCreee:false,
  confirmationMetier:'utilisateur_2026-10-21_deux_echeances_distinctes',
  autorisationDebitBancaire:false,
  garde:'Vue économique complémentaire seulement ; ne pas modifier soldes projetés, CFT1, EP ou réimporter cette provision dans les charges bancaires.'};
}
function testerVueEconomiqueCoproC2BudgetSoft20261021(){
 const id='d476505c-189d-48a3-9eb1-51467df7fbc1',
  decision={charge_fixe_id:id,date_origine:'2026-09-28',decision:'en_attente_prelevement',montant:550,
   reference_preuve:'snapshot approuve',actif:true},
  input={dashboard:{cycleSuivant:{debut:'2026-10-28',fin:'2026-11-27',depensesPrevisionnelles:4000},
    suiviAttentesChargesFixes20261021:{ok:true,attentes:[{cle:id+'|2026-09-28',montant:550}]}},
   lignesProjection:[{sourceId:id,date:'2026-11-15',montantSigne:-550}],decisions:[decision]};
 const a=calculerVueEconomiqueCoproC2BudgetSoft20261021_(input);
 const b=calculerVueEconomiqueCoproC2BudgetSoft20261021_(Object.assign({},input,{
  decisions:[decision,{charge_fixe_id:id,date_origine:'2026-09-28',decision:'paiement_confirme',
   montant:550,operation_id:'OP-PROUVE',reference_preuve:'exemple',actif:true}]}));
 const c=calculerVueEconomiqueCoproC2BudgetSoft20261021_(Object.assign({},input,{
  lignesProjection:[]}));
 const tests={deuxEcheancesDistinctes:a.ok&&a.totalCoproDistinctes===1100,
  reportSansMutationCanonique:a.depensesEconomiquesAvecReport===4550&&a.impactFinancierCanonique===0,
  paiementBloquePublication:!b.ok&&b.depensesEconomiquesAvecReport===null,
  nouvelleEcheanceAbsenteBloque:!c.ok};
 const out={ok:Object.values(tests).every(Boolean),lectureSeule:true,tests};
 console.log('[TEST VUE ECONOMIQUE COPRO C2] '+JSON.stringify(out));return out;
}
function auditerVueEconomiqueCoproC2BudgetSoft20261021(){
 const snap=chargerSnapshotGlobalLegacyBudgetSoft20260906_(),e=snap&&snap.etat||{},m=e.modules||{},
  v=m.dashboard&&m.dashboard.vueEconomiqueCoproC2BudgetSoft20261021||null;
 const out={ok:!!v&&v.ok===true&&v.totalCoproDistinctes===1100,
  lectureSeule:true,revision:String(e.revisionBudgetSoft||''),publie:!!v,
  vue:v,impactFinancierCanonique:v&&v.impactFinancierCanonique};
 console.log('[AUDIT VUE ECONOMIQUE COPRO C2] '+JSON.stringify(out));return out;
}
