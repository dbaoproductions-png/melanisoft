# BudgetSoft — Google Apps Script

## Sprint 1

Ce dossier contient le serveur Google Sheets de BudgetSoft.

### Installation

1. Créer un Google Sheet privé nommé `BudgetSoft - Données`.
2. Ouvrir **Extensions > Apps Script**.
3. Remplacer le contenu de `Code.gs` par celui de ce dossier.
4. Exécuter une première fois `setupBudgetSoft` et accepter les autorisations.
5. Le classeur crée les onglets : Parametres, Comptes, Operations, Budget, Actifs, Dettes, Credits, Objectifs et Categories.

### Déploiement web

L'interface Apps Script complète sera ajoutée à l'étape de déploiement. La version présente dans `/budgetsoft` permet déjà de tester l'ergonomie, la saisie, l'import/export et le stockage local sans exposer les données dans GitHub.

### Sécurité

- Le dépôt ne contient aucune donnée familiale.
- Le Google Sheet doit rester privé et être partagé seulement avec les personnes autorisées.
- Lors du déploiement, choisir un accès limité aux comptes Google autorisés.
