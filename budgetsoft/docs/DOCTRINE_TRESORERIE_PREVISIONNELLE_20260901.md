# BudgetSoft — Doctrine du solde prévisionnel bancaire

> **Document normatif — 1er septembre 2026.**
>
> Ce document complète `DOCTRINE_BUDGETSOFT.md` et `DOCTRINE_CERBERE_RESTE_PILOTABLE_374.md`.
> Pour toute question concernant le **solde bancaire prévisionnel**, il prévaut sur les formulations historiques qui faisaient de Cerbère un moteur direct de trésorerie.

## 1. Grandeur maîtresse

Le périmètre est le **solde prévisionnel bancaire**.

Question unique :

> **À une date cible donnée, combien devrait-il réellement rester sur le compte courant ?**

Formule générale :

`Solde prévisionnel(J) = dernier solde bancaire réel fiable + flux bancaires non encore incorporés au solde jusqu'à J`

Cerbère n'est pas le référentiel du solde prévisionnel. Il intervient uniquement comme **facteur d'estimation** lorsque le montant d'un futur débit CB différé n'est pas encore entièrement connu.

## 2. Frontière du Réel

Le solde du 27 à minuit constitue le **solde d'ouverture du cycle budgétaire 28 -> 27**.

Pour le calcul quotidien, le point de référence avance avec les imports :

- le dernier **solde bancaire réel fiable** devient la nouvelle frontière du Réel ;
- les opérations déjà incorporées à ce solde ne sont plus projetées ;
- si l'import des dernières opérations n'a pas été fait le 27, le calcul est réévalué dès l'import suivant ;
- `Operations` reste l'unique registre du Réel et le solde de `Comptes` reste la valeur bancaire de référence.

Le solde du 27 sert donc à l'ouverture et à l'analyse du cycle ; il ne doit pas être artificiellement conservé comme point de départ si un solde réel plus récent est disponible.

## 3. Principe de remplacement

Une même réalité bancaire ne peut être comptée qu'une seule fois.

Hiérarchie :

`Estimation -> engagement connu -> opération réelle -> solde réel`

Chaque niveau plus concret **remplace** le précédent.

Exemples :

- une recette canonique prévue disparaît lorsqu'une opération réelle correspondante est constatée ;
- une charge fixe prévue est remplacée par son prélèvement réel ;
- un Événement/une Action est remplacé par l'opération rapprochée ;
- une estimation de débit CB diminue à mesure que des achats CB réels sont importés ;
- une fois le débit bancaire intégré au solde réel, il n'existe plus comme mouvement futur.

Principe absolu : **jamais Prévision + Réel pour le même mouvement.**

## 4. Cycle budgétaire et phases bancaires

Le cycle budgétaire reste **28 inclus -> 27 inclus**. Il n'est pas redéfini.

La trésorerie connaît cependant deux phases à cause de la CB à débit différé.

### 4.1 Du 28 au dernier jour du mois civil

Le solde prévisionnel prend en compte :

- recettes futures restant à encaisser ;
- charges fixes **non-CB** restant à débiter ;
- Actions/Événements effectifs ayant un impact bancaire ;
- CB différées déjà connues et non encore incorporées au solde ;
- complément raisonnable des CB susceptibles d'être engagées jusqu'au débit de fin de mois ;
- éventuels mouvements non-CB explicitement prévisibles.

Pour les quelques jours 28 -> fin du mois, le nouveau cycle Cerbère ne doit pas réécrire le débit CB du mois presque achevé. L'estimation résiduelle est marginale et s'appuie prioritairement sur le Réel historique des fins de mois.

### 4.2 Du 1er au 27

Tant que la date cible reste antérieure au prochain débit CB de fin de mois :

- recettes futures ;
- charges fixes non-CB restantes ;
- Actions/Événements effectifs ;
- mouvements non-CB explicitement prévisibles ;
- **aucune sortie bancaire progressive correspondant aux dépenses Cerbère**.

Les achats CB du mois en cours sont économiquement engagés, mais ils ne sortiront du compte qu'au prochain débit différé.

### 4.3 Dès que la date cible atteint le prochain débit CB

Le moteur ajoute :

`CB déjà connues à débiter + complément CB encore estimé`

Le complément estimé est composé de :

1. jusqu'au 27, du **reste des enveloppes Cerbère** susceptible d'être engagé ;
2. pour les jours 28 -> fin de mois, d'une estimation marginale fondée sur l'historique réel de ces jours.

Les achats CB déjà importés diminuent les enveloppes Cerbère ou deviennent des opérations futures certaines : ils ne doivent donc jamais être ajoutés une seconde fois au complément.

## 5. Rôle de Cerbère

Cerbère répond à une question différente :

> **Que peut-on encore engager raisonnablement dans les enveloppes pilotables ?**

Le solde prévisionnel répond à :

> **Que restera-t-il réellement sur le compte à telle date ?**

Interaction normative :

