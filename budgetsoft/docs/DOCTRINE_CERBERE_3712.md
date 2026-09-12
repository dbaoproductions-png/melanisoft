# Cerbère 3.7.12 — doctrine du cycle et du pilotage en direct

> Addendum normatif à `DOCTRINE_BUDGETSOFT.md` — 25/08/2026, précisé le 12/09/2026. En cas de formulation antérieure incompatible sur le solde de départ, la construction de P1, la frontière du cycle, la prise en compte du Plan ou les CB différées, le présent addendum prévaut.

## 1. Frontière conventionnelle du cycle

Le cycle Cerbère reste affiché **28 inclus → 27 inclus**.

Le **salaire de l'utilisateur ouvre conventionnellement le cycle** : quelle que soit sa date bancaire réelle parmi le 27, le 28 ou le 29, sa date d'imputation Cerbère est le **28** du cycle concerné.

Le rapprochement du salaire au Réel :

- ne change jamais sa date Cerbère ;
- ne change jamais le cycle auquel il appartient ;
- remplace uniquement le montant R1 prévu par le montant réellement versé.

## 2. SS1 — report de M−1

**SS1 est le dernier solde bancaire de M−1 immédiatement avant le salaire qui ouvre M.**

Il est un stock de trésorerie, distinct des recettes du cycle. Il est reporté intégralement dans M :

- SS1 positif augmente la capacité initiale ;
- SS1 négatif la diminue.

Si le salaire est comptabilisé par la banque le 27, Cerbère le retire du solde bancaire de frontière pour reconstituer SS1, puis le réimpute conventionnellement au 28 dans Rt1. Il ne doit jamais être compté à la fois dans SS1 et dans Rt1.

M+1 reçoit comme SS1 un solde de frontière projeté selon la doctrine bancaire dédiée ; ce point ne modifie pas la règle de construction du P1 du cycle courant.

## 3. Deux temps strictement distincts : construire P1, puis vivre avec P1

Cerbère distingue deux logiques qui ne doivent plus être mélangées.

### Temps A — construction comptable de l'enveloppe P1

Au démarrage du cycle, Cerbère répond à la question :

> **Compte tenu de ce que j'ai réellement en banque avant le salaire, de ce que je vais recevoir et de toutes les dépenses du cycle déjà prévues ou connues, quel montant puis-je consacrer aux dépenses pilotables ?**

La photographie initiale part de **SS1**, ajoute **Rt1**, puis retranche toutes les dépenses du cycle connues ou prévisionnelles. Une dépense réelle connue remplace sa prévision correspondante ; elle ne s'y ajoute jamais.

On définit :

`Dprévu_total = P0 + CFt1 + HEt1 + Plan_dépenses + CB_héritées_M-1 + autres_sorties_connues`

avec la règle :

`prévision remplacée par Réel dès que le Réel est connu`.

Le surplus/déficit du cycle par rapport au canon P0 est alors :

`Surplus1 = SS1 + Rt1 − Dprévu_total`

et l'enveloppe pilotable retenue est :

`P1 = P0 + Surplus1`

Donc, de façon algébriquement équivalente :

`P1 = SS1 + Rt1 − CFt1 − HEt1 − Plan_dépenses − CB_héritées_M-1 − autres_sorties_connues`

Cette deuxième écriture ne signifie pas que P0 disparaît fonctionnellement : **P1 reste P0 corrigé du surplus ou du déficit réel du cycle**.

### Cas fondamental des CB différées héritées de M−1

Les achats CB différés effectués pendant M−1 mais dont le **débit bancaire global tombera au 2e ou 3e jour de M** sont déjà connus à l'ouverture de M.

Ils entrent donc dans le **calcul comptable initial de P1 de M** comme une sortie héritée certaine ou quasi certaine :

`P1(M) tient compte du débit CB hérité de M−1`.

Ils ne doivent ensuite **jamais être décomptés une deuxième fois** comme consommation quotidienne de P1(M), puisqu'ils correspondent à des achats déjà effectués sous le guide de vie du cycle précédent.

Le règlement bancaire technique global de ces cartes est un mouvement de trésorerie ; il ne recrée aucune dépense économique.

### Temps B — P1 devient un guide de vie

Une fois P1 calculé et ventilé entre les postes, **on change de logique**.

P1 n'est plus recalculé chaque jour à partir de la date comptable des paiements. Il devient le **canon de dépense du cycle** : la question quotidienne est simplement :

> **Combien ai-je déjà engagé/dépensé sous ce P1 et combien me reste-t-il à dépenser sans sortir de mon cadre ?**

Le reliquat quotidien est :

`RPt1 = P1 − dépenses_pilotables_engagées_depuis_le_28`

et, par poste :

`Reste_poste = Allocation_P1_poste − dépenses_engagées_poste`.

Pour cette consommation quotidienne de P1, c'est **la date de l'acte économique / de l'engagement** qui compte, pas la date à laquelle la banque débitera finalement le compte.

Ainsi :

- une **CB différée achetée pendant M** consomme immédiatement P1(M) selon sa date d'achat, même si son débit bancaire aura lieu en M+1 ;
- un **virement, chèque ou paiement liquide** engagé pendant M consomme également P1(M), même si son impact bancaire intervient dans M ;
- le moyen de paiement et son décalage bancaire ne changent donc pas la règle de vie : **une dépense décidée pendant M consomme le canon P1(M)**.

Cette dissociation est volontaire. À court terme, certaines dépenses frappent la banque en M et d'autres en M+1 ; sur la durée, le respect régulier des P1 successifs **lisse ces décalages de trésorerie** et garantit une organisation économique soutenable.

