# BudgetSoft — Doctrine fonctionnelle

> **Document normatif.** Avant toute modification fonctionnelle de BudgetSoft, relire ce document et `CONTEXTE_TECHNIQUE.md`.
>
> En cas de contradiction entre un code historique et une règle explicitement validée ici, **la doctrine prévaut**. Corriger le logiciel ; ne pas modifier l'infrastructure de travail pour contourner un problème fonctionnel.

## 1. Architecture fonctionnelle

BudgetSoft distingue strictement :

- **R0 — Recettes maître** : recettes mensuelles normales de référence.
- **CF0 — Charges fixes maître** : charges fixes normales et identifiées comme telles.
- **P0 — Budget maître pilotable** : répartition canonique des dépenses souples et réserves.
- **Planification** : avenir instruit (Objectifs, Actions, Événements, projets/réservations).
- **Réel / Operations** : vérité constatée ; le réel n'est jamais réécrit pour correspondre au Plan.
- **Cerbère** : police d'exécution et de trésorerie à court terme. Il applique la stratégie ; il ne la décide pas.

Chaîne conceptuelle :

`R0 + CF0 + P0 + solde de départ + Planification + Réel -> Cerbère -> P1…P6 -> alertes -> nouveau Réel -> recalcul`

## 2. Périodes BudgetSoft

Le cycle budgétaire est **28 inclus -> 27 inclus**.

Exemple : `28 août -> 27 septembre = Septembre`.

Cette définition doit être commune à tous les modules. Une seule logique de calcul des périodes doit faire autorité.

## 3. P0 — dépenses pilotables maître

P0 est la référence persistante de répartition normale du budget pilotable.

- Modifier puis valider P0 = **nouvelle référence permanente**.
- P1…P6 héritent du P0 courant.
- Une Action ou un Événement ne modifie jamais P0 directement : il déforme uniquement les périodes concernées.
- Une modification manuelle de P1/P2/etc. est locale à cette seule période.
- « Revenir à P0 » sur une période supprime sa dérogation locale et la fait réhériter du **P0 courant**.
- P0 comporte une ligne **Divers = 0 € par défaut**.
- Une ancienne ligne générique `Projet` ne doit pas masquer les réservations réelles : les projets financiers doivent devenir des lignes dynamiques identifiées.

## 4. R0 — recettes maître

R0 est un canon visible, persistant et modifiable des recettes normales.

Il ne doit jamais être enfoui dans le code. Les périodes futures partent de R0, puis Planification et Réel le pondèrent.

R0 décrit des **flux normaux attendus** ; il est distinct du solde bancaire de départ et des renforts ponctuels de trésorerie.

## 5. CF0 — charges fixes maître

CF0 est constitué des charges fixes effectivement définies/étiquetées comme charges fixes dans BudgetSoft.

- Le prévisionnel CF0 vient de `Charges_fixes`, pondéré par les Actions/Événements validés.
- Pour le réel, Cerbère ne décide pas heuristiquement qu'une opération « ressemble » à une charge fixe : il ne retient comme rapprochement certain que l'étiquetage/liaison effectivement enregistré dans les données.
- Le moteur de rapprochement peut proposer une association ; la donnée validée fait autorité.

## 6. Operations et catégories : autorité des données

Pour toute opération, **la catégorie inscrite fait autorité**.

- `Categories` est le référentiel des catégories ; P0 ne l'est pas.
- Une catégorie valide absente de P0 conserve son nom et son sens ; elle ne devient pas automatiquement `Divers`.
- `Divers` reçoit provisoirement les opérations réellement orphelines/non classées. L'utilisateur assure le classement après import.
- Les modules ne doivent pas réinterpréter une opération catégorisée à partir de son libellé, sauf mécanisme explicitement destiné à proposer un classement, jamais à remplacer silencieusement la donnée validée.

## 7. Moteur commun de ventilation

Un socle commun doit lire `Operations + Categories` et produire des opérations propres :

- catégorie et type de catégorie ;
- montant signé ;
- dates disponibles ;
- éventuel `charge_fixe_id` ;
- informations structurées de carte (`date_achat`, `carte_fin`, etc.).

Puis chaque module applique sa doctrine :

