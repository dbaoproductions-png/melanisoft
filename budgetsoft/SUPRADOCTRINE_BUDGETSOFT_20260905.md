# BudgetSoft — Supradoctrine fonctionnelle

**Version : 2026-09-06**

Ce document est normatif. Il précise et, en cas de contradiction, prévaut sur les formulations historiques de `BUDGETSOFT_DOCTRINE.md`, `docs/DOCTRINE_BUDGETSOFT.md` et des doctrines de modules antérieures.

L'audit détaillé des valeurs partagées entre modules est conservé dans `docs/AUDIT_VALEURS_TRANSVERSALES_20260906.md`. Les règles ci-dessous en constituent la traduction normative.

## 1. Hiérarchie fonctionnelle

La hiérarchie est :

`BudgetSoft → modules BudgetSoft → Cerbère → Cerbère Express`

- **BudgetSoft** est le système maître.
- **Cerbère** est un module de BudgetSoft, spécialisé dans le pilotage quotidien et la trésorerie à court terme.
- **Cerbère Express** est une vue / sous-module spécialisé de Cerbère.
- Une règle propre à Cerbère ne devient jamais implicitement une règle générale de BudgetSoft.
- Cerbère Express hérite de la supradoctrine BudgetSoft puis de la doctrine Cerbère ; il ne peut les contredire que par une règle explicitement validée et strictement limitée à son périmètre.

## 2. Règle générale : date comptable

Sauf doctrine explicitement validée pour un module, **la date comptable est la vérité temporelle commune de BudgetSoft**.

Elle gouverne notamment :

- l'affichage des opérations réalisées ;
- l'affichage des opérations futures ;
- les soldes et soldes prévisionnels bancaires ;
- les historiques et statistiques ;
- les rapprochements et agrégations ordinaires.

Une opération dont la date comptable est future reste une **opération future** dans les modules généraux, même si Cerbère peut déjà la considérer comme engagée selon sa doctrine propre.

## 3. Exception strictement locale : CB dans Cerbère

Cerbère et Cerbère Express sont les seuls modules autorisés à appliquer une lecture anticipée des cartes bancaires à débit différé.

Cette exception répond à la question : **qu'est-ce qui est déjà dépensé / engagé pour le pilotage, même si la banque ne l'a pas encore comptabilisé ?**

Elle ne change jamais :

- la date comptable de l'opération ;
- son statut dans les modules généraux ;
- son appartenance aux opérations futures ;
- la vérité bancaire utilisée par le prévisionnel de trésorerie.

## 4. Double rôle des CB dans Cerbère

Une CB différée possède deux lectures simultanées, sans créer deux opérations.

### 4.1 Rôle analytique / pilotage

La dépense peut consommer une enveloppe pilotable selon sa **date d'achat** et la règle M / M+1 ci-dessous.

### 4.2 Rôle bancaire / trésorerie

La même dépense impacte la trésorerie selon sa **date comptable / date réelle de débit bancaire**.

Le double rôle est intentionnel ; le double comptage est interdit.

## 5. Règle M / M+1 et molettes

Pour une CB déjà engagée :

### CB appliquée à M

- Elle compte dans **M**, qu'elle appartienne ou non à une catégorie pilotée par une molette.
- Si elle relève d'une catégorie à molette, elle consomme en plus l'allocation correspondante de M.
- Si elle ne relève pas d'une molette, elle affecte M sans être transformée artificiellement en dépense pilotable.

### CB appliquée à M+1

- Elle appartient à **M+1** pour son impact de cycle.
- Elle n'affecte le **pilotage de M** que si elle relève d'une catégorie effectivement pilotée par les molettes de M.
- Si elle n'est pas contrôlée par une molette, elle ne doit pas être imputée artificiellement au pilotage de M.

En résumé :

| Situation | Effet sur M | Effet sur M+1 | Molette M |
|---|---|---|---|
| CB appliquée à M, pilotable | oui | seulement impact bancaire éventuel, sans double catégorie | oui |
| CB appliquée à M, hors molette | oui | seulement impact bancaire éventuel, sans double catégorie | non |
| CB appliquée à M+1, pilotable dans M | oui pour le pilotage | oui pour l'impact du cycle | oui |
| CB appliquée à M+1, hors molette | non pour le pilotage | oui | non |

