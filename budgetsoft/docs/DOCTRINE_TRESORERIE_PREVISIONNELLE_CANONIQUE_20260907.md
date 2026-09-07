# BudgetSoft — Doctrine canonique du prévisionnel bancaire

> **Document normatif — 7 septembre 2026.**
>
> Ce document complète et précise `DOCTRINE_TRESORERIE_PREVISIONNELLE_20260901.md`, `SUPRADOCTRINE_BUDGETSOFT_20260905.md` et les doctrines Cerbère. En cas d'ambiguïté sur la construction d'un solde prévisionnel, les règles ci-dessous sont obligatoires.

## 1. Principe maître

Le prévisionnel bancaire BudgetSoft répond à une seule question :

> **À une date cible J, quel sera le solde du compte si l'on part du dernier solde réel fiable et si l'on applique uniquement les flux bancaires futurs qui ne sont pas encore incorporés à ce solde ?**

Formule normative :

`Solde prévisionnel(J) = Solde réel + Recettes restant à encaisser - Charges fixes restant à payer +/- Opérations futures certaines +/- Effets Plan confirmés - Débits CB différés exigibles avant J`

Aucun module n'a le droit de produire une seconde vérité bancaire. `Comptes`, `Dashboard`, `Cerbère` et `Cerbère Express` consomment la même trajectoire publiée par le propriétaire unique BudgetSoft.

## 2. Les cinq briques métier obligatoires

### 2.1 Recettes canoniques

`R0 / Cerbere_Recettes_Canon_V1` est la référence de principe des recettes attendues.

Pour chaque cycle :

1. le canon fournit le montant attendu ;
2. le Plan peut l'infléchir, le déplacer, le réduire, le compléter ou le supprimer ;
3. le Réel remplace progressivement le prévu ;
4. à une date J, seule la part encore attendue avant J reste projetée.

Une recette déjà encaissée et incorporée au solde réel ne peut jamais rester présente dans le prévisionnel.

### 2.2 Charges fixes prévisionnelles

`CF0 / Charges_fixes` fournit les charges structurelles attendues.

Pour chaque occurrence :

1. le montant et la date prévus sont déterminés par le référentiel ;
2. le Plan peut modifier, suspendre, déplacer ou supprimer l'occurrence ;
3. le Réel rapproche et remplace l'occurrence ;
4. à une date J, seules les occurrences restant réellement à débiter avant J sont projetées.

Le moyen de paiement détermine la date bancaire. Une charge fixe payée par CB différée ne sort pas à la date d'achat : elle rejoint le débit CB différé du cycle correspondant.

### 2.3 CB différées déjà engagées

Une CB différée est une dépense économiquement engagée mais dont la sortie bancaire intervient à la date du débit différé.

Le montant déjà engagé est une donnée plus concrète qu'un budget. Il doit donc prévaloir sur toute estimation.

Le débit CB d'un cycle peut comprendre :

- achats pilotables réellement engagés par CB ;
- charges fixes réglées par CB ;
- dépenses hors-pilotable réglées par CB ;
- autres achats CB effectivement identifiés.

Le débit CB n'est donc pas égal par principe au budget pilotable du cycle précédent. Le budget sert à estimer la partie non encore engagée ; les engagements réels restent maîtres.

### 2.4 Pilotable courant et molettes

Le pilotable courant est une grandeur de pilotage Cerbère, ajustée par :

- le canon P0 ;
- les molettes ;
- le Plan ;
- le Réel déjà consommé ;
- les règles de report propres à Cerbère.

Il ne diminue jamais directement le solde bancaire avant la date de débit CB.

Il sert uniquement à estimer la partie encore inconnue du prochain débit différé :

`Débit CB futur estimé = CB déjà engagées + part du pilotable restant susceptible d'être engagée avant clôture du cycle + éventuelle queue 28-fin de mois`

La part déjà engagée ne doit jamais être recomptée dans le pilotable résiduel.

### 2.5 Opérations imprévues et opérations futures certaines

Une opération imprévue déjà passée est du Réel : elle est incorporée au solde réel et n'est plus projetée.

Une opération présente dans `Operations` avec une `date_comptable` future est un flux futur certain. Elle remplace toute prévision moins concrète correspondant au même mouvement.

## 3. Le Plan est une couche de transformation, pas une masse indépendante