### Analyse
Lecture économique/historique : catégories et types, mouvements de trésorerie séparés du résultat économique.

### Cerbère
Lecture de **liquidité à court terme** : période d'imputation Cerbère, CB différée, CF0, santé nette, Planification, solde initial.

Pour les catégories de **trésorerie**, Cerbère ne cherche pas leur sens économique : **seul le signe compte** dans le périmètre piloté.

- montant `+` = améliore la liquidité ;
- montant `-` = dégrade la liquidité.

Attention : un transfert entre deux comptes appartenant au même périmètre global peut être neutre globalement. Le périmètre de trésorerie piloté doit donc être explicite.

## 8. Doctrine CB à débit différé

Les champs structurés du classeur font autorité ; éviter les heuristiques textuelles quand ils existent.

Une dépense CB différée est identifiée par les données structurées pertinentes, notamment `date_achat` et `carte_fin`.

Règle Cerbère :

- **CB achetée en période M -> imputation budgétaire M+1** ;
- autres mouvements -> imputation sur leur période M selon `date_comptable`, puis date de secours si nécessaire.

Une CB est donc du **réel constaté**, mais du réel déjà engagé pour la période suivante.

Le règlement bancaire global de la carte différée ne doit jamais provoquer un double comptage des achats individuels déjà imputés.

## 9. Cerbère — mission

Cerbère est le policier du budget quotidien. Il ne fait pas de stratégie et ne modifie ni le Réel ni la Planification.

Il doit :

- construire P1…P6 à partir des canons, du Plan et du Réel ;
- mesurer les écarts ;
- surveiller la liquidité ;
- proposer des compensations/alertes explicables ;
- conserver les dérogations manuelles propres à chaque période.

### Poste de commandement M / M+1

L'affichage principal est une **fenêtre roulante de deux mois**, M et M+1 simultanément, avec tirettes ajustables en connaissance de cause.

Elle est coiffée d'une appréciation générale explicable sur les deux mois : trajectoire saine, vigilance, risque de trésorerie, etc., avec raisons chiffrées.

Pour chaque mois, afficher notamment :

- budget de la période / reste réellement pilotable ;
- réel non-CB imputé ;
- CB héritée de M-1 ;
- Plan à venir ;
- réservations/projets ;
- objectifs en cours et progression fondée sur le réel ;
- solde de départ ;
- informations Pluxee lorsqu'elles existent.

Pour M, afficher aussi les CB déjà engagées pour M+1.

P3…P6 restent disponibles pour l'anticipation mais ne sont pas le poste de commandement quotidien.

## 10. Capacité et « reste réellement pilotable »

Ne pas confondre :

- budget alloué par P0/Pn ;
- marge structurelle non affectée ;
- reste dans une enveloppe ;
- capacité réellement pilotable.

La **capacité réellement pilotable** représente ce qui peut encore être engagé sans mettre la période en danger compte tenu de ce que Cerbère sait à l'instant T.

Elle tient notamment compte de : solde initial, ressources/renforts de trésorerie, CF0, réel imputé, CB héritées, Plan, réservations de projets et protections.

## 11. Solde de départ

Chaque cycle possède un solde de départ : idéalement le **27 au soir**, sinon le dernier solde fiable disponible avant le début du cycle, signalé comme approximation.

Le solde initial est un **stock de trésorerie**, distinct de R0 qui décrit des flux.

## 12. Santé nette

Cerbère raisonne sur la **santé nette estimée/constatée** : dépenses de santé moins remboursements.

Distinguer les remboursements déjà constatés des remboursements seulement attendus afin de ne pas créer une fausse impression de liquidité immédiate.

Les cotisations de mutuelle relevant de CF0 restent des charges fixes.

## 13. Planification

Terminologie : **Planification -> Objectifs -> Actions**, avec un cadre séparé **Événements**.

### Objectif
Intention mesurable, par exemple : diminuer les charges fixes, solder Oney, préparer des vacances.

La liste des objectifs est hiérarchique et agrège automatiquement l'impact des Actions liées.

### Action
Une Action doit rester aussi simple, concrète et quantifiable que possible : résilier Deezer, remplacer une mutuelle, verser une somme à Oney, etc.

