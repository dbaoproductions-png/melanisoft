# BudgetSoft — Doctrine Cerbère / Planification — complément normatif du 25/08/2026

> **Complément normatif de `DOCTRINE_BUDGETSOFT.md`.** En cas de formulation antérieure incompatible, les règles ci-dessous prévalent. Ce fichier doit être fusionné dans la doctrine principale lors de la prochaine consolidation documentaire.

## 1. Référentiels et période

- **P0** = référence pilotable maître ; le Réel ne la modifie jamais.
- **P1** = budget pilotable décidé pour le cycle ; seules les allocations locales/molettes le modifient.
- **R1** = recettes prévues du cycle, issues de R0 et des déformations propres au cycle.
- **CF1** = photographie des charges fixes du cycle, issue de CF0 et figée à l'ouverture du cycle.
- **DP1** = dépenses pilotables prévues du cycle.
- **D1 = CF1 + DP1**.

## 2. Règle temporelle : passé = Réel, futur = prévision

À tout instant `t`, Cerbère réévalue le cycle sans réécrire les maîtres :

- une occurrence **déjà réalisée et rapprochée** est valorisée au montant réel ;
- une occurrence **future ou non réalisée** reste valorisée au montant prévu ;
- si le Réel diffère du prévu, le Réel **remplace** le prévu ;
- il est interdit de compter simultanément la prévision et son Réel correspondant.

Principe normatif : **jamais Prévision + Réel pour une même occurrence**.

## 3. Actions et Événements

Actions et Événements ne constituent pas une couche financière supplémentaire. Ils **déforment les prévisions de période** :

- recette future confirmée -> déforme R1/Rt1 ;
- dépense pilotable future confirmée -> réserve le poste P1 correspondant et entre dans DPt1 ;
- effet confirmé sur une charge fixe -> déforme CF1/CFt1 sans réécrire CF0 maître ;
- mouvement de trésorerie -> Cerbère retient son signe pour la trajectoire de liquidité ;
- fractionnement -> chaque échéance est une occurrence autonome, affectée à sa période réelle d'impact.

Dès qu'une Action, une étape d'Action ou un Événement est rapproché d'une opération réelle, l'occurrence prévisionnelle correspondante est neutralisée et **le Réel prend sa place** avec son montant et sa date d'impact réels. Le rapprochement est la clé d'anti-double-comptage.

Une Action ou un Événement non rapproché reste prévisionnel tant qu'il n'est pas annulé, abandonné ou réalisé selon une donnée certaine.

## 4. Rt1, CFt1, DPt1 et Dt1

**Rt1** = recettes du cycle réévaluées à `t` : Réel pour les occurrences réalisées ; R1 + Actions/Événements encore prévisionnels pour le futur.

**CFt1** = charges fixes du cycle réévaluées à `t` : Réel rapproché pour les occurrences réalisées ; CF1 pondéré par Actions/Événements encore prévisionnels pour le futur.

**DPt1** = dépenses pilotables réévaluées à `t` : dépenses réelles/engagées + réservations futures confirmées issues de P1, Actions et Événements, sans double comptage.

**Dt1 = CFt1 + DPt1**.

## 5. RPt1 — reliquat pilotable

`RPt1 = P1 − pilotable déjà consommé ou réservé`

Une dépense future confirmée issue d'une Action ou d'un Événement **réserve** donc immédiatement son poste P1. Lorsqu'elle est rapprochée au Réel, la réservation disparaît et le montant réel la remplace.

Exemple : P1 Loisirs = 300 €, Réel déjà imputé = 80 €, Événement tennis futur = 100 € -> RPt1 Loisirs = 120 €. Si l'opération réelle rapprochée vaut 95 €, le calcul devient 300 − 80 − 95 = 125 €.

## 6. SS1, SCt1 et contrôle bancaire

**SS1** = solde significatif à la frontière du cycle, contrôlé pour les opérations qui glissent d'un cycle à l'autre.

`SCt1 = SS1 + Rt1 − CFt1 − DPt1`

SCt1 est la trajectoire réévaluée de fin de cycle compte tenu du Réel connu, des référentiels de période et des Actions/Événements encore prévisionnels.

Pour le présent :

- **SHBt1** = solde Hello bank affiché à l'instant `t` ;
- **SC-présent(t)** = solde Cerbère reconstruit avec les seuls mouvements bancaires réellement constatés depuis SS1 ;
- `écart(t) = SHBt1 − SC-présent(t)`.

Tout écart doit être mathématiquement explicable ; Actions et Événements futurs n'entrent jamais dans SC-présent(t), puisqu'ils ne sont pas encore des mouvements bancaires réels.

## 7. Invariant de développement

Toute évolution de Cerbère ou Planification doit préserver simultanément : M + M+1 visibles, molettes P1 locales, P0/R0/CF0 maîtres immuables face au Réel, remplacement Prévision -> Réel par rapprochement, absence de double comptage, doctrine CB M -> M+1, santé nette et contrôle SHBt1 / SC-présent.