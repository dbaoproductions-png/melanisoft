# Cerbère 3.7.6 — doctrine de pilotage court terme

Ce document complète `DOCTRINE_BUDGETSOFT.md` et fixe les décisions validées lors de l’audit M/M+1.

## Indicateur principal

`SCt1 = SS1 + Rt1 - CFt1 - DPt1 - HEt1`

Dans l’interface, SCt1 s’intitule **« Encore disponible jusqu’au 27 »**. Il est la consigne de pilotage de Cerbère : situation actuelle + réel connu + prévisionnel restant.

Dans la zone des allocations, le même montant est présenté comme **« À rééquilibrer »** :
- négatif : montant à absorber autant que possible en réduisant les allocations encore compressibles ;
- nul : plan équilibré ;
- positif : montant encore affectable, notamment à Projet, Épargne ou Divers.

`HEt1` ne contient que les sorties connues hors enveloppes qui ne sont déjà comptées ni dans CFt1, ni dans DPt1, ni comme mouvement de trésorerie. Aucun double comptage n’est admis.

## Indicateurs secondaires

`REt1 = P1 - pilotable consommé/réservé` s’intitule **« Situation par rapport au budget initial »**. C’est un indicateur de bilan, pas la consigne quotidienne.

`DPt1 = somme par poste de max(allocation P1, réel + réservé)` s’intitule **« Dépenses pilotables estimées sur le cycle »**. Il représente le pilotable déjà engagé plus les allocations encore susceptibles d’être utilisées jusqu’au 27.

## Rattrapage par les allocations

Cerbère calcule :
- **Absorbable par les allocations restantes** : somme des allocations encore non consommées/réservées ;
- si SCt1 est négatif, **Part incompressible** = `max(0, abs(SCt1) - absorbable)`.

Une molette ne peut jamais effacer une dépense déjà réalisée ou réservée. Le calcul DPt1 avec `max(allocation, engagé)` garantit cette règle.

## Interaction M / M+1

Les deux budgets sont affichés simultanément. La fin projetée de M devient immédiatement le SS1 projeté de M+1. Toute modification des allocations de M doit donc modifier la capacité projetée de M+1 sans attendre un nouvel import.

## Santé

Cerbère ne projette aucun remboursement santé hypothétique. Un remboursement réellement constaté sur le cycle réduit automatiquement le consommé Santé du cycle. S’il arrive sur le cycle suivant, il améliore Santé sur M+1.

## Charges fixes

M conserve sa photographie CF1 à l’ouverture du cycle. M+1, tant qu’il n’est pas ouvert, repart du CF0 courant et applique les Actions/Événements de sa période. À son ouverture le 28, sa référence est figée.

## Opérations hors pilotable

Le bloc ancien « Hors enveloppes pilotables » devient **« Opérations hors pilotable à contrôler »**. Une opération correctement reconnue comme CF, mouvement de trésorerie ou autre flux déjà intégré disparaît de cette file. Seules les sorties non comptées ailleurs peuvent alimenter HEt1.

## Horizon

Cerbère est un cockpit M/M+1. P3–P6 relèvent principalement de Planification et ne doivent pas encombrer le poste de commandement quotidien tant que leur doctrine de report cumulatif n’est pas validée.
