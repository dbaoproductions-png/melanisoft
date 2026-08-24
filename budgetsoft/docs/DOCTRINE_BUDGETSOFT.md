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
- **Dans le cockpit Cerbère, CF0 reste synthétique.** Les charges fixes ne sont pas des enveloppes à piloter avec des tirettes et leur détail appartient au module Charges fixes.

## 6. Operations et catégories : autorité des données

Pour toute opération, **la catégorie inscrite fait autorité**.

- `Categories` est le référentiel des catégories ; P0 ne l'est pas.
- Une catégorie valide absente de P0 conserve son nom et son sens ; elle ne devient pas automatiquement `Divers`.
- `Divers` reçoit provisoirement les opérations réellement orphelines/non classées. L'utilisateur assure le classement après import.
- Les modules ne doivent pas réinterpréter une opération catégorisée à partir de son libellé, sauf mécanisme explicitement destiné à proposer un classement, jamais à remplacer silencieusement la donnée validée.

## 7. Moteur commun de ventilation

Un socle commun doit lire `Operations + Categories` et produire des opérations propres : catégorie et type, montant signé, dates disponibles, éventuel `charge_fixe_id`, informations structurées de carte.

Puis chaque module applique sa doctrine.

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

- **CB achetée en période M -> imputation budgétaire M+1** ;
- autres mouvements -> imputation sur leur période M selon `date_comptable`, puis date de secours si nécessaire.

Une CB est donc du **réel constaté**, mais du réel déjà engagé pour la période suivante. Le règlement bancaire global de la carte différée ne doit jamais provoquer un double comptage.

## 9. Cerbère — mission et périmètre d'affichage

Cerbère est le policier du budget quotidien. Il ne fait pas de stratégie et ne modifie ni le Réel ni la Planification.

Il doit construire P1…P6, mesurer les écarts, surveiller la liquidité, proposer des alertes explicables et conserver les dérogations locales.

### Principe capital : le détail Cerbère est pilotable

Le cockpit détaillé de Cerbère doit être **concentré sur ce sur quoi l'utilisateur peut agir**.

Deux lectures doivent coexister sans être confondues :

1. **Contrôle des enveloppes pilotables** : P0/Pn − dépenses pilotables − CB pilotables − Plan/réservations pilotables.
2. **Contrôle de trésorerie global** : solde + R0 + mouvements de trésorerie et autres flux − CF0 − flux hors enveloppes − dépenses pilotables − Plan.

Conséquences d'affichage :

- Les **tirettes et le tableau détaillé** affichent seulement les postes P0 pilotables, `Divers`, et les lignes dynamiques de projets/réservations issues de Planification.
- Les catégories valides **hors P0** ne deviennent ni `Divers` ni des enveloppes avec tirettes. Elles restent catégorisées et affectent la trésorerie globale ; Cerbère les résume dans une information synthétique du type **« Hors enveloppes pilotables »**.
- CF0 reste une **case synthétique** ; son détail n'a pas à encombrer le cockpit quotidien.
- Un dépassement P0/Pn ne doit être calculé qu'avec le **réel pilotable**. Une charge hors P0 peut détériorer la trésorerie globale sans être présentée comme un dépassement du budget pilotable.

### Poste de commandement M / M+1

L'affichage principal est une **fenêtre roulante de deux mois**, M et M+1 simultanément, avec tirettes ajustables en connaissance de cause.

Elle est coiffée d'une appréciation générale explicable sur les deux mois. Cette appréciation distingue autant que possible **tension des enveloppes pilotables** et **risque de trésorerie global**.

Pour chaque mois, afficher notamment : budget pilotable, réel pilotable non-CB, CB pilotable héritée de M-1, Plan/réservations pilotables, capacité de trésorerie, synthèse CF0, synthèse hors enveloppes, objectifs, solde de départ et Pluxee lorsqu'il existe.

Pour M, afficher aussi les CB déjà engagées pour M+1. P3…P6 restent disponibles pour l'anticipation mais ne sont pas le poste de commandement quotidien.

## 10. Capacité et « reste réellement pilotable »