Elle peut porter une nature : supprimer, remplacer, réduire, augmenter, rembourser, acheter, réserver, etc.

Elle peut être rapprochée des données BudgetSoft (charges fixes, crédits, opérations).

Une Action confirmée avec montant/date suffisamment certains alimente les périodes concernées, **jamais P0**.

Une option « réévaluer charges fixes » peut proposer l'effet sur CF0 (suppression/remplacement), avec validation humaine avant mutation d'une donnée structurante.

### Projets / réservations
Un projet qui réserve réellement une somme doit produire une **ligne budgétaire dynamique identifiée** dans les périodes concernées (ex. `Remboursement Oney`, `Vacances`).

Ne pas tout fondre dans une ligne générique `Projet`.

## 14. Processus de résolution et versionnement

Certaines décisions nécessitent un processus de résolution.

Exemple `Solder Oney` : BudgetSoft peut lire le capital restant dû, calculer les disponibilités soutenables sur P1…P6 et proposer un échéancier concret.

Une proposition est calculée à l'instant T et n'est jamais une vérité définitive.

Boucle normative :

`Plan -> validation -> Cerbère -> Réel -> écart -> nouvelle proposition -> validation`

Chaque révision crée une nouvelle version. Les anciennes versions restent dans l'historique.

La progression d'un objectif est calculée à partir du **réel effectivement exécuté**, pas du prévu.

## 15. Événements

Un Événement représente un impondérable ou fait futur positif/négatif, non une stratégie.

Formulaire unique : date, montant, sens, catégorie, certitude, commentaire, rapprochement au Réel.

Une fois réalisé et rapproché avec l'opération réelle, il **quitte le prévisionnel** : le Réel prend le relais.

Les anciens ajustements ponctuels de charges fixes (ex. suspension CASDEN) ont vocation à être représentés comme Événements lorsque c'est leur vraie nature fonctionnelle.

## 16. Pluxee

Pluxee est une poche séparée de la monnaie bancaire.

- abondement autour du 18 de chaque mois ;
- solde de départ du cycle, idéalement au 27 au soir ou dernier solde disponible ;
- opérations importées lorsqu'un module Pluxee sera disponible ;
- distinction au minimum Courses / Restaurants ;
- affichage `disponible aujourd'hui` distinct de l'abondement seulement attendu.

Exemple d'affichage : total disponible, dont Courses X et Restaurants Y.

## 17. Recalculs

Doivent invalider/recalculer Cerbère :

- import d'Operations ;
- futur import Pluxee ;
- création/modification/suppression d'Action ;
- création/modification/suppression d'Événement ;
- rapprochement au Réel ;
- modification P0/R0/CF0 ;
- modification structurante des charges fixes.

Doctrine de performance : **invalidation immédiate, recalcul consolidé unique**. Un import de N opérations ne doit pas lancer N recalculs complets.

## 18. Fiabilité et explicabilité

Cerbère doit pouvoir distinguer autant que possible :

- Réel ;
- Confirmé ;
- Prévu ;
- Estimé.

Une appréciation/alerte doit toujours être explicable par des raisons chiffrées ; pas de score opaque.

## 19. Clôture d'un cycle

À la clôture du 27 :

1. enregistrer le dernier solde fiable ;
2. figer le bilan du cycle ;
3. assurer le passage des engagements CB vers la période suivante ;
4. conserver les écarts P0/Pn/Réel pour Analyse ;
5. faire de M+1 le nouveau M ;
6. générer le nouvel horizon P6 à partir des canons et du Plan.

L'historique ne doit pas être réécrit rétroactivement par un recalcul futur.

## 20. Priorités de stabilisation

Avant les fonctionnalités sophistiquées à long terme :

1. fiabiliser le moteur commun Operations/Categories ;
2. fiabiliser R0/CF0/P0 ;
3. fiabiliser Cerbère M/M+1 et l'imputation CB ;
4. consolider Planification et ses interactions avec Cerbère ;
5. intégrer solde de départ et projets dynamiques ;
6. développer Pluxee ;
7. ajouter notifications mail ;
8. nettoyer code, boutons et fonctions historiques devenus inutiles.

Les projections sophistiquées à 3/5/10 ans, SMS et stratégie automatique avancée restent ultérieures.