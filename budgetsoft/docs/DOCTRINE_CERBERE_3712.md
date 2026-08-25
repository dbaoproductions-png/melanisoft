# Cerbère 3.7.12 — doctrine du cycle et du pilotage en direct

> Addendum normatif à `DOCTRINE_BUDGETSOFT.md` — 25/08/2026. En cas de formulation antérieure incompatible sur le solde de départ, la frontière du cycle ou la prise en compte du Plan, le présent addendum prévaut.

## 1. Frontière conventionnelle du cycle

Le cycle Cerbère reste affiché **28 inclus → 27 inclus**.

Le **salaire de l'utilisateur ouvre conventionnellement le cycle** : quelle que soit sa date bancaire réelle parmi le 27, le 28 ou le 29, sa date d'imputation Cerbère est le **28** du cycle concerné.

Le rapprochement du salaire au Réel :

- ne change jamais sa date Cerbère ;
- ne change jamais le cycle auquel il appartient ;
- remplace uniquement le montant R1 prévu par le montant réellement versé.

## 2. SS1 — report de M−1

**SS1 est le dernier solde de M−1 immédiatement avant le salaire qui ouvre M.**

Il est un stock de trésorerie, distinct des recettes du cycle. Il est reporté intégralement dans M :

- SS1 positif augmente l'enveloppe initiale ;
- SS1 négatif la diminue.

Si le salaire est comptabilisé par la banque le 27, Cerbère le retire du solde bancaire de frontière pour reconstituer SS1, puis le réimpute conventionnellement au 28 dans Rt1. Il ne doit jamais être compté à la fois dans SS1 et dans Rt1.

M+1 reçoit comme SS1 le solde projeté de fin de M.

## 3. Ce qui est connu dès le premier jour

À l'ouverture du cycle, Cerbère construit la photographie de décision avec tout ce qui est déjà connu sur le cycle :

`SS1 + R1 − CF1 ± Actions/Événements applicables`.

Les conséquences positives ou négatives d'une **Action** ou d'un **Événement** applicable au cycle sont donc intégrées **dès le premier jour du cycle**, même si leur date d'exécution bancaire est plus tardive.

Cette règle sert à répondre à la question : **quelle est l'enveloppe initiale réellement disponible et quelles décisions pilotables faut-il prendre ?**

## 4. Réel : remplacement ou nouvelle consommation

Le traitement du Réel dépend de la nature du flux.

### Charges fixes

Une charge fixe réelle n'est pas une nouvelle dépense : elle réalise une dépense déjà provisionnée dans CF1. Le Réel **remplace** le montant prévu. Seul l'écart entre prévu et réel modifie la trajectoire.

### Actions et Événements

Une Action ou un Événement déjà intégré au cycle n'est pas recréé lors de sa réalisation. Lorsqu'il est rapproché d'une opération, le Réel **remplace le prévisionnel** ; seule la différence de montant modifie la trajectoire.

### Dépenses pilotables

Une dépense pilotable réelle est une **consommation nouvelle de l'enveloppe pilotable**. Elle réduit immédiatement la molette de sa catégorie selon la date d'imputation Cerbère applicable, notamment pour les CB différées.

## 5. Cartes de synthèse du cycle

Toutes les cartes qui décrivent la trajectoire du cycle doivent être calculées à partir de la même photographie pondérée : référentiel de période + SS1 + Actions/Événements applicables + Réel rapproché.

Une carte `Actions & événements du cycle` présente les déformations spécifiques appliquées au cycle, avec :

- libellé ;
- source Action/Événement ;
- date d'effet ;
- montant signé ;
- catégorie/cible ;
- statut Prévu / Réalisé à rapprocher / Rapproché au réel.

Une occurrence rapprochée reste visible dans cette carte pour l'explicabilité, mais son montant prévisionnel ne s'ajoute jamais au Réel.

## 6. Molettes et « À rééquilibrer »

Les cartes de synthèse établissent le contexte de décision. Les **molettes P1** servent à agir sur le pilotable.

`À rééquilibrer` mesure l'écart entre la capacité du cycle avant pilotable et les allocations P1, en tenant compte des dépassements pilotables déjà engagés :

`À rééquilibrer = capacité avant pilotable − allocations P1 − dépassements déjà engagés`

avec :

`capacité avant pilotable = SS1 + Rt1 − CFt1 − HEt1`.

À l'ouverture d'un affichage, cette valeur peut être numériquement égale à la trajectoire SCt1 ; **ce sont néanmoins deux objets fonctionnels distincts** :

- SCt1 décrit la trajectoire calculée du cycle ;
- `À rééquilibrer` est l'instrument de décision qui réagit immédiatement aux molettes.

Quand l'utilisateur réduit une allocation de 100 €, `À rééquilibrer` s'améliore immédiatement de 100 €. Quand il augmente une allocation de 100 €, il se dégrade immédiatement de 100 €. La validation enregistre ensuite P1 et provoque un recalcul complet des cartes.

## 7. Contrôle de non-double-compte

Pour tout flux connu du cycle, Cerbère doit pouvoir répondre : **où ce montant est-il compté ?**

Un même montant ne peut être simultanément :

- dans CFt1 et dans une molette ;
- dans un Événement prévisionnel et dans son opération réelle rapprochée ;
- dans une Action prévisionnelle et dans son opération réelle rapprochée ;
- dans SS1 et dans le salaire Rt1 du cycle.

Tout rapprochement remplace la prévision correspondante ; il ne crée jamais une deuxième occurrence économique.