Le code ne doit donc jamais réduire cette logique à un simple booléen `appartientAuMois`.

## 6. Une opération, plusieurs lectures

`Operations` reste l'unique base du Réel. Une CB ne doit jamais être dupliquée pour matérialiser son double rôle.

La même opération peut simultanément être :

- **future bancaire = oui** ;
- **engagée Cerbère = oui** ;
- **consommée dans une molette = oui ou non** selon sa catégorie et le cycle visé.

Les règlements techniques / agrégés de carte ne doivent pas recréer une dépense économique déjà portée par les achats unitaires.

## 7. Solde prévisionnel bancaire

Le solde prévisionnel appartient à la doctrine générale BudgetSoft, pas à la doctrine spéciale d'engagement Cerbère.

Conceptuellement :

`solde bancaire de référence + somme des flux futurs connus jusqu'à la date cible, selon leur date comptable`

Conséquences :

- une opération future au 07/09 doit affecter le solde prévisionnel au 07/09 ;
- elle ne doit pas apparaître comme opération réalisée avant cette date ;
- le fait qu'une CB soit déjà engagée pour Cerbère ne la rend pas comptabilisée dans les autres modules.

## 8. Principe obligatoire de développement

**Aucun correctif ni développement ne doit être réalisé isolément.**

Avant modification du code, appliquer cet ordre de contrôle :

1. **Supradoctrine BudgetSoft** — invariants communs.
2. **Doctrine du module concerné** — règle spécialisée éventuelle.
3. **Doctrine du sous-module** — si le module possède une vue spécialisée, par exemple Cerbère Express.
4. **Effets de bord sur les modules frères** — vérifier explicitement qu'une exception locale ne fuit pas vers eux.
5. **Registre des valeurs transversales** — vérifier si la donnée modifiée est déjà produite par un propriétaire canonique.

Une correction est considérée correcte seulement si elle respecte ces cinq niveaux.

## 9. Arbitres communs plutôt que règles recopiées

Les décisions structurantes doivent être centralisées dans des arbitres communs, puis consommées par les modules selon leur doctrine, notamment :

- opération comptabilisée à une date ;
- opération future à une date ;
- identification factuelle d'une CB ;
- date d'achat métier ;
- cycle bancaire d'impact ;
- engagement Cerbère ;
- impact CB sur M ;
- impact CB sur M+1 ;
- impact CB sur une molette ;
- calcul du solde réel par compte ;
- calcul du solde prévisionnel bancaire ;
- calendrier budgétaire 28 → 27 ;
- occurrences de charges fixes ;
- normalisation du Plan ;
- agrégats crédits/dettes.

Le but est d'éviter que plusieurs modules réimplémentent chacun une définition différente d'une même grandeur.

## 10. Contrôles de non-régression obligatoires

Toute modification liée aux dates ou aux CB doit au minimum vérifier simultanément :

- qu'une opération future reste cachée de la liste des opérations réalisées jusqu'à sa date comptable ;
- qu'elle apparaît bien dans les opérations futures ;
- qu'elle entre dans le solde prévisionnel à la bonne date comptable ;
- que Cerbère peut néanmoins reconnaître son engagement anticipé si elle répond à sa doctrine CB ;
- que M / M+1 sont correctement distingués ;
- que les molettes ne reçoivent que les dépenses qui leur appartiennent ;
- qu'aucune CB n'est comptée deux fois ;
- que Cerbère Express restitue les mêmes vérités Cerbère que son module parent, avec seulement sa spécialisation d'affichage / synthèse.

## 11. Principe d'état global atomique

BudgetSoft doit tendre vers un **snapshot global unique**, et non vers une collection de snapshots indépendants par module.

Une révision BudgetSoft correspond à un état cohérent complet :

`mêmes feuilles sources + mêmes versions moteurs + même doctrine + même instant de calcul`

Elle doit porter au minimum :

- `revisionBudgetSoft` ;
- `genereLe` ;
- `versionDoctrine` ;
- versions des moteurs structurants ;
- agrégats transversaux ;
- résultats des modules dérivés.

