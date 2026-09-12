# Cerbère — P1 comptable et guide de vie — addendum normatif du 12/09/2026

Cet addendum précise et remplace toute formulation antérieure incompatible concernant la construction, la réévaluation et la consommation de P1.

## 1. Deux logiques successives mais articulées

Cerbère distingue :

1. **la capacité comptable du cycle**, qui détermine le montant total pilotable disponible ;
2. **l'exécution quotidienne de P1**, qui mesure le respect du canon de dépenses par poste.

Ces deux axes dialoguent mais ne se confondent jamais.

## 2. Construction de la capacité pilotable

Au début du cycle M (28 → 27), Cerbère part de **SS1**, solde bancaire immédiatement avant le salaire d'ouverture, ajoute **Rt1**, puis retranche les dépenses non pilotables et obligations comptables du cycle.

Le principe est :

`capacité pilotable = SS1 + Rt1 − CFt1 − HEt1 − CB héritées de M−1 non déjà provisionnées − autres sorties connues`

Les dépenses prévues sont remplacées par leur Réel lorsqu'il est connu ; elles ne sont jamais comptées deux fois.

Les CB héritées de M−1 dont le débit bancaire tombe au début de M réduisent la capacité initiale de M. Une CB déjà reconnue comme occurrence de charge fixe est exclue du terme « CB héritées », car son montant est déjà porté par CFt1.

P1 reste conceptuellement **P0 corrigé du surplus ou déficit du cycle** :

`Surplus/Déficit vs P0 = capacité pilotable − P0`

## 3. Réévaluation économique en cours de cycle

Le total pilotable peut évoluer lorsque la réalité économique non pilotable diverge du prévisionnel.

Exemples :

- une recette Concerts supérieure au montant prévu augmente la capacité ;
- une recette inférieure la diminue ;
- une facture Freebox supérieure à la photographie CF1 réduit la capacité ;
- une économie sur une charge fixe l'augmente ;
- un événement de recette ou de charge suffisamment certain pondère la capacité selon sa doctrine propre.

Ces écarts alimentent le **surplus ou déficit à ventiler**.

Ils ne modifient pas silencieusement les répartitions locales des molettes. L'utilisateur choisit, par les molettes, comment réaffecter le nouveau surplus ou résorber le déficit.

Formule de ventilation :

`Surplus/Déficit à ventiler = P1 courant − somme des allocations des molettes`

## 4. P1 comme guide de vie

Une dépense pilotable ne recalcule pas la capacité comptable. Elle **consomme le poste P1 correspondant au moment où la dépense est engagée**.

`Reste P1 = P1 courant − dépenses pilotables engagées`

et, par poste :

`Reste poste = allocation du poste − dépenses engagées sur ce poste`

La date de consommation pilotable est la date de l'acte économique : en particulier `date_achat` pour une CB différée.

Le moyen de paiement ne change pas cette règle : CB différée, virement, chèque ou liquide consomment P1 au moment de la dépense.

## 5. Double rôle des CB différées

Une CB différée possède deux lectures simultanées :

- **lecture comportementale** : l'achat effectué pendant M consomme P1(M) immédiatement à sa date d'achat ;
- **lecture comptable** : son débit bancaire futur devient une obligation héritée de M+1 et intervient dans la construction de la capacité de M+1.

Le règlement bancaire technique ne recrée jamais une nouvelle dépense économique et ne consomme jamais une seconde fois une molette.

## 6. Principe de non-régression

Toute évolution Cerbère doit respecter les invariants suivants :

- SS1 participe à la construction comptable de P1 ;
- les CB héritées non déjà provisionnées participent à la construction comptable de P1 ;
- les écarts de recettes et de charges non pilotables modifient le surplus/déficit à ventiler ;
- les dépenses pilotables consomment les molettes à leur date d'engagement ;
- une même dépense ne peut être comptée à la fois comme obligation héritée, charge fixe, consommation pilotable et règlement technique ;
- aucune date bancaire de débit ne doit réattribuer une dépense pilotable à un autre canon P1 après son engagement.

Principe directeur :

> **P1 naît d'une réalité comptable, reste réévaluable par les écarts économiques non pilotables, puis sert de guide de vie pour les dépenses pilotables quotidiennes.**
