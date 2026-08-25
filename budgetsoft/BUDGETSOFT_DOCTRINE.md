# BudgetSoft — Doctrine fonctionnelle

## 1. Autorités de données

- Le PDF bancaire fait autorité devant le copier-coller et la saisie humaine lorsqu'il existe une divergence sur une opération bancaire.
- Dans `Operations`, la catégorie enregistrée fait autorité. Une opération sans catégorie valide est provisoirement traitée comme `Divers` jusqu'à classement manuel.
- Les charges fixes ne sont reconnues comme CF0 que lorsqu'elles sont explicitement reliées à une charge fixe (`charge_fixe_id`).
- Pour Cerbère, le signe bancaire prévaut pour la liquidité : `+` améliore la trésorerie, `-` la diminue.

## 2. P0, R0, CF0

- P0 = budget pilotable maître.
- R0 = recettes structurelles maître.
- CF0 = charges fixes maître. Cerbère ne les affiche qu'en synthèse.
- P0, R0 et CF0 ne sont pas réécrits par Cerbère. Cerbère mesure le réel et propose des ajustements locaux P1–P6.

## 3. Doctrine Cerbère 3.7

Cerbère ne cherche pas à expliquer le passé. Il pilote le présent et le futur proche.

### M — aujourd'hui → 27

Le chiffre principal est : **ce que l'on peut encore dépenser d'ici au 27**.

Calcul conceptuel :

`solde bancaire actuel + recettes encore attendues - charges fixes restant à passer - autres sorties futures confirmées`

Les dépenses déjà passées sur le compte ne sont pas soustraites une deuxième fois : elles sont déjà contenues dans le solde bancaire actuel.

### M+1 — 28 → 27 suivant

Le chiffre principal est : **capacité projetée du mois suivant**.

Calcul conceptuel :

`solde reporté projeté de fin M + R0 + recettes événementielles - CF0 - CB de M déjà engagées - Plan - hors-enveloppes connus`

### Point de départ du mois

Le point de départ représente la capacité initiale à ventiler avant consommation pilotable. L'écart `point de départ - P0` est affiché explicitement comme surplus ou déficit de départ.

## 4. Cartes bancaires

- Une dépense CB n'est imputée à Cerbère qu'à sa date réelle d'impact bancaire.
- Les achats CB effectués pendant M alimentent donc normalement M+1.
- Une charge fixe réglée par CB reste une charge fixe et ne doit pas être comptée dans le pilotable.
- Les doublons provisoire/définitif sont neutralisés ; la ligne bancaire définitive gagne.

## 5. Joker P0

Si les CB héritées excèdent la capacité de compensation du mois, Cerbère peut activer automatiquement le joker : les tirettes reviennent à P0 et l'interface indique pourquoi.

Le joker peut être désactivé manuellement à tout moment. Exemple : un crédit de trésorerie réellement encaissé augmente la capacité et l'utilisateur peut rendre la main au réel et aux ajustements locaux.

## 6. Santé

La catégorie Santé est pilotée en coût net. Les remboursements déjà constatés et les remboursements attendus suffisamment certains doivent diminuer le coût prévisionnel Santé, sans être comptés une seconde fois comme renfort de trésorerie.

## 7. Plan / Actions — Événements

Un événement possède :

- une nature (`recette` ou `dépense`) ;
- une catégorie ;
- une date d'effet ;
- un mode de paiement (`CB`, `Chèque`, `Virement`, `Prélèvement`, `Espèces`, `Autre`) ;
- une certitude ;
- éventuellement un fractionnement.

Le fractionnement est activé par une case à cocher. On choisit ensuite une périodicité (`mensuel` ou `annuel`) et un nombre de fois. Chaque occurrence devient une échéance prévisionnelle distincte.

Pour une dépense CB, la date de l'événement représente la date d'achat ; Cerbère décale l'impact à la période bancaire réelle correspondante.

Les recettes prévues sont intégrées une fois dans la capacité du mois puis ajustées quand le réel arrive. Les dépenses sont consommées au fur et à mesure de leurs dates d'impact.

## 8. Après import

Après chaque import, le système doit rendre visibles au minimum :

- le nombre d'opérations non catégorisées ;
- le nombre d'opérations non rapprochées lorsqu'un rapprochement CF0 ou événement est attendu ;
- les éventuels doublons neutralisés.

Les corrections manuelles agissent directement sur la base `Operations`; Cerbère se recalcule ensuite à partir de la base corrigée.

## 9. Doctrine Cerbère 3.7.12 — cycle, SS1 et décisions de pilotage

**Cette section précise et remplace toute formulation incompatible des sections précédentes.**

### 9.1 Frontière du cycle et salaire d'ouverture

Le cycle reste représenté conventionnellement par `28 inclus → 27 inclus`, mais sa frontière économique est définie par le **salaire d'ouverture**.