Ne pas confondre : budget alloué par P0/Pn, marge structurelle non affectée, reste dans une enveloppe, et capacité de trésorerie globale.

Le **reste pilotable** concerne uniquement les enveloppes pilotables. La **capacité de trésorerie** tient compte de l'ensemble des flux connus : solde initial, ressources/renforts, CF0, flux hors enveloppes, réel pilotable, CB, Plan et réservations.

Une catégorie hors P0 ne doit donc pas réduire artificiellement le « reste P0 » ; elle doit en revanche peser sur la trésorerie globale.

## 11. Solde de départ

Chaque cycle possède un solde de départ : idéalement le **27 au soir**, sinon le dernier solde fiable disponible avant le début du cycle, signalé comme approximation.

Le solde initial est un **stock de trésorerie**, distinct de R0 qui décrit des flux.

## 12. Santé nette

Cerbère raisonne sur la **santé nette estimée/constatée** : dépenses de santé moins remboursements. Distinguer remboursements constatés et attendus. Les cotisations de mutuelle relevant de CF0 restent des charges fixes.

## 13. Planification

Terminologie : **Planification -> Objectifs -> Actions**, avec un cadre séparé **Événements**.

### Objectif
Intention mesurable. La liste des objectifs est hiérarchique et agrège automatiquement l'impact des Actions liées.

### Action
Une Action doit rester simple, concrète et quantifiable. Elle peut porter une nature : supprimer, remplacer, réduire, augmenter, rembourser, acheter, réserver, etc. Elle peut être rapprochée des données BudgetSoft.

Une Action confirmée avec montant/date suffisamment certains alimente les périodes concernées, **jamais P0**. Une option « réévaluer charges fixes » peut proposer l'effet sur CF0, avec validation humaine.

### Projets / réservations
Un projet qui réserve réellement une somme doit produire une **ligne budgétaire dynamique identifiée** dans les périodes concernées. Ne pas tout fondre dans une ligne générique `Projet`.

## 14. Processus de résolution et versionnement

Certaines décisions nécessitent un processus de résolution. Une proposition est calculée à l'instant T et n'est jamais une vérité définitive.

`Plan -> validation -> Cerbère -> Réel -> écart -> nouvelle proposition -> validation`

Chaque révision crée une nouvelle version. La progression d'un objectif est calculée à partir du **réel effectivement exécuté**, pas du prévu.

## 15. Événements

Un Événement représente un impondérable ou fait futur positif/négatif, non une stratégie. Formulaire unique : date, montant, sens, catégorie, certitude, commentaire, rapprochement au Réel. Une fois réalisé et rapproché, il quitte le prévisionnel.

## 16. Pluxee

Pluxee est une poche séparée de la monnaie bancaire : abondement autour du 18, solde de départ du cycle, opérations importées, distinction au minimum Courses / Restaurants, disponible aujourd'hui distinct de l'abondement attendu.

## 17. Recalculs

Doivent invalider/recalculer Cerbère : import Operations/Pluxee, création/modification/suppression Action ou Événement, rapprochement, modification P0/R0/CF0, modification structurante des charges fixes.

Doctrine de performance : **invalidation immédiate, recalcul consolidé unique**.

## 18. Fiabilité et explicabilité

Cerbère distingue autant que possible Réel, Confirmé, Prévu, Estimé. Une alerte doit toujours être explicable par des raisons chiffrées ; pas de score opaque.

## 19. Clôture d'un cycle

À la clôture du 27 : enregistrer le solde fiable, figer le bilan, assurer le passage des engagements CB, conserver les écarts P0/Pn/Réel, faire de M+1 le nouveau M et générer le nouvel horizon P6. L'historique ne doit pas être réécrit rétroactivement.

## 20. Priorités de stabilisation

1. fiabiliser le moteur commun Operations/Categories ;
2. fiabiliser R0/CF0/P0 ;
3. fiabiliser Cerbère M/M+1 et l'imputation CB ;
4. consolider Planification et ses interactions avec Cerbère ;
5. intégrer solde de départ et projets dynamiques ;
6. développer Pluxee ;
7. ajouter notifications mail ;
8. nettoyer code, boutons et fonctions historiques devenus inutiles.