**Tous les écrans affichés simultanément doivent provenir de la même révision.**

Un module ne doit pas mélanger une valeur issue d'un ancien snapshot avec une autre recalculée après coup.

## 12. Politique d'actualisation

La cible d'architecture est :

1. reconstruction globale automatique **toutes les 30 minutes** ;
2. reconstruction globale après une mutation fonctionnelle significative (import, modification d'opération, Plan, P0/Pn, charge fixe, crédit/dette, paramètres structurants, etc.) ;
3. bouton global `Actualiser` = reconstruire une nouvelle révision BudgetSoft ;
4. ouverture normale = **lecture du dernier snapshot global valide, sans recalcul transversal**.

Une reconstruction doit être atomique : l'ancienne révision reste visible tant que la nouvelle n'est pas complètement calculée et validée.

## 13. Registre normatif des valeurs transversales

Dès qu'une grandeur est utilisée par au moins deux modules, elle devient **transversale** et doit avoir un propriétaire canonique unique.

| Valeur transversale | Autorité / propriétaire cible | Règle normative |
|---|---|---|
| Opérations normalisées | socle Operations | `Operations` est la base unique du Réel ; une normalisation commune est réutilisée partout |
| Date comptable / futur-réalisé | arbitre temporel BudgetSoft | date comptable par défaut ; aucune UI ne redéfinit localement « futur » |
| Référentiel catégories | `Categories` | catégorie enregistrée + type enregistré font autorité |
| Calendrier budgétaire | service calendrier BudgetSoft | convention unique 28 inclus → 27 inclus |
| Solde réel par compte | service Comptes canonique | dernier solde bancaire certifié + mouvements postérieurs selon date comptable |
| Solde disponible global | agrégateur Comptes | somme des comptes du périmètre explicitement défini ; aucun recalcul local |
| Flux futurs bancaires | moteur Trésorerie canonique | collection normalisée unique des flux non encore inclus dans le solde réel |
| Solde prévisionnel | moteur Trésorerie canonique | solde réel canonique + flux futurs canoniques jusqu'à la cible |
| R0 | moteur Recettes maître | une seule valeur par cycle, réutilisée par Plan/Cerbère |
| CF0 / occurrences | moteur Charges fixes canonique | les échéances sont générées une fois ; réel rapproché remplace le prévu |
| P0 | budget maître | référence persistante unique ; Pn sont dérivés |
| Plan normalisé | moteur Plan | statut, date d'effet et impact sont normalisés une fois |
| Identification CB | arbitre BudgetSoft | champs structurés prioritaires ; heuristique texte seulement en secours d'import |
| Engagement CB M/M+1 | Cerbère | exception locale ; aucun autre module ne reprend cette logique |
| CB déjà engagée | Cerbère | calculée une fois et consommée par Cerbère Express |
| Revenus/dépenses constatés | agrégateur Operations | agrégats communs par période, sans rescanner/reclassifier différemment |
| Crédits amortissables | service Crédits | capital restant dû canonique |
| Revolvings | service Crédits | encours utilisé canonique distinct du plafond/disponible |
| Dettes hors crédit | service Dettes/Crédits | total actif canonique |
| Patrimoine net | module Patrimoine par composition | actifs + soldes financiers canoniques − dettes canoniques ; pas de recalcul de comptes ou crédits |
| Pluxee | service Pluxee | valeur dédiée, distincte du solde bancaire, publiée une fois dans la révision |
| Rapprochement CF0 | lien porté par Operations | le lien validé est la vérité ; les modules ne réinventent pas le rapprochement |

## 14. Interdiction des recalculs concurrents

Un module consommateur ne doit **jamais recalculer localement** une valeur inscrite au registre transversal, sauf audit temporaire explicitement marqué comme tel.

Exemples obligatoires :

- Dashboard, Patrimoine, Trésorerie et Cerbère consomment le même `soldeReelParCompte` ;
- Patrimoine ne refait pas `solde_initial + Operations` si le service Comptes a déjà établi le solde canonique ;
- Patrimoine ne resomme pas indépendamment Credits/Dettes si le service Crédits publie les agrégats ;
- Dashboard et Trésorerie ne régénèrent pas chacun leurs occurrences de CF0 ;
- Cerbère Express ne recalcule pas les engagements CB : il lit ceux de Cerbère ;
- aucune vue UI ne choisit elle-même entre plusieurs générations historiques d'un même moteur.

Les anciens moteurs peuvent subsister pendant la migration, mais **un seul point d'entrée final** doit être autoritaire dans une révision donnée.

## 15. Dépendances : sens unique

Les dépendances doivent suivre ce sens :

```text
Données maîtres
  ↓
Normalisation commune
  ↓
Valeurs transversales canoniques
  ↓
Moteurs métier
  ↓
Vues / UI
```

Une couche inférieure ne dépend jamais d'une valeur recalculée par une UI ou un module enfant.

En particulier :

- Cerbère dépend de BudgetSoft ; BudgetSoft ne dépend pas de Cerbère pour établir une vérité comptable générale ;
- Cerbère Express dépend de Cerbère ; Cerbère ne dépend pas de Cerbère Express ;
- Patrimoine dépend des agrégats Comptes/Crédits ; ces services ne dépendent pas de Patrimoine ;
- le solde prévisionnel peut consommer une hypothèse Cerbère uniquement pour une composante explicitement estimative du futur débit CB, jamais pour reconstruire le solde bancaire réel.

## 16. Invalidation et mutations

Toute écriture dans une source maître doit déclarer quelles valeurs transversales elle invalide. À terme, l'invalidation peut être globale pour rester simple et sûre.

Au minimum :

- modification/import `Operations` → soldes comptes, agrégats réel, trésorerie, Cerbère, analyses, patrimoine financier ;
- modification `Comptes/Parametres bancaires` → soldes, trésorerie, patrimoine, Cerbère ;
- modification `Categories` → agrégats analytiques, Cerbère, analyses ;
- modification `Charges_fixes` → CF0, trésorerie, Cerbère ;
- modification `Plan_*` → Plan normalisé, trésorerie, Cerbère ;
- modification `Credits/Dettes` → crédits/dettes, patrimoine, analyses concernées ;
- modification Pluxee → Pluxee et vues qui le présentent.

Une mutation ne doit jamais « réparer » directement plusieurs caches locaux divergents : elle invalide puis fait produire une nouvelle révision globale.

## 17. Audit architectural constaté au 06/09/2026

L'audit du dépôt a identifié plusieurs duplications à résorber :

1. **Solde bancaire** : calculé séparément dans Comptes et Dashboard ; Patrimoine utilise encore une formule différente basée sur `solde_initial + opérations`.
2. **CB** : identification et datation présentes dans plusieurs moteurs, avec coexistence d'une ancienne doctrine M→M+1 et de la nouvelle doctrine double rôle.
3. **Cycles** : `CycleService` porte la convention correcte 28→27, mais des replis locaux existent encore.
4. **Charges fixes** : génération d'occurrences répétée entre socle, Dashboard, Trésorerie et Cerbère.
5. **Crédits/dettes** : `CreditsDataV2` agrège déjà les valeurs alors que Patrimoine les resomme séparément.
6. **Trésorerie prévisionnelle** : plusieurs générations `TreasuryForecast*` coexistent ; elles doivent converger vers un seul point d'entrée final.
7. **Snapshots locaux** : Comptes, Operations et Cerbère Express ont des mécanismes indépendants pouvant représenter des révisions différentes.

Ces duplications sont désormais considérées comme **dette technique à résorber** ; elles ne doivent pas être reproduites dans de nouveaux développements.

## 18. Règle pour toute nouvelle fonctionnalité

Avant d'ajouter un calcul :

1. chercher si la grandeur existe déjà dans le registre transversal ;
2. si oui, consommer son propriétaire canonique ;
3. si non mais qu'elle sera utilisée par plusieurs modules, l'ajouter d'abord au registre ;
4. seulement ensuite développer le calcul dans un service commun ;
5. ajouter un test de cohérence inter-modules et, si nécessaire, une règle d'invalidation.

**Une nouvelle fonctionnalité ne doit jamais créer une deuxième vérité pour une grandeur existante.**
