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
- Une occurrence réelle rapprochée **remplace l'occurrence CF0 prévue pour le cycle**, y compris si son montant diffère. Ne jamais compter prévision + réel.
- Une divergence ponctuelle modifie le réel du cycle, pas automatiquement le montant maître CF0. Une récurrence peut déclencher une proposition de réévaluation de CF0.
- **Dans le cockpit Cerbère, CF0 reste synthétique.** Les charges fixes ne sont pas des enveloppes à piloter avec des tirettes et leur détail appartient au module Charges fixes.

## 6. Operations et catégories : autorité des données

Pour toute opération, **la catégorie inscrite fait autorité**.

- `Categories` est le référentiel des catégories ; P0 ne l'est pas.
- Une catégorie valide absente de P0 conserve son nom et son sens ; elle ne devient pas automatiquement `Divers`.
- `Divers` reçoit provisoirement les opérations réellement orphelines/non classées. L'utilisateur assure le classement après import.
- Les modules ne doivent pas réinterpréter une opération catégorisée à partir de son libellé, sauf mécanisme explicitement destiné à proposer un classement, jamais à remplacer silencieusement la donnée validée.
- **Operations est l'unique base du Réel.** Cerbère ne possède pas de copie indépendante des opérations et se reconstruit à partir d'Operations.

## 7. Doctrine d'import du Réel

### 7.1 Hiérarchie des autorités

Trois niveaux doivent être distingués :

1. **PDF bancaire = vérité bancaire définitive** : montant, dates bancaires, libellé, carte, statut comptabilisé, solde et autres faits fournis par la banque.
2. **Utilisateur = vérité métier** : catégorie corrigée/validée, rapprochement CF0, rapprochement Événement/Action, commentaire ou autre qualification fonctionnelle.
3. **Copier-coller / saisie = réel rapide ou provisoire**, destiné à alimenter BudgetSoft avant consolidation par la source bancaire définitive.

Quand le PDF retrouve une opération déjà importée ou saisie, il **consolide la même opération** au lieu d'en créer une deuxième. Il remplace les faits bancaires provisoires par les faits définitifs mais conserve les qualifications métier validées par l'utilisateur, sauf contradiction explicitement traitée.

### 7.2 Responsabilité de l'import

L'import **observe, normalise, rapproche et enregistre** ; il ne doit pas appliquer directement une doctrine Cerbère cachée.

À sa sortie, une opération contient autant que possible : date, date comptable, date d'achat, montant signé, libellé bancaire, source, compte, carte, catégorie, type, statut provisoire/définitif, clé d'identité/rapprochement, `charge_fixe_id` et liens métier éventuels.

Chaîne normative :

`Importer -> normaliser -> identifier/dédoublonner -> consolider provisoire/PDF -> préserver qualifications humaines -> catégoriser -> rapprocher les liens certains -> créer la file de contrôle -> écrire en bloc -> recalculer Cerbère une seule fois`

### 7.3 Identité et dédoublonnage

Une opération bancaire possède une identité fonctionnelle indépendante de sa source. L'arrivée du PDF ne doit jamais faire disparaître puis recréer une dépense déjà prise en compte, ni provoquer un double comptage.

Le moteur utilise les données structurées disponibles (dates, montant, carte, marchand/libellé normalisé, clés de rapprochement, etc.) pour consolider les représentations provisoire et définitive d'un même mouvement.

### 7.4 Catégorisation

- Une catégorie métier déjà validée par l'utilisateur survit au réimport PDF.
- Une règle de catégorisation suffisamment fiable peut attribuer une catégorie automatiquement.
- Une opération sans catégorie fiable reste **à catégoriser** et peut être intégrée provisoirement dans `Divers` afin que son montant ne disparaisse jamais du pilotage.
- Après chaque import, les opérations non catégorisées doivent être présentées dans une file de contrôle permettant d'agir directement sur la base Operations.

### 7.5 Rapprochements métier

Une opération peut être :

- une opération pilotable ordinaire ;
- une occurrence CF0 ;
- la réalisation d'un Événement ;
- la réalisation d'une Action ou d'une étape de processus de résolution.

Le moteur distingue trois niveaux : **certain**, **probable**, **inconnu**.

- Certain : rapprochement automatique autorisé si la règle a été explicitement fiabilisée.
- Probable : proposition à valider.
- Inconnu : file manuelle.

Une validation utilisateur doit, autant que possible, améliorer les rapprochements proposés lors des imports suivants.