Le Plan n'est pas une sixième enveloppe financière parallèle.

Il peut :

- modifier une recette canonique ;
- modifier une charge fixe ;
- créer un flux ponctuel suffisamment confirmé ;
- suspendre une charge ;
- déplacer une date ;
- modifier un montant ;
- préciser un moyen de paiement.

Une même décision Plan ne doit jamais produire à la fois une correction du canon et un flux autonome équivalent.

## 4. Hiérarchie de vérité

Pour une même réalité bancaire :

`Canon / estimation -> Plan confirmé -> engagement connu -> opération réelle -> solde réel`

Chaque niveau plus concret remplace le précédent.

Règle absolue :

> **Jamais Prévision + Réel pour le même mouvement. Jamais Budget + Engagement réel pour la même dépense.**

## 5. Temporalité bancaire

Hors Cerbère, la vérité temporelle commune BudgetSoft est `date_comptable`.

La trésorerie projette des sorties et entrées à leur date bancaire réelle ou estimée.

La date d'achat CB peut être utilisée par Cerbère pour le pilotage, mais elle ne constitue pas une sortie bancaire avant le débit différé.

Le cycle 28 -> 27 reste un cadre budgétaire. Il ne remplace jamais la chronologie bancaire.

## 6. Décomposition obligatoire d'un solde prévisionnel

Tout solde affiché doit pouvoir être expliqué par une décomposition auditable, au minimum :

- solde réel de départ ;
- recettes canoniques restantes et ajustements Plan ;
- charges fixes restantes et ajustements Plan ;
- opérations futures certaines ;
- effets Plan autonomes confirmés ;
- CB différées déjà engagées à débiter avant la cible ;
- estimation résiduelle du prochain débit CB ;
- solde prévisionnel résultant.

Si cette décomposition ne réconcilie pas le solde au centime, le chiffre ne doit pas être publié.

## 7. Propriétaire unique et consommateurs

Le propriétaire métier unique du prévisionnel bancaire est la fonction canonique BudgetSoft publiée dans le snapshot global.

Les autres modules sont des consommateurs :

- `Comptes` : affiche le solde réel et le solde prévisionnel ;
- `Dashboard` : synthétise des points de la même trajectoire ;
- `Cerbère` : fournit les données de pilotage nécessaires au calcul CB mais ne recalcule pas un solde bancaire parallèle ;
- `Cerbère Express` : hérite des mêmes valeurs ;
- `Operations` : fournit le Réel et les opérations futures certaines ;
- `Charges_fixes`, `R0`, `Plan` : fournissent les hypothèses structurées.

## 8. Contrat anti-régression obligatoire

Une nouvelle révision BudgetSoft ne peut être publiée que si les contrôles suivants passent :

1. même `revisionBudgetSoft` pour tous les consommateurs ;
2. même solde réel à 0,01 € près entre Comptes, moteur, Dashboard et Cerbère ;
3. un seul propriétaire déclaré du prévisionnel ;
4. réconciliation exacte `solde réel + somme des flux = solde prévisionnel` ;
5. aucun `pilotable` progressif avant le prochain débit CB ;
6. aucune charge fixe CB comptée à la fois à la date d'achat et au débit CB ;
7. aucune recette canonique maintenue après son remplacement par le Réel ;
8. aucune opération future certaine doublée par une prévision canonique/Plan/charge fixe ;
9. aucune modification des molettes qui change un solde situé avant la date du prochain débit CB ;
10. toute modification du moteur doit être confrontée à la supradoctrine, à cette doctrine et aux doctrines des modules consommateurs avant publication.

En cas d'échec d'un de ces contrôles, la nouvelle révision n'est pas publiée et la dernière révision cohérente reste active.

## 9. Règle de développement

Toute évolution future doit partir de la doctrine, pas de l'affichage constaté.

Il est interdit de corriger un chiffre localement dans Dashboard, Comptes, Cerbère ou Cerbère Express. Si un chiffre est faux, on corrige le propriétaire de la donnée ou la règle de remplacement qui l'alimente.

Toute nouvelle fonctionnalité de prévision doit préciser explicitement :

- sa source propriétaire ;
- sa date bancaire ;
- son niveau de certitude ;
- ce qu'elle remplace ;
- ce qui la remplace quand le Réel arrive.

Cette exigence constitue une règle permanente de non-régression BudgetSoft.