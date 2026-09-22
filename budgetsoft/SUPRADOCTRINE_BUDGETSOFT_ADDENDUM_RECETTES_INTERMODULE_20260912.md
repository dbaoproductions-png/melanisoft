# BudgetSoft — Addendum supradoctrine : recettes prévisionnelles intermodules

**Version : 2026-09-12**

Ce document est normatif. En cas de contradiction avec une formulation antérieure concernant les recettes prévisionnelles du cycle, il prévaut.

## 1. Propriétaire métier unique

La grandeur **« recettes attendues / recettes réévaluées du cycle »** possède un propriétaire unique : **Cerbère `Rt1`**, calculé dans la révision globale BudgetSoft.

Aucun écran ni module consommateur ne peut recalculer localement cette grandeur à partir de `Operations`, de `projectionEtendue`, du Plan ou d’une autre combinaison de sources.

## 2. Sémantique de `Rt1`

`Rt1` est la prévision réévaluée des recettes du cycle courant. Il applique la doctrine Cerbère validée :

- le canon de recettes régulières constitue le socle prévisionnel ;
- le réel constaté peut remplacer ou relever le canon selon la règle métier du moteur ;
- les recettes réelles hors R0 sont intégrées lorsqu’elles sont économiquement des recettes ;
- les remboursements santé positifs sont des recettes ;
- les événements Plan de recette encore dus sont intégrés ;
- une date prévue dépassée ne constitue jamais une preuve de réalisation ;
- un événement ne sort du prévisionnel que sur preuve : opération bancaire liée, rapprochement confirmé, annulation ou abandon explicite ;
- le double comptage Réel + Prévision pour un même mouvement est interdit.

## 3. Consommateurs intermodules

### Dashboard

`Dashboard.courtTerme.revenusAttendus` **doit être strictement égal** au `Rt1` du cycle courant de Cerbère dans la même `revisionBudgetSoft`.

Le Dashboard ne doit plus recomposer cette valeur par `revenusConstates + flux positifs de projectionEtendue`.

### Comptes

L’onglet Comptes ne possède pas de moteur de recettes distinct. Son **solde prévisionnel** doit être fourni par la trajectoire canonique `chargerTresorerieUnifieeBudgetSoft20260907()`, elle-même fondée sur `projectionEtendue` de la révision globale.

Les flux de recettes prévisionnelles qui expliquent le solde de Comptes doivent donc être les mêmes flux canoniques que ceux consommés par la trajectoire bancaire de Cerbère. Comptes ne calcule jamais un `Rt1` concurrent.

### Cerbère

Cerbère est le propriétaire du `Rt1`. Cerbère Express et toute vue dérivée consomment cette valeur sans la recalculer.

## 4. Invariants bloquants

Une révision BudgetSoft est invalide et ne doit pas être publiée si l’un des invariants suivants est violé :

1. `Dashboard.courtTerme.revenusAttendus !== Cerbere.periodes[0].v37.rt1` à un centime près ;
2. le `Rt1` du cycle courant est absent ou non numérique ;
3. `projectionEtendue` n’est pas produite par le propriétaire canonique de trésorerie ;
4. un événement standard encore dû disparaît de la trajectoire alors qu’aucune preuve de réalisation/rapprochement/annulation n’existe ;
5. deux consommateurs de la trajectoire bancaire utilisent des révisions BudgetSoft différentes ;
6. un module introduit un recalcul local concurrent d’une recette prévisionnelle déjà possédée par Cerbère ou par la trajectoire canonique.

## 5. Principe anti-régression

**Une donnée, un propriétaire, un calcul, plusieurs consommateurs.**

Pour les recettes du cycle :

`Sources canoniques → moteurs BudgetSoft/Plan → Cerbère Rt1 → Dashboard`

et, pour la matérialisation bancaire des flux futurs :

`Sources canoniques → projectionEtendue → Comptes / trajectoire bancaire Cerbère`

La cohérence entre `Rt1` et la trajectoire ne doit pas être obtenue par duplication de formule mais par la consommation des propriétaires canoniques et par des gardes de cohérence intermodules.


## 6. Nomenclature canonique des revenus

La nomenclature des revenus économiques BudgetSoft est fermée à **10 catégories**, dans cet ordre :

1. Salaires
2. France Travail
3. Cours
4. Concerts
5. Droits artistiques
6. Congés spectacles
7. Avantages employeur
8. Revenus fonciers
9. Prestations / aides
10. Revenus divers

Deux libellés historiques sont absorbés définitivement :
- `SACEM` → `Droits artistiques` ;
- `Autres revenus` → `Revenus divers`.

Ces anciens libellés peuvent être reconnus comme alias entrants pour migration ou compatibilité, mais **aucun propriétaire ni consommateur BudgetSoft ne doit les republier**.

Cette nomenclature est commune à `Categories`, `Operations`, au Plan, au canon R0, à Cerbère, au Dashboard et à Analyses. Une fusion de catégories ne doit jamais modifier le montant économique : les montants historiques et les références R0 fusionnées sont additionnés.

Le module Analyses publie toujours les **10 catégories**, dans l'ordre canonique, y compris lorsqu'une catégorie ne comporte aucun mouvement sur la fenêtre étudiée ; son montant vaut alors `0`.

