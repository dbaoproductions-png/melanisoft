# BudgetSoft — Audit des valeurs transversales

**Date : 2026-09-06**  
**Statut : audit d'architecture destiné à alimenter la supradoctrine**

## Objet

Identifier les grandeurs utilisées par plusieurs modules, repérer les recalculs concurrents et fixer une future source canonique unique pour chaque grandeur. L'objectif est double : éviter les calculs répétés et empêcher qu'une correction locale modifie silencieusement la vérité d'un autre module.

## Constat général

Le code contient plusieurs moteurs historiquement empilés. Certaines grandeurs sont aujourd'hui recalculées dans plusieurs modules avec des règles légèrement différentes. Le risque n'est donc pas seulement la lenteur : deux écrans peuvent produire des valeurs différentes à partir des mêmes feuilles.

Le futur snapshot global BudgetSoft doit matérialiser **une révision cohérente unique**. Les modules d'affichage consomment cette révision ; ils ne recalculent pas eux-mêmes une grandeur transversale déjà canonisée.

## Registre des valeurs transversales

| Grandeur | Sources brutes maîtres | Modules consommateurs | Constat actuel | Cible canonique |
|---|---|---|---|---|
| Révision BudgetSoft / horodatage | feuilles + paramètres + versions moteurs | tous | inexistante à l'échelle globale ; snapshots locaux indépendants | `revisionBudgetSoft`, `genereLe`, `versionDoctrine` dans le snapshot global |
| Opérations réelles | `Operations` | Opérations, Comptes, Dashboard, Analyses, Patrimoine, Cerbère, Trésorerie | lectures et filtres multiples | collection normalisée commune `operationsNormalisees` |
| Date comptable / futur-réalisé | `Operations.date_comptable` puis repli documenté | Opérations, Comptes, Dashboard, Analyses, Trésorerie | plusieurs fonctions et parfois `date` directement | arbitre commun `dateComptableCanonique` + `estFutureA(dateRef)` |
| Date d'achat CB | `date_achat`, `cle_rapprochement`, `carte_fin` | Cerbère, Cerbère Express, import, audit | détection structurée dans certains fichiers, heuristique texte dans d'autres | arbitre CB unique ; heuristique seulement en secours d'import |
| Solde réel par compte | relevé bancaire certifié + opérations postérieures selon date comptable | Comptes, Dashboard, Trésorerie, Patrimoine, Cerbère | recalculé au moins dans ComptesReview et Dashboard ; Patrimoine repart encore de `solde_initial + toutes opérations` | `soldesComptes` calculé une fois par révision |
| Solde disponible global | `soldesComptes` + périmètre comptes | Comptes, Dashboard, Trésorerie, Cerbère | périmètres/recalculs locaux | agrégat canonique `soldeDisponible` + périmètre explicite |
| Solde prévisionnel à une date | solde réel canonique + flux futurs canoniques | Comptes, Cerbère, Opérations futures, Dashboard | plusieurs couches de prévision et anciens moteurs | un moteur `tresoreriePrevisionnelle` unique ; vues = projections de ce moteur |
| Cycle budgétaire | convention 28 inclus → 27 inclus | Dashboard, Plan, Cerbère, Analyses, R0/P0/CF0 | CycleService porte déjà la convention mais des replis subsistent | `calendrierBudgetSoft` unique |
| Référentiel catégories / type | `Categories` | import, Opérations, Analyses, Cerbère, Dashboard | socle correct dans OperationsVentilation mais inférences existent ailleurs | `referentielCategories` unique ; catégorie enregistrée fait autorité |
| R0 | source maître recettes normales | Plan, Cerbère, projection | plusieurs moteurs historiques Cerbère | `r0Canon` calculé/lu une fois |
| CF0 | `Charges_fixes` + Plan d'ajustement | Charges fixes, Dashboard, Trésorerie, Cerbère | calcul d'occurrences présent dans plusieurs moteurs | `occurrencesCF0` et agrégats par cycle calculés une fois |
| P0 | budget pilotable maître | Plan, Cerbère, Dashboard | plusieurs générations P0/Pn historiques | `p0Canon` unique ; Pn dérivés une fois par révision |
| Plan effectif | `Plan_Actions`, `Plan_Evenements` | Plan, Trésorerie, Cerbère | lecture/statut/date/impact réinterprétés dans plusieurs fichiers | `planNormalise` commun puis vues spécialisées |
| CB déjà engagée | opérations CB normalisées + doctrine Cerbère | Cerbère, Cerbère Express | plusieurs moteurs/détections historiques | calcul Cerbère canonique unique, valeur publiée dans snapshot |
| Impact CB M/M+1/molettes | opérations CB + cycles + catégories pilotables | Cerbère, Cerbère Express | anciens fichiers contiennent encore la règle simplifiée M→M+1 | arbitre unique conforme à la supradoctrine ; aucun autre module ne l'utilise |
| Revenus/dépenses constatés | opérations normalisées + dates comptables + catégories | Dashboard, Analyses, Cerbère | agrégations répétées | agrégats communs par jour/mois/cycle, réutilisables |
| Crédits : capital restant / encours revolving | `Credits` | Crédits, Patrimoine, Cerbère/analyses éventuels | `CreditsDataV2` agrège ; Patrimoine recalcule séparément | `creditsCanon` + agrégats `capitalAmortissable`, `encoursRevolving` |
| Dettes hors crédit | `Dettes` | Crédits, Patrimoine | agrégations séparées | `dettesCanon` + `dettesHorsCreditActives` |
| Patrimoine net | Actifs + soldes financiers canoniques − dettes canoniques | Patrimoine, Analyses | Patrimoine recalcule les comptes et dettes localement | simple dérivé du snapshot global |
| Pluxee | source Pluxee dédiée | Pluxee, Comptes (information), Cerbère spécialisé | plusieurs couches historiques et correctifs | `pluxeeCanon` séparé du solde bancaire, publié une fois |
| Rapprochement CF0 | `charge_fixe_id` / moteur de rapprochement | Operations, Charges fixes, Cerbère, Trésorerie | moteur + lectures locales | statut/lien canonique porté par l'opération ; occurrence prévue remplacée une seule fois |

