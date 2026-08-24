# BudgetSoft — Journal des décisions

Ce fichier consigne les décisions fonctionnelles structurantes. Il complète `DOCTRINE_BUDGETSOFT.md`.

Les décisions les plus récentes priment lorsqu'elles modifient explicitement une décision antérieure. Lorsqu'une décision devient stable, reporter sa formulation consolidée dans la Doctrine.

## 2026-08-24 — Cerbère / Planification

### Canons
- **P0** = dépenses pilotables maître.
- **R0** = recettes maître ; doit être matérialisé dans l'interface et les données.
- **CF0** = charges fixes maître.
- Une validation de P0 modifie la référence persistante.
- Une modification de P1/P2/etc. est uniquement ponctuelle pour cette période.
- Planification ne modifie jamais P0 directement.

### Périodes
- Cycle BudgetSoft : **28 inclus -> 27 inclus** ; le cycle est nommé par le mois du 27.
- Cerbère pilote au quotidien une fenêtre **M + M+1** simultanément.
- L'écran M/M+1 est coiffé d'une appréciation générale sur les deux mois.

### Operations / catégories
- Pour toute opération, **la catégorie inscrite fait autorité**.
- Le référentiel est `Categories`, pas P0.
- Seules les opérations orphelines/non classées peuvent aller provisoirement dans `Divers`.
- Ajouter `Divers = 0 €` au canon P0.

### Carte à débit différé
- Les champs structurés du classeur doivent être utilisés plutôt que des heuristiques de libellé.
- Une CB achetée en M est imputée budgétairement à M+1.
- `date_achat` décrit l'achat ; `date_comptable` ne doit pas être utilisée à sa place pour déterminer le cycle d'achat.
- Neutraliser le règlement global de carte afin d'éviter le double comptage.

### Trésorerie
- Dans les Analyses, les mouvements de trésorerie restent séparés du résultat économique.
- Pour Cerbère, **seul leur signe compte pour la liquidité dans le périmètre piloté** : `+` améliore, `-` dégrade.
- Le périmètre de comptes piloté doit être explicite afin de traiter correctement les virements internes.

### Charges fixes
- Cerbère ne qualifie pas une opération de charge fixe uniquement parce qu'elle lui ressemble.
- Le réel CF0 repose sur l'étiquetage/liaison effectivement enregistré.
- Le moteur de rapprochement peut proposer ; la validation des données fait autorité.

### Santé
- Cerbère utilise la **santé nette** : dépenses moins remboursements.
- Distinguer remboursements constatés et attendus.

### Planification
- Terminologie : **Planification > Objectifs > Actions** + cadre Événements.
- Une Action peut être simple ou nécessiter un processus de résolution.
- Les processus de résolution sont versionnés : V1, réel, écart, proposition V2, validation, etc.
- Une Action chiffrée confirmée apparaît dans les périodes concernées comme ligne/réservation identifiable, pas comme modification de P0.
- Les Objectifs agrègent les Actions et leur progression est calculée sur le Réel.
- Les Événements ont un formulaire unique et quittent le prévisionnel après rapprochement au Réel.

### Solde initial
- Pour chaque cycle, utiliser idéalement le solde du 27 au soir ; sinon le dernier solde fiable disponible avant le cycle, signalé comme approximation.
- Le solde initial est distinct de R0.

### Pluxee
- Poche séparée de la monnaie bancaire.
- Abondement autour du 18.
- Suivre solde réel, abondement attendu et au minimum les sous-poches Courses / Restaurants.
- Utiliser le solde du 27 au soir ou le dernier solde disponible comme départ du cycle.

### Performance
- Chaque import d'opérations, modification Action/Événement, rapprochement ou modification canonique doit invalider Cerbère.
- Effectuer **un recalcul consolidé**, pas un recalcul complet par opération.

### Infrastructure
- L'infrastructure de travail n'est pas une variable fonctionnelle : **corriger BudgetSoft sans modifier l'infrastructure pour contourner les bugs**.
- Avant tout développement, relire Doctrine + Contexte technique.

## Décisions à préciser ultérieurement

- Définition exacte du périmètre de trésorerie piloté (compte joint seul ou ensemble de comptes).
- Politique détaillée de priorités/protections entre enveloppes pour les propositions automatiques de compensation.
- Modèle définitif de clôture/version historique des cycles.
- Format final du module Pluxee et de son import.
- Doctrine des notifications mail.
