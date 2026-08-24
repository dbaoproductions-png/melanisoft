# BudgetSoft — Contexte technique stable

> À lire avec `DOCTRINE_BUDGETSOFT.md` avant toute modification.

## 1. Infrastructure de travail

- Dépôt : `dbaoproductions-png/melanisoft`.
- BudgetSoft : `budgetsoft/appscript/`.
- La branche de travail historique dédiée est `budgetsoft-import-lab` ; `main` est également utilisée pour les versions testées/déployées selon le workflow existant.
- **Principe impératif : les problèmes fonctionnels se corrigent dans le logiciel, pas en modifiant l'infrastructure de travail.**
- Ne pas changer branches, routeurs, mécanismes de déploiement ou architecture d'inclusion uniquement pour contourner un bug sans diagnostic explicite.
- Éviter les couches concurrentes qui interceptent le même écran : une seule autorité fonctionnelle par module doit être recherchée pendant la consolidation.

## 2. Source de vérité fonctionnelle

Ordre de priorité :

1. `budgetsoft/docs/DOCTRINE_BUDGETSOFT.md` ;
2. décisions plus récentes consignées dans `DECISIONS.md` ;
3. structure et données réellement présentes dans le classeur ;
4. code courant ;
5. code historique, uniquement comme référence/migration.

Une fonction ancienne ne constitue pas une doctrine à elle seule.

## 3. Tables structurantes observées

Le classeur BudgetSoft contient notamment :

- `Operations`
- `Categories`
- `Charges_fixes`
- `Rapprochements_charges_fixes`
- `Credits`
- `Plan_Actions`
- `Plan_Evenements`
- tables liées aux Objectifs/Projets selon version
- `Cerbere_Canon_V1` / canon P0 courant selon migration
- `Cerbere_Recettes_Canon_V1` pour R0
- `Cerbere_Ajustements` pour les dérogations locales P1…P6
- anciennes tables Cerbère pouvant subsister pour compatibilité/historique.

Avant de supprimer ou migrer une table, vérifier ses consommateurs réels.

## 4. Operations : champs critiques

Les données réelles comportent notamment les concepts/champs suivants :

- `date`
- `categorie`
- `montant` signé
- `type`
- `date_comptable`
- `date_achat`
- `carte_fin`
- `charge_fixe_id`

La syntaxe exacte du classeur courant doit toujours être vérifiée avant de modifier un parseur.

### Règles d'utilisation

- La **catégorie enregistrée** fait autorité.
- Le type doit être résolu depuis le référentiel `Categories` lorsque possible.
- `date_achat` + information de carte structurée servent à la doctrine CB différée Cerbère.
- `charge_fixe_id`/liaison validée sert à identifier le réel CF0 ; ne pas substituer une heuristique silencieuse.

## 5. Moteurs existants

BudgetSoft possède déjà un moteur d'Analyse qui ventile les opérations par catégories/types. Lors de la consolidation, extraire/réutiliser la logique commune plutôt que recréer une classification indépendante dans Cerbère.

Architecture cible :

`Operations + Categories -> ventilation commune normalisée`

puis :

- `Doctrine Analyse -> résultats économiques/historiques`
- `Doctrine Cerbère -> liquidité, périodes d'imputation, CB, CF0, santé nette, Planification`

## 6. Cerbère

Le développement récent a introduit successivement plusieurs versions/couches (V3, V3.3, V3.5, V3.6...). La consolidation doit réduire les duplications et déterminer clairement le moteur et l'UI faisant autorité.

Règles techniques à préserver :

- P0 persistant ;
- R0 persistant et visible ;
- ajustements P1…P6 stockés par clé de période ;
- Planification validée injectée dans les périodes concernées ;
- recalcul consolidé plutôt que recalculs en cascade ;
- fenêtre quotidienne M/M+1 ;
- P3…P6 conservés pour anticipation.

## 7. Planification

Terminologie fonctionnelle : `Planification > Objectifs > Actions`, avec `Événements` séparés.

Fonctions attendues :

- formulaire unique Action ;
- formulaire unique Événement ;
- modifier/supprimer ;
- rapprochement aux données BudgetSoft ;
- Action simple ou processus de résolution versionné ;
- calcul d'impact ;
- connexion à Cerbère uniquement selon les règles de confirmation ;
- progression des Objectifs fondée sur le Réel.

## 8. Performance

Problème historique majeur : lenteurs Cerbère/Planification/Dashboard et dépassements de durée Apps Script.

Doctrine technique :

- lire les tables en bloc ;
- indexer en mémoire ;
- éviter les accès cellule par cellule ;
- éviter de recalculer Cerbère pour chaque ligne d'un import ;
- invalider puis effectuer un calcul consolidé ;
- ne pas multiplier les appels serveur depuis l'UI quand un seul payload peut suffire ;
- mesurer les temps des étapes structurantes avant toute optimisation spéculative.

## 9. Tests de non-régression Cerbère/Planification

À contrôler après une modification structurante :

1. P0 modifié devient bien la nouvelle référence.
2. Une modification Pn ne touche que la période concernée.
3. R0 est visible, persistant et utilisé.
4. CF0 ne consomme que les charges fixes/rapprochements validés selon doctrine.
5. Les catégories d'Operations restent celles enregistrées.
6. Les orphelines seules tombent provisoirement dans Divers.
7. Une CB de M est imputée à M+1 à partir des champs structurés.
8. Le débit global de carte n'est pas compté deux fois.
9. Les mouvements de trésorerie agissent sur Cerbère selon leur signe dans le périmètre piloté.
10. Santé est nette.
11. Une Action/Événement confirmé affecte les P concernés, jamais P0.
12. Un Événement rapproché quitte le prévisionnel.
13. La somme des lignes affichées se réconcilie avec les totaux.
14. L'appréciation M/M+1 est explicable et cohérente avec les chiffres.
15. Les projets financiers apparaissent comme réservations/lignes identifiées.

## 10. Déploiement et nettoyage

Pendant la phase de stabilisation :

- préférer une modification cohérente et testable à une succession de patches ;
- ne supprimer du code historique qu'après avoir identifié ses appels et remplacé ses responsabilités ;
- documenter les migrations de données ;
- garder l'interface explicable : un chiffre important doit pouvoir être relié à ses composants.

## 11. Prochain chantier identifié

Cerbère 3.6.x doit être consolidé autour de :

- moteur commun de ventilation Operations/Categories ;
- catégorie enregistrée comme autorité ;
- CB via champs structurés `date_achat`/`carte_fin` ;
- CF0 explicite ;
- trésorerie Cerbère gouvernée par le signe ;
- M/M+1 ;
- solde de départ ;
- lignes dynamiques de projets ;
- puis Pluxee et notifications mail.
