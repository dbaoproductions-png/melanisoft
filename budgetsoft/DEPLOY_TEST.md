# BudgetSoft — déploiement Apps Script TEST

Le workflow `.github/workflows/budgetsoft-deploy-test.yml` est volontairement **manuel** (`workflow_dispatch`) pendant la phase de fiabilisation.

## Une seule fois

1. Dans le compte Google qui possède/édite le projet Apps Script TEST, activer l'API Apps Script dans les paramètres Apps Script.
2. Installer Node.js et clasp localement :
   - `npm install -g @google/clasp`
3. Se connecter :
   - `clasp login`
4. Récupérer le contenu de `~/.clasprc.json`. Ne jamais le committer.
5. Dans GitHub > Settings > Secrets and variables > Actions, créer :
   - `CLASPRC_JSON` = contenu complet de `~/.clasprc.json`
   - `CLASP_JSON_TEST` = JSON du projet TEST, par exemple `{"scriptId":"SCRIPT_ID_TEST","rootDir":"budgetsoft/appscript"}`
6. Dans Apps Script TEST, afficher le fichier manifeste `appsscript.json` dans les paramètres du projet et recopier son contenu dans `budgetsoft/appscript/appsscript.json` sur la branche `budgetsoft-import-lab` avant le premier push.

## Utilisation

Après un correctif validé dans GitHub : Actions > `BudgetSoft - Deploy TEST` > Run workflow, branche `budgetsoft-import-lab`.

Le workflow :
- vérifie les secrets ;
- vérifie la présence du manifeste ;
- affiche les fichiers qui vont partir ;
- exécute `clasp push --force` vers le seul script défini par `CLASP_JSON_TEST` ;
- crée une version Apps Script portant le SHA GitHub.

Ainsi, chaque test peut être rattaché à un commit exact.

## Règle

Une fois ce pont opérationnel, ne plus modifier directement les fichiers du projet Apps Script TEST. Toute correction passe d'abord par GitHub.