### 7.6 File de contrôle après import

Après chaque import, afficher séparément au minimum :

- opérations non catégorisées ;
- rapprochements CF0 proposés/non validés ;
- rapprochements Événements proposés/non validés ;
- rapprochements Actions proposés/non validés ;
- conflits ou doublons ambigus.

Une opération correctement catégorisée et ne nécessitant aucun lien particulier **n'est pas « non rapprochée »** : elle est exploitable immédiatement.

La file de contrôle doit utiliser le **même éditeur et la même base que l'écran Operations**, pas une base parallèle.

### 7.7 Recalcul après import

Cerbère peut être recalculé automatiquement même si des opérations restent à traiter, mais il affiche une alerte explicite du type :

`X opérations non catégorisées · Y rapprochements à valider`

Les montants doivent rester intégrés selon les informations disponibles afin de ne jamais masquer du réel. Toute correction dans Operations invalide ensuite Cerbère et provoque son recalcul consolidé.

Principe directeur :

> **L'import ne nourrit pas Cerbère directement. Il enrichit et fiabilise Operations ; Cerbère se reconstruit à partir d'Operations.**

## 8. Moteur commun de ventilation

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

## 9. Doctrine CB à débit différé

Les champs structurés du classeur font autorité ; éviter les heuristiques textuelles quand ils existent.

Une dépense CB différée est identifiée par les données structurées pertinentes, notamment `date_achat` et `carte_fin`.

- **CB achetée en période M -> imputation budgétaire M+1** ;
- autres mouvements -> imputation sur leur période M selon `date_comptable`, puis date de secours si nécessaire.

Une CB est donc du **réel constaté**, mais du réel déjà engagé pour la période suivante. Le règlement bancaire global de la carte différée ne doit jamais provoquer un double comptage.

Une opération CB identifiée comme occurrence CF0 ne consomme pas une enveloppe pilotable de M+1 : elle réalise CF0.

## 10. Cerbère — mission et périmètre d'affichage

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

### Présent et futur proche

Pour Cerbère, le passé n'est utile que pour établir la situation courante. Le cockpit doit répondre prioritairement à : **que puis-je encore faire maintenant, et que suis-je déjà en train de préparer pour le mois suivant ?**

Pour M, le point de départ du cycle est un **budget initial réel** construit à partir du solde du 27 au soir, R0, CF0 et événements/engagements connus. L'écart entre ce budget initial et P0 constitue une marge ou un déficit à répartir, distinct de `Divers`.

Au fil du mois, les opérations réelles pondèrent ce point de départ. L'indicateur principal devient le **reste pilotable aujourd'hui**.

### Poste de commandement M / M+1

L'affichage principal est une **fenêtre roulante de deux mois**, M et M+1 simultanément, avec tirettes ajustables en connaissance de cause.

Elle est coiffée d'une appréciation générale explicable sur les deux mois. Cette appréciation distingue autant que possible **tension des enveloppes pilotables** et **risque de trésorerie global**.

Pour M, privilégier : budget initial du cycle, situation bancaire actuelle, flux encore attendus avant le 27, charges fixes restant à passer, autres sorties confirmées, reste pilotable aujourd'hui et CB de M déjà engagées pour M+1.

Pour M+1, privilégier : solde projeté de fin M, R0 prévu, CF0 prévu, CB pilotables de M déjà engagées, Plan/réservations, hors-enveloppes déjà connus et capacité projetée.

Les CB héritées de M-1 sont une donnée d'initialisation secondaire de M ; les CB créées pendant M pour M+1 sont une donnée de pilotage majeure.

P3…P6 restent disponibles pour l'anticipation mais ne sont pas le poste de commandement quotidien.

### Joker / retour de sécurité à P0

Si les engagements hérités rendent les ajustements locaux de la période incohérents ou insuffisamment soutenables, Cerbère peut activer un **Joker de sécurité** : retour des tirettes à P0 avant nouvelle ventilation, avec explication chiffrée.

Le Joker est **réversible à tout moment** :

- l'utilisateur peut le désactiver manuellement ;
- après désactivation, le Réel reprend immédiatement la main et les tirettes sont recalculées à partir de la situation courante ;
- une amélioration de liquidité (par exemple un crédit de trésorerie positif) peut rendre de nouveau le pilotage dynamique soutenable ;
- un nouvel import ne réactive pas mécaniquement un Joker désactivé : Cerbère recalcule d'abord et ne le repropose que si la nouvelle situation le justifie ;
- le Joker peut être réactivé manuellement ;
- activations/désactivations et motifs doivent rester traçables.