### Règle de non-régression

Il est interdit de faire dépendre la consommation quotidienne de P1 de la seule `date_comptable` bancaire.

Il est également interdit de réinjecter dans P1(M) comme nouvelle consommation les CB héritées de M−1 qui ont déjà servi à construire l'enveloppe initiale de M.

Les deux lectures sont distinctes et complémentaires :

- **construction de P1** = réalité comptable et engagements hérités à la frontière du cycle ;
- **exécution de P1** = discipline quotidienne par date d'engagement/d'achat, indépendamment du décalage bancaire.

## 4. Réel : remplacement ou nouvelle consommation

Le traitement du Réel dépend de sa place dans ces deux temps.

### Pendant la construction/réévaluation de la photographie comptable

Une dépense réelle correspondant à une dépense déjà prévue **remplace** cette prévision. Seul l'écart modifie la photographie comptable ; jamais `Prévision + Réel` pour un même mouvement.

### Charges fixes

Une charge fixe réelle n'est pas une nouvelle dépense : elle réalise une dépense déjà provisionnée dans CF1. Le Réel **remplace** le montant prévu. Seul l'écart entre prévu et réel modifie la trajectoire.

### Actions et Événements

Une Action ou un Événement déjà intégré au cycle n'est pas recréé lors de sa réalisation. Lorsqu'il est rapproché d'une opération, le Réel **remplace le prévisionnel** ; seule la différence de montant modifie la trajectoire.

### Dépenses pilotables après fixation de P1

Une dépense pilotable engagée pendant le cycle est une **consommation de l'enveloppe P1**. Elle réduit immédiatement la molette de sa catégorie selon sa date économique d'engagement, en particulier `date_achat` pour une CB différée.

Elle ne provoque pas un nouveau calcul comptable de P1 à chaque paiement : **P1 est le cadre, le Réel mesure son exécution**.

## 5. Ce qui est connu dès le premier jour

À l'ouverture du cycle, Cerbère construit la photographie de décision avec tout ce qui est déjà connu sur le cycle : SS1, Rt1, charges fixes, sorties hors pilotable, Actions/Événements financiers et engagements hérités, notamment les CB différées de M−1 débitées en M.

Les conséquences positives ou négatives suffisamment certaines d'une **Action** ou d'un **Événement** applicable au cycle sont intégrées dès le premier jour, même si leur date d'exécution bancaire est plus tardive.

Cette règle sert à déterminer correctement **P1 avant de commencer à le consommer**.

## 6. Cartes de synthèse du cycle

Toutes les cartes qui décrivent la trajectoire comptable du cycle doivent être calculées à partir de la même photographie pondérée : référentiel de période + SS1 + Rt1 + dépenses prévues/réelles + Actions/Événements applicables + engagements hérités.

Les cartes de pilotage quotidien doivent, elles, comparer **P1 fixé** au Réel pilotable engagé depuis le début du cycle.

Une carte `Actions & événements du cycle` présente les déformations spécifiques appliquées au cycle, avec :

- libellé ;
- source Action/Événement ;
- date d'effet ;
- montant signé ;
- catégorie/cible ;
- statut Prévu / Réalisé à rapprocher / Rapproché au réel.

Une occurrence rapprochée reste visible pour l'explicabilité, mais son montant prévisionnel ne s'ajoute jamais au Réel.

## 7. Molettes, P1 et « À rééquilibrer »

Les **molettes P1** ventilent le montant total P1 entre les postes pilotables.

La somme des molettes doit égaler P1, sauf marge explicitement laissée non ventilée :

`P1 = somme(allocations P1) + marge_non_ventilée`.

Une fois P1 fixé, modifier une molette redistribue l'autorisation entre postes ; cela ne doit pas recréer silencieusement une nouvelle enveloppe globale.

Le contrôle quotidien principal devient :

`RPt1 = P1 − consommé/engagé pilotable du cycle`.

Un indicateur `À rééquilibrer` peut signaler un écart entre le total P1 et sa ventilation locale, mais il ne doit jamais confondre :

- la **construction comptable initiale de P1** ;
- la **ventilation de P1** ;
- la **consommation quotidienne de P1** ;
- la **trajectoire bancaire**, qui suit ses propres dates de débit/crédit.

## 8. Contrôle de non-double-compte

Pour tout flux connu du cycle, Cerbère doit pouvoir répondre : **où ce montant est-il compté ?**

Un même montant ne peut être simultanément :

- dans CFt1 et dans une molette ;
- dans un Événement prévisionnel et dans son opération réelle rapprochée ;
- dans une Action prévisionnelle et dans son opération réelle rapprochée ;
- dans SS1 et dans le salaire Rt1 du cycle ;
- dans les CB héritées utilisées pour construire P1(M) et une seconde fois dans le consommé quotidien de P1(M) ;
- dans un achat CB pilotable de M et dans son règlement bancaire technique de M+1 comme nouvelle dépense économique.

Tout rapprochement remplace la prévision correspondante ; il ne crée jamais une deuxième occurrence économique.

## 9. Principe directeur à protéger dans le code

> **P1 naît d'une photographie comptable ; une fois fixé, P1 devient un guide de vie.**

Le moteur doit donc conserver deux axes sans les fusionner :

1. **axe comptable / trésorerie** : SS1, Rt1, dates bancaires, charges et engagements hérités servent à construire et contrôler la soutenabilité ;
2. **axe comportemental / pilotable** : les dépenses décidées pendant le cycle consomment P1 à leur date d'engagement, quel que soit leur décalage bancaire.

Toute modification future de Cerbère doit être testée contre cette distinction avant déploiement.