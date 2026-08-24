# BudgetSoft — Journal des décisions

Ce fichier consigne les décisions fonctionnelles structurantes. Il complète `DOCTRINE_BUDGETSOFT.md`.

Les décisions les plus récentes priment lorsqu'elles modifient explicitement une décision antérieure. Lorsqu'une décision devient stable, reporter sa formulation consolidée dans la Doctrine.

## 2026-08-24 — Cerbère / Planification / Import

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
- **Operations est l'unique source du Réel pour Cerbère.**

### Import : hiérarchie des autorités
- **PDF = vérité bancaire définitive**.
- **Utilisateur = vérité métier** : catégorie et rapprochements validés ne doivent pas être écrasés silencieusement par un réimport.
- **Copier-coller / saisie = réel rapide ou provisoire**.
- Lorsqu'un PDF retrouve une opération provisoire, il consolide la même opération au lieu d'en créer une seconde.
- Le PDF remplace les faits bancaires provisoires mais préserve les qualifications métier validées.
- L'import alimente `Operations`, jamais Cerbère directement.

### Import : contrôle qualité
- Chaîne : normaliser -> identifier/dédoublonner -> consolider -> préserver les qualifications humaines -> catégoriser -> rapprocher les liens certains -> file de contrôle -> écriture en bloc -> un seul recalcul Cerbère.
- Après import, distinguer **non catégorisées** et **rapprochements à valider**.
- Une opération catégorisée ordinaire n'a pas besoin d'un rapprochement.
- La file de contrôle doit utiliser le même éditeur/la même base que l'écran Operations.
- Cerbère peut recalculer avec des éléments en attente, mais affiche une alerte chiffrée.
- Les montants non catégorisés ne doivent pas disparaître : intégration provisoire dans Divers possible jusqu'au classement.

### Rapprochements
- Trois niveaux : **certain / probable / inconnu**.
- Certain : automatisation possible si la règle est explicitement fiabilisée.
- Probable : proposition à valider.
- Inconnu : traitement manuel.
- Une occurrence réelle CF0 remplace le prévu du cycle, même si le montant diverge ; elle ne modifie pas automatiquement CF0 maître.
- Une opération rapprochée d'un Événement remplace le prévu et fait sortir l'Événement du prévisionnel.
- Une opération rapprochée d'une Action/étape remplace le prévu, met à jour l'Objectif et peut déclencher une nouvelle proposition de résolution.

### Carte à débit différé
- Les champs structurés du classeur doivent être utilisés plutôt que des heuristiques de libellé.
- Une CB achetée en M est imputée budgétairement à M+1.
- `date_achat` décrit l'achat ; `date_comptable` ne doit pas être utilisée à sa place pour déterminer le cycle d'achat.
- Neutraliser le règlement global de carte afin d'éviter le double comptage.
- Une CB rapprochée à CF0 ne consomme pas une enveloppe pilotable de M+1.

### Trésorerie
- Dans les Analyses, les mouvements de trésorerie restent séparés du résultat économique.
- Pour Cerbère, **seul leur signe compte pour la liquidité dans le périmètre piloté** : `+` améliore, `-` dégrade.
- Le périmètre de comptes piloté doit être explicite afin de traiter correctement les virements internes.

### Charges fixes
- Cerbère ne qualifie pas une opération de charge fixe uniquement parce qu'elle lui ressemble.
- Le réel CF0 repose sur l'étiquetage/liaison effectivement enregistré.
- Le moteur de rapprochement peut proposer ; la validation des données fait autorité.
- **Dans le cockpit Cerbère, CF0 est synthétique** : les charges fixes ne doivent pas créer de lignes/tirettes détaillées.

### Affichage Cerbère : pilotable vs trésorerie globale
- **Le détail et les tirettes Cerbère sont réservés au pilotable** : postes P0, Divers et projets/réservations dynamiques.
- Une catégorie valide hors P0 conserve sa catégorie et son effet sur la trésorerie, mais **ne devient pas une ligne pilotable**.
- Les flux hors P0 sont regroupés dans une synthèse secondaire ; ils ne deviennent pas Divers.
- Le dépassement P0/Pn est calculé uniquement avec les dépenses pilotables.
- L'appréciation générale M/M+1 distingue tension des enveloppes pilotables et risque de trésorerie global.

### Cerbère : présent et futur proche
- Pour M, partir du budget initial réel du cycle puis laisser le Réel pondérer la situation jusqu'au 27.
- L'indicateur central est ce qui peut **encore être dépensé aujourd'hui**.
- Pour M+1, projeter le solde de fin M + R0 − CF0 − CB engagées − Plan/réservations − autres flux connus.
- Les CB héritées de M-1 sont secondaires dans l'affichage ; les CB créées en M pour M+1 sont prioritaires.
- Les détails « hors enveloppes » et mouvements de trésorerie sont secondaires et peuvent être repliés derrière une information synthétique.

### Joker
- Si les engagements hérités dépassent la capacité raisonnable de compensation, Cerbère peut revenir temporairement à P0 comme **Joker de sécurité**.
- Le Joker est réversible/désactivable à tout moment.
- Après désactivation, le Réel reprend la main pour pondérer les tirettes.
- Une amélioration réelle de liquidité, par exemple un crédit de trésorerie, peut rendre le pilotage dynamique à nouveau soutenable.
- Un nouvel import ne réactive pas automatiquement un Joker désactivé : recalcul d'abord, proposition seulement si la situation le justifie.
- Activation/désactivation et motif sont traçables.

### Santé
- Cerbère utilise la **santé nette** : dépenses moins remboursements.
- Distinguer remboursements constatés et attendus ; l'attendu améliore l'estimation mais n'est pas de la liquidité déjà disponible.

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
- Seuils exacts autorisant un rapprochement automatique « certain ».
- Politique détaillée de priorités/protections entre enveloppes pour les propositions automatiques de compensation.
- Modèle définitif de clôture/version historique des cycles.
- Format final du module Pluxee et de son import.
- Doctrine des notifications mail.