### Invariants

Une révision ou une migration est incohérente si :
- le référentiel actif ne contient pas exactement ces 10 catégories de type `revenu` ;
- `SACEM` ou `Autres revenus` subsiste dans une source métier après migration ;
- Analyses publie un nombre différent de 10 catégories de revenus ;
- Analyses publie une catégorie différente de la nomenclature canonique ;
- une fusion de nomenclature modifie le total des revenus ou le total R0.


## 7. Cycle courant : constaté + explicitement dû

Pour le **cycle courant**, le canon R0 n'est pas une créance. Il décrit un niveau normal de recettes mais ne justifie jamais, à lui seul, un complément de recette « encore attendu ».

La règle autoritaire est :

`Rt1(cycle courant) = recettes réellement constatées dans le cycle + événements Plan de recette explicitement encore dus`.

Conséquences :

- un écart entre le réel d'une catégorie R0 et son montant canonique ne crée pas automatiquement une recette future ;
- R0 reste utilisé comme référence et comme prévision des **cycles futurs** ;
- une recette ponctuelle attendue doit être matérialisée par un événement Plan ouvert ;
- un événement Plan ne sort du dû que sur preuve : rapprochement/opération réelle liée, annulation ou abandon explicite ;
- le simple passage de la date prévue ne constitue jamais une preuve de réalisation.

### Date des événements

La date saisie pour un événement Plan est une **date d'affectation au cycle et une indication de calendrier**, pas une date d'expiration.

Si la date prévue est dépassée sans preuve de clôture :

- l'événement reste actif ;
- sa date prévue d'origine est conservée pour l'audit et l'explication ;
- pour la projection bancaire, il peut être reporté techniquement au premier jour projetable après la date de référence, avec un marqueur `enRetard` ;
- il ne doit être ni supprimé ni déplacé silencieusement vers un autre événement.

Un événement ouvert provenant d'un cycle antérieur reste une créance/dette en retard et continue à peser sur le cycle courant jusqu'à clôture explicite.

### Invariants supplémentaires

- `Dashboard.revenusAttendus - Dashboard.revenusConstates` doit être égal au total des recettes Plan encore dues du cycle courant, à un centime près ;
- aucun complément implicite vers R0 ne doit apparaître dans ce reste attendu ;
- une recette Plan ouverte dont la date est dépassée reste représentée dans la projection et dans Rt1 ;
- les cycles futurs conservent R0 comme référence prévisionnelle normale.


## 8. Événements fractionnés et séparation Actions / créances

Une **Action Plan** décrit une décision, une démarche ou un levier. Elle ne constitue pas, à elle seule, une créance bancaire du cycle courant. Une recette ne peut entrer dans le `Rt1` courant comme somme encore due que lorsqu'elle est matérialisée par un **Événement Plan de type recette** encore ouvert, ou par une opération réelle déjà constatée.

Pour un événement fractionné, le propriétaire métier est l'événement parent mais l'unité de réalisation est **l'occurrence** :

- le montant total est ventilé une seule fois par `occurrencesEvenementV4_` ;
- chaque occurrence possède son montant et sa date indicative d'origine ;
- une occurrence peut être rapprochée indépendamment des autres ;
- le rapprochement d'une occurrence la retire du prévisionnel sans clôturer les occurrences restantes ;
- l'événement parent devient `Partiellement rapproché` tant qu'au moins une occurrence reste due ;
- il devient `Rapproché` uniquement lorsque toutes ses occurrences sont rapprochées ;
- une même opération réelle ne peut solder qu'une occurrence du même événement ;
- Cerbère, la projection de trésorerie, le Dashboard et les gardes utilisent la même liste d'occurrences encore dues.

La date d'une occurrence reste indicative. Si elle est dépassée sans preuve de clôture, l'occurrence reste due et est reportée techniquement dans la projection, sans réécriture de sa date d'origine.

### Invariants

- le total des occurrences d'un événement est égal au montant total de l'événement, au centime près ;
- une occurrence rapprochée n'apparaît plus dans aucun prévisionnel ;
- une occurrence non rapprochée apparaît une seule fois dans la projection pertinente ;
- `Rt1(cycle courant) = Réel économique constaté + somme des occurrences de recettes encore dues appartenant au cycle courant ou en retard` ;
- une Action de type « hausse de revenu » ne doit pas créer à elle seule une recette attendue du cycle courant.


### Convention de signe des lignes Plan

Les lignes prévisionnelles Plan exposent deux notions distinctes et ne doivent plus les confondre :

- `montant` : **grandeur budgétaire positive**, utilisée pour exprimer une quantité consommée, réservée ou attendue dans les moteurs de budget et d'enveloppes ;
- `montantSigne` : **flux financier signé**, avec `+ recette` et `- dépense`, utilisé par les moteurs de trésorerie et les contrôles de sens financier.

Exemple : une échéance de tennis de 100 € est représentée par `montant = 100` et `montantSigne = -100`.

Aucun consommateur ne doit inférer le sens bancaire à partir du seul champ `montant` lorsqu'un champ `montantSigne` est disponible.