## 11. Capacité et « reste réellement pilotable »

Ne pas confondre : budget alloué par P0/Pn, budget initial réel du cycle, marge/déficit à répartir, reste dans une enveloppe, reste pilotable aujourd'hui et capacité de trésorerie globale.

Pour M, la logique est celle de **l'instant T jusqu'au 27** : solde bancaire actuel + recettes encore attendues − charges fixes restant à passer − autres sorties futures confirmées − engagements déjà pris = ce qui peut encore être engagé.

Pour M+1 : solde projeté de fin M + R0 prévu − CF0 prévu − CB déjà engagées − Plan/réservations − autres flux connus = capacité projetée.

Une catégorie hors P0 ne doit pas réduire artificiellement le « reste P0 » ; elle doit en revanche peser sur la trésorerie globale.

## 12. Solde de départ

Chaque cycle possède un solde de départ : idéalement le **27 au soir**, sinon le dernier solde fiable disponible avant le début du cycle, signalé comme approximation.

Le solde initial est un **stock de trésorerie**, distinct de R0 qui décrit des flux.

## 13. Santé nette

Cerbère raisonne sur la **santé nette estimée/constatée** : dépenses de santé moins remboursements.

Distinguer les remboursements **constatés** des remboursements **attendus**. Les remboursements attendus peuvent améliorer l'estimatif du coût net, mais ne doivent pas être présentés comme de la liquidité déjà disponible. Les cotisations de mutuelle relevant de CF0 restent des charges fixes.

## 14. Planification

Terminologie : **Planification -> Objectifs -> Actions**, avec un cadre séparé **Événements**.

### Objectif
Intention mesurable. La liste des objectifs est hiérarchique et agrège automatiquement l'impact des Actions liées.

### Action
Une Action doit rester simple, concrète et quantifiable. Elle peut porter une nature : supprimer, remplacer, réduire, augmenter, rembourser, acheter, réserver, etc. Elle peut être rapprochée des données BudgetSoft.

Une Action confirmée avec montant/date suffisamment certains alimente les périodes concernées, **jamais P0**. Une option « réévaluer charges fixes » peut proposer l'effet sur CF0, avec validation humaine.

Lorsqu'une opération réelle est rapprochée d'une Action/étape, le réel **remplace le prévu**, met à jour la progression de l'Objectif et peut déclencher une nouvelle proposition du processus de résolution.

### Projets / réservations
Un projet qui réserve réellement une somme doit produire une **ligne budgétaire dynamique identifiée** dans les périodes concernées. Ne pas tout fondre dans une ligne générique `Projet`.

## 15. Processus de résolution et versionnement

Certaines décisions nécessitent un processus de résolution. Une proposition est calculée à l'instant T et n'est jamais une vérité définitive.

`Plan -> validation -> Cerbère -> Réel -> écart -> nouvelle proposition -> validation`

Chaque révision crée une nouvelle version. La progression d'un objectif est calculée à partir du **réel effectivement exécuté**, pas du prévu.

## 16. Événements

Un Événement représente un impondérable ou fait futur positif/négatif, non une stratégie. Formulaire unique : date, montant, sens, catégorie, certitude, commentaire, rapprochement au Réel.

Lorsqu'une opération réelle est rapprochée d'un Événement, elle **remplace le montant prévu**, y compris si le montant réel diverge. L'Événement quitte alors le prévisionnel ; le Réel prend sa place et l'écart est immédiatement réinjecté dans Cerbère.

## 17. Pluxee

Pluxee est une poche séparée de la monnaie bancaire : abondement autour du 18, solde de départ du cycle, opérations importées, distinction au minimum Courses / Restaurants, disponible aujourd'hui distinct de l'abondement attendu.

## 18. Recalculs

Doivent invalider/recalculer Cerbère : import Operations/Pluxee, création/modification/suppression Action ou Événement, rapprochement, modification P0/R0/CF0, modification structurante des charges fixes.

Doctrine de performance : **invalidation immédiate, recalcul consolidé unique**. Un import de N opérations ne doit jamais lancer N recalculs complets.

## 19. Fiabilité et explicabilité

Cerbère distingue autant que possible Réel, Confirmé, Prévu, Estimé. Une alerte doit toujours être explicable par des raisons chiffrées ; pas de score opaque.