- Le salaire d'ouverture appartient toujours au nouveau cycle et reçoit dans Cerbère une **date conventionnelle fixe au 28**, même si la banque le comptabilise le 27, le 28 ou le 29.
- Le rapprochement bancaire du salaire ne déplace jamais son cycle : il **remplace seulement le montant prévu par le montant réel**.
- Un salaire bancaire daté du 27 qui ouvre le cycle suivant ne doit donc jamais rester compté dans le cycle qui se termine ce 27.
- Cette convention s'applique à M, M+1 et aux périodes projetées dès qu'un salaire réel d'ouverture est connu.

### 9.2 SS1 — report du cycle précédent

`SS1` est le **dernier solde de M−1 immédiatement avant le salaire d'ouverture de M**.

- SS1 est un stock de trésorerie reporté intégralement dans M, qu'il soit positif ou négatif.
- Il influence donc directement l'enveloppe initiale du nouveau cycle.
- Le salaire d'ouverture n'est jamais inclus deux fois : s'il est déjà contenu dans un solde bancaire daté du 27, Cerbère le retire de SS1 puis le réintroduit dans les recettes de M à sa date conventionnelle du 28.
- Pour M+1, le SS1 projeté est la fin projetée de M **avant** le salaire d'ouverture de M+1 ; le salaire de M+1 appartient à Rt1 de M+1.

### 9.3 Photographie initiale du cycle

Dès le premier jour du cycle, Cerbère doit connaître et afficher les éléments déjà certains ou suffisamment confirmés :

`SS1 + R1 + CF1 + Actions + Événements + P1`

Les charges fixes, Actions et Événements applicables au cycle ne sont pas découverts à leur date bancaire : leur effet est **déjà intégré à la photographie initiale** afin de décider immédiatement du budget pilotable.

Quand le Réel arrive :

- une charge fixe réelle **remplace** l'occurrence CF prévue, elle ne crée pas une nouvelle dépense ;
- une Action ou un Événement rapproché au Réel **remplace** son montant prévisionnel, il n'est pas compté deux fois ;
- une dépense pilotable réelle est, elle, une nouvelle consommation de l'enveloppe correspondante et réduit la molette en direct.

Une carte **« Actions & Événements du cycle »** doit rendre visibles les effets applicables au cycle, leur montant signé, leur date d'effet et leur statut (`Prévu`, `Rapproché au réel`, etc.). Cette carte est aussi une preuve lisible des pondérations appliquées aux cartes de synthèse.

### 9.4 Cartes de synthèse et molettes

Les cartes de synthèse décrivent la **trajectoire connue/projetée du cycle**. Elles appliquent dès l'ouverture :

- le report SS1 ;
- R1 et ses déformations par Actions/Événements ;
- CF1 et ses déformations par Actions/Événements ;
- les sorties hors pilotable connues ;
- le budget pilotable retenu.

Le Réel rapproche ensuite les éléments déjà prévus ou consomme les postes pilotables selon leur nature.

Les molettes représentent les **allocations P1 décidées**. Elles ne réécrivent ni P0 ni les faits bancaires. Elles permettent d'absorber un déficit ou d'affecter un surplus.

### 9.5 « À RÉÉQUILIBRER »

`À RÉÉQUILIBRER` est l'indicateur de décision associé aux molettes. Il est distinct de la carte de trajectoire, même si les deux peuvent être mathématiquement égaux au chargement.

À l'instant du calcul :

`À rééquilibrer = capacité avant pilotable − allocations P1 − dépassements pilotables déjà engagés`

avec :

`capacité avant pilotable = SS1 + Rt1 − CFt1 − HEt1`

- si le résultat est négatif, il faut réduire les allocations encore compressibles ;
- s'il est positif, le surplus peut être affecté aux postes souhaités ;
- **la carte À RÉÉQUILIBRER se met à jour immédiatement et localement pendant le déplacement des molettes**, avant même la validation des nouvelles allocations ;
- les cartes de trajectoire ne sont pas artificiellement réécrites à chaque mouvement de molette : la nouvelle allocation devient leur référence après validation/recalcul consolidé.

### 9.6 Contrôles de non-régression

La chaîne Cerbère doit conserver simultanément :

- la réconciliation du solde bancaire présent ;
- la convention salaire 27/28/29 → 28 Cerbère ;
- le report `SC(M) → SS1(M+1)` avant salaire du cycle suivant ;
- l'identité `SCt1 = SS1 + Rt1 − CFt1 − DPt1 − HEt1` ;
- l'égalité mathématique initiale entre trajectoire et `À rééquilibrer` lorsque `DPt1 = max(P1, engagé)` ;
- l'absence de double comptage des CF, Actions, Événements et opérations CB.