`Molettes / Joker -> reste Cerbère -> estimation du prochain débit CB -> solde prévisionnel après ce débit`

Interdiction :

`Molettes / Joker -X-> solde bancaire avant le prochain débit CB`

Ainsi, une modification de molettes le 10 du mois ne modifie pas le solde prévisionnel au 17 ou au 27 ; elle peut modifier le solde prévu au 30/31 et après.

## 6. Charges fixes réglées par CB

Une charge fixe conserve son statut métier de charge fixe, mais sa **date de sortie bancaire** suit le moyen de paiement.

- prélèvement/virement : date bancaire propre de la charge ;
- CB à débit différé : date du débit CB de fin de mois.

Une opération CB réelle liée par `charge_fixe_id` remplace la prévision de charge fixe correspondante.

Le moteur doit éviter simultanément :

- de compter la charge fixe à sa date d'achat puis le débit CB en fin de mois ;
- de la compter dans Cerbère pilotable alors qu'elle relève de CF0.

## 7. Plan — Actions et Événements

Seuls les Événements `Effectif/Effective` alimentent la trésorerie future.

- `Prévu` : information de planification, pas encore assez confirmée pour le solde bancaire ;
- `Effective` : flux futur bancaire retenu ;
- `Réalisé/Rapproché` : remplacé par le Réel ;
- `Annulé` : exclu.

Une suspension temporaire de charge fixe **retire l'occurrence prévue** ; elle ne crée jamais une recette fictive.

Une Action/Événement réglé par CB devrait, lorsque le moyen de paiement est connu, être porté à la date du débit CB. En l'absence de donnée structurée de moyen de paiement, sa date Plan reste la meilleure date disponible.

## 8. Recettes structurelles

R0 / `Cerbere_Recettes_Canon_V1` fournit les montants structurels attendus.

Le Réel historique sert à estimer le jour bancaire habituel. Les montants variables ne sont pas promus automatiquement en recettes structurelles.

Lorsqu'une recette réelle apparaît, elle remplace la prévision canonique correspondante.

## 9. Opérations futures

L'écran Operations peut afficher des lignes virtuelles, jamais écrites dans `Operations` :

- opération bancaire future déjà connue : **Certain** ;
- charge fixe : **Très probable** ;
- revenu structurel daté statistiquement : **Très probable / Prévu** selon l'historique ;
- Action/Événement effectif : selon son niveau de certitude ;
- complément de débit CB : **Estimation**.

La liste doit rendre visible la date bancaire, la source et la certitude.

## 10. Interactions avec les modules BudgetSoft

### Comptes

`Comptes` fournit le solde réel bancaire et sa date. La carte `Solde prévisionnel` est l'affichage principal du moteur.

### Operations

`Operations` fournit le Réel et les engagements CB déjà connus. Chaque import fait avancer la frontière du Réel et provoque un recalcul.

### Charges fixes

`Charges_fixes` fournit les occurrences structurelles. Le rapprochement réel remplace l'occurrence prévue. Le moyen de paiement détermine la date bancaire.

### Plan

Plan fournit uniquement les Actions/Événements suffisamment confirmés ; il ne réécrit jamais Operations.

### Cerbère

Cerbère fournit une estimation du potentiel de dépenses CB encore non engagées. Ses tirettes et le Joker n'altèrent pas directement un solde antérieur au prochain débit CB.

### Analyses

Analyses conserve une lecture économique/historique. La date d'achat et la période budgétaire peuvent être pertinentes en Analyse alors que le solde prévisionnel utilise exclusivement la date de sortie bancaire.

### Import

L'import n'écrit aucune prévision. Il enrichit `Operations`, actualise la vérité bancaire et invalide/recalcule la projection.

## 11. Mouvements non-CB non structurels

Aucune dépense statistique quotidienne générique n'est inventée.

Les paiements non-CB hors charges fixes sont inclus seulement lorsqu'ils sont identifiables : virement prévu, prélèvement ponctuel, Action/Événement, frais bancaire probable ou autre mouvement explicite.

Dans le contexte d'usage actuel, leur poids attendu est marginal.

## 12. Contrôles obligatoires

Avant validation du moteur, tester au minimum :

1. cible avant le prochain débit CB : aucune ligne Cerbère progressive ;
2. cible après le débit CB : apparition du complément CB estimé ;
3. import d'une nouvelle CB : le Réel augmente et l'estimation résiduelle diminue sans double compte ;
4. passage d'une charge fixe prévue au Réel : remplacement exact ;
5. charge fixe payée par CB : une seule sortie bancaire, à la date de débit ;
6. Événement Effective puis rapproché : prévision puis Réel, jamais les deux ;
7. suspension temporaire : disparition de la charge, aucune fausse recette ;
8. modification d'une molette avant le 27 : aucun effet sur une cible antérieure au débit CB, effet possible après ;
9. nouvel import avec solde plus récent : déplacement de la frontière du Réel et disparition des prévisions désormais incorporées.