## 20. Clôture d'un cycle

À la clôture du 27 : enregistrer le solde fiable, figer le bilan, assurer le passage des engagements CB, conserver les écarts P0/Pn/Réel, faire de M+1 le nouveau M et générer le nouvel horizon P6. L'historique ne doit pas être réécrit rétroactivement.

## 21. Priorités de stabilisation

1. fiabiliser le moteur commun Operations/Categories et la chaîne d'import ;
2. fiabiliser R0/CF0/P0 ;
3. fiabiliser Cerbère M/M+1 et l'imputation CB ;
4. consolider Planification et ses interactions avec Cerbère ;
5. intégrer solde de départ et projets dynamiques ;
6. développer Pluxee ;
7. ajouter notifications mail ;
8. nettoyer code, boutons et fonctions historiques devenus inutiles.

## 22. Précisions normatives sur P0, R0 et CF0 — 25/08/2026

Cette section **précise et remplace toute formulation antérieure incompatible** dans ce document.

### P0 est un maître immuable face au Réel

- Une opération importée, saisie, rapprochée ou recatégorisée **ne modifie jamais P0**.
- P0 ne change que par une action humaine explicite : ouverture du paramétrage P0, modification des postes, puis validation comme **nouvelle référence maître**.
- Le paramétrage P0 est accessible directement depuis le bandeau Cerbère et reprend l'ergonomie des périodes : tirettes, pas de 10 € et saisie directe.
- Le **total de P0 peut lui-même être reparamétré**. Il n'existe aucune obligation de conserver le total précédent ni de verser automatiquement un écart dans `Projet` ou `Divers`.
- Pour aider à réviser P0, l'écran de paramétrage présente l'historique mensuel des **dépenses réellement engagées par poste P0**, calculé avec la même doctrine que Cerbère : charges fixes exclues, santé nette, CB imputées au cycle d'impact. Cet historique est une aide à la décision et ne modifie jamais automatiquement P0.

### R0 reste R0 ; le Réel corrige Rn

- R0 est une référence maître indépendante du Réel.
- Lorsqu'une recette réelle diffère du montant canonique, **R0 reste inchangé**.
- L'écart `réel − R0` est porté uniquement par la période concernée : **R1/Rn**. Par exemple, une recette prévue à 2 500 € et réellement reçue à 2 430 € crée un ajustement de −70 € dans la période ; elle ne transforme pas R0 en 2 430 €.
- Seule une validation humaine dans le paramétrage R0 crée une nouvelle référence maître.

### CF0 maître et photographie de période

- **CF0 est le référentiel maître des charges fixes**. Il n'est pas « pondéré » par le Réel et ne doit pas changer au fil des opérations.
- La pondération, les suppressions temporaires, les événements et les réalisations concernent **la période**, pas CF0 maître.
- Au démarrage d'un nouveau cycle, le **28 à 00:01**, la période doit recevoir une **photographie de CF0**. Cette photographie devient la référence fixe du cycle 28→27.
- Au cours du cycle, une opération réelle rapprochée d'une charge fixe remplace l'occurrence prévue de cette photographie, y compris si son montant diffère ; elle ne réécrit ni la photographie de départ ni CF0 maître.
- Le bandeau Cerbère affiche CF0 maître et donne un accès direct à son inspection/reparamétrage. Le reparamétrage du maître se fait dans le référentiel Charges fixes et doit être explicite.
- Un recalcul manuel du référentiel est possible. Toute décision de **remplacer la photographie déjà figée d'un cycle** doit être une action explicite et distincte, jamais une conséquence silencieuse d'un import.
- La mise en œuvre du déclenchement horaire exact de la photographie relève du mécanisme d'exécution planifiée ; elle ne doit pas être obtenue en modifiant silencieusement l'infrastructure existante.

## 23. Nomenclature de pilotage quotidien Cerbère — 25/08/2026

Cette section **remplace les anciennes formules de capacité M/M+1 lorsqu'elles sont incompatibles**. Cerbère distingue strictement l'autorisation pilotable, la trajectoire réévaluée du cycle et le contrôle bancaire.

### P0, P1 et RPt1

- **P0** = référence pilotable maître. Le Réel ne la modifie jamais.
- **P1** = budget pilotable décidé pour le cycle courant. Il est la somme des allocations locales/molettes du cycle. Une opération réelle ne modifie pas P1 ; seule une action explicite sur les allocations le fait.
- **RPt1** = reliquat pilotable à l'instant `t` :