## Duplications/résidus particulièrement risqués constatés

### 1. Solde bancaire réel

`ComptesReview20260828.gs` calcule le solde à partir du dernier solde de relevé certifié et des mouvements postérieurs. `DashboardData.gs` possède son propre `soldeCompte()` avec une logique très proche. `Patrimoine.gs`, lui, calcule encore `solde_initial + somme des opérations`, sans reprendre l'autorité du relevé certifié ni la même frontière temporelle.

**Risque :** Comptes, Dashboard et Patrimoine peuvent afficher des positions financières différentes.

**Décision :** un seul calcul `soldesComptes` doit être produit par la reconstruction globale ; les trois modules le consomment.

### 2. CB différée

`OperationsVentilation.gs` possède un socle structuré utile (`date_achat`, `carte_fin`, dédoublonnage) mais conserve dans son commentaire et `dateImputationCarteCerbereBudgetSoft_()` l'ancienne règle simplifiée « CB de M → M+1 ». `CycleService.gs` possède encore une détection carte heuristique par libellé. `DashboardData.gs` détecte aussi les CB avec `carte_fin` ou regex. Les correctifs Cerbère récents possèdent encore leur propre chaîne.

**Risque :** une même carte peut être reconnue, datée ou imputée différemment selon le module.

**Décision :** séparer définitivement :
- identification factuelle d'une CB = arbitre BudgetSoft commun ;
- impact M/M+1/molettes = arbitre Cerbère uniquement ;
- date comptable bancaire = règle générale BudgetSoft.

### 3. Cycles

`CycleService.gs` établit explicitement la convention 28 → 27 et doit devenir l'autorité. Les autres modules ne doivent plus reconstruire leurs propres bornes, sauf appel à ce service.

### 4. Charges fixes

La génération des échéances existe à plusieurs endroits : primitives générales, Dashboard, trésorerie et Cerbère. Les ajustements Plan peuvent donc être appliqués différemment.

**Décision :** produire une seule collection `occurrencesCF0` normalisée pour chaque horizon/cycle. Dashboard, Trésorerie et Cerbère sélectionnent dans cette collection sans régénérer les échéances.

### 5. Crédits / dettes / patrimoine

`CreditsDataV2.gs` fournit déjà des agrégats détaillés. `Patrimoine.gs` relit et somme directement `Credits`/`Dettes` et recalcule aussi les comptes.

**Décision :** Patrimoine devient un module de composition : actifs patrimoniaux + soldes financiers canoniques − agrégats dettes/crédits canoniques.

### 6. Solde prévisionnel

Le dépôt contient plusieurs générations successives de moteurs `TreasuryForecast*`. Leur empilement a apporté des corrections mais multiplie les chemins possibles.

**Décision :** la reconstruction globale appelle un seul point d'entrée final de trésorerie. Le snapshot en stocke les résultats de référence et les flux futurs normalisés. Les écrans ne doivent pas choisir eux-mêmes une ancienne ou une nouvelle couche.

## Architecture cible de calcul

```text
FEUILLES MAÎTRES
  Operations, Comptes, Parametres, Categories, Charges_fixes,
  Plan_*, Credits, Dettes, Actifs, sources Pluxee
        ↓
NORMALISATION COMMUNE
  opérations, catégories, calendrier, comptes, Plan, crédits/dettes
        ↓
ARBITRES / AGRÉGATS TRANSVERSAUX (une seule fois)
  soldesComptes
  soldeDisponible
  opérations réalisées/futures
  agrégats revenus/dépenses
  occurrencesCF0
  R0 / P0
  crédits/dettes
  Pluxee
  flux futurs de trésorerie
        ↓
MOTEURS MÉTIER
  Cerbère (exception CB + M/M+1 + molettes)
  Cerbère Express (adaptateur de Cerbère)
  Patrimoine (composition)
  Analyses (lecture)
        ↓
SNAPSHOT GLOBAL ATOMIQUE
        ↓
INTERFACE : lecture sans recalcul transverse
```

## Règles de migration

1. Ne pas supprimer immédiatement les anciens moteurs : d'abord introduire l'autorité canonique et comparer les résultats.
2. Chaque grandeur transversale doit avoir un **propriétaire unique** (fonction/service canonique).
3. Un module peut calculer une grandeur locale uniquement si elle n'existe pas dans le registre transversal.
4. Toute nouvelle grandeur utilisée par deux modules ou plus doit être ajoutée au registre avant développement.
5. Les snapshots locaux sont transitoires ; la cible est un snapshot global atomique.
6. Une mutation de données maîtres invalide la révision globale et déclenche une reconstruction ; l'ouverture normale ne doit pas reconstruire les agrégats transversaux.
7. Le déclencheur périodique (cible : toutes les 30 minutes) reconstruit la même révision globale qu'un rafraîchissement manuel.
8. Les valeurs affichées doivent exposer `revisionBudgetSoft` et `genereLe` pour permettre l'audit de cohérence.