`RPt1 = P1 − dépenses pilotables déjà consommées ou engagées`

RPt1 est la **synthèse des molettes** et constitue le grand indicateur quotidien : « combien me reste-t-il dans le plan pilotable ? ».

### R1 et Rt1

- **R1** = recettes prévues du cycle, construites à partir de R0 puis déformées par les événements/ajustements propres au cycle.
- **Rt1** = recettes du cycle réévaluées à l'instant `t` :
  - pour une recette déjà réalisée, le montant **réel remplace le prévu** ;
  - pour une recette non encore réalisée, la prévision R1 reste retenue ;
  - une entrée exceptionnelle réellement constatée ou un événement futur confirmé peut déformer Rt1 sans modifier R0.

### D1, CFt1 et DPt1

- **D1 = CF1 + DP1**, c'est-à-dire charges fixes du cycle + dépenses pilotables du cycle.
- **CFt1** = charges fixes réévaluées à `t` : occurrence réelle rapprochée si elle est passée, sinon occurrence prévue dans la photographie CF1.
- **DPt1** = dépenses pilotables réévaluées à `t` : réel/engagé pour la partie connue, prévision P1 pour le futur restant. Tant qu'une enveloppe n'est pas dépassée, sa dépense projetée de fin de cycle reste son allocation P1 ; un dépassement réel/engagé augmente DPt1.
- **Dt1 = CFt1 + DPt1**.
- Une dépense non fixe qui ne relève d'aucun poste P1 doit être considérée comme une anomalie de classement à expliquer/reclasser, typiquement vers `Divers`, et ne doit pas devenir silencieusement une troisième famille permanente de dépenses Cerbère.

### SS1 — solde significatif de départ

- **SS1** = solde significatif à la frontière du cycle, idéalement le 27 à 23:59 / 28 à 00:01.
- « Significatif » signifie que la frontière doit être contrôlée : opération du cycle suivant déjà comptabilisée, opération du cycle précédent encore absente, chèque ou CB en décalage, autre mouvement de frontière.
- Tant que SS1 n'a pas été validé, Cerbère peut proposer/reconstituer un candidat, mais il doit l'afficher comme **reconstitué à contrôler**, jamais comme vérité validée.
- La validation de SS1 est explicite et propre au cycle.

### SCt1 — trajectoire Cerbère réévaluée

Le solde Cerbère projeté à la fin du cycle est :

`SCt1 = SS1 + Rt1 − Dt1`

soit :

`SCt1 = SS1 + Rt1 − CFt1 − DPt1`

SCt1 répond à : **« avec tout ce que je sais aujourd'hui, où le cycle devrait-il terminer si le plan P1 restant est consommé ? »**. Il contrôle la soutenabilité de P1 ; il ne remplace pas RPt1.

Ainsi deux informations peuvent diverger légitimement :

- `RPt1 > 0` : il reste du budget dans les molettes ;
- `SCt1 < 0` : consommer tout ce reliquat conduirait à une fin de cycle négative ; Cerbère doit alors alerter et proposer un resserrement de P1.

### SHBt1 et contrôle de cohérence bancaire

- **SHBt1** = solde Hello bank réellement affiché à l'instant `t`.
- **SC-présent(t)** = solde Cerbère reconstruit à l'instant `t` à partir de SS1 et des seuls mouvements bancaires réellement constatés depuis la frontière.
- Cerbère calcule :

`écart(t) = SHBt1 − SC-présent(t)`

- Les deux soldes suivent des logiques différentes, mais **tout écart doit être mathématiquement explicable** : opération bancaire non importée, provisoire/définitive, décalage de frontière, CB, chèque, opération rattachée à un autre cycle, etc.
- Lorsque SS1 est seulement reconstitué à partir du solde courant, un écart nul n'est pas encore une preuve de cohérence ; le vrai contrôle prend sa valeur après validation explicite de SS1.

### Affichage prioritaire

Pour chaque période M/M+1, le cockpit doit privilégier dans cet ordre :

1. **RPt1 — reste pilotable** ;
2. **SCt1 — trajectoire réévaluée de fin de cycle** ;
3. **SS1, Rt1, CFt1, DPt1** comme décomposition explicable ;
4. pour M seulement, **SHBt1 / SC-présent(t) / écart** comme contrôle de cohérence bancaire.

P0, R0 et CF0 restent visibles comme référentiels maîtres, sans être modifiés par ces calculs.
