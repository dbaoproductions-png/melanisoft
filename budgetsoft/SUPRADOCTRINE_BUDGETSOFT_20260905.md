# BudgetSoft — Supradoctrine fonctionnelle

**Version : 2026-09-05**

Ce document est normatif. Il précise et, en cas de contradiction, prévaut sur les formulations historiques de `BUDGETSOFT_DOCTRINE.md`, `docs/DOCTRINE_BUDGETSOFT.md` et des doctrines de modules antérieures.

## 1. Hiérarchie fonctionnelle

La hiérarchie est :

`BudgetSoft → modules BudgetSoft → Cerbère → Cerbère Express`

- **BudgetSoft** est le système maître.
- **Cerbère** est un module de BudgetSoft, spécialisé dans le pilotage quotidien et la trésorerie à court terme.
- **Cerbère Express** est une vue / sous-module spécialisé de Cerbère.
- Une règle propre à Cerbère ne devient jamais implicitement une règle générale de BudgetSoft.
- Cerbère Express hérite de la supradoctrine BudgetSoft puis de la doctrine Cerbère ; il ne peut les contredire que par une règle explicitement validée et strictement limitée à son périmètre.

## 2. Règle générale : date comptable

Sauf doctrine explicitement validée pour un module, **la date comptable est la vérité temporelle commune de BudgetSoft**.

Elle gouverne notamment :

- l'affichage des opérations réalisées ;
- l'affichage des opérations futures ;
- les soldes et soldes prévisionnels bancaires ;
- les historiques et statistiques ;
- les rapprochements et agrégations ordinaires.

Une opération dont la date comptable est future reste une **opération future** dans les modules généraux, même si Cerbère peut déjà la considérer comme engagée selon sa doctrine propre.

## 3. Exception strictement locale : CB dans Cerbère

Cerbère et Cerbère Express sont les seuls modules autorisés à appliquer une lecture anticipée des cartes bancaires à débit différé.

Cette exception répond à la question : **qu'est-ce qui est déjà dépensé / engagé pour le pilotage, même si la banque ne l'a pas encore comptabilisé ?**

Elle ne change jamais :

- la date comptable de l'opération ;
- son statut dans les modules généraux ;
- son appartenance aux opérations futures ;
- la vérité bancaire utilisée par le prévisionnel de trésorerie.

## 4. Double rôle des CB dans Cerbère

Une CB différée possède deux lectures simultanées, sans créer deux opérations.

### 4.1 Rôle analytique / pilotage

La dépense peut consommer une enveloppe pilotable selon sa **date d'achat** et la règle M / M+1 ci-dessous.

### 4.2 Rôle bancaire / trésorerie

La même dépense impacte la trésorerie selon sa **date comptable / date réelle de débit bancaire**.

Le double rôle est intentionnel ; le double comptage est interdit.

## 5. Règle M / M+1 et molettes

Pour une CB déjà engagée :

### CB appliquée à M

- Elle compte dans **M**, qu'elle appartienne ou non à une catégorie pilotée par une molette.
- Si elle relève d'une catégorie à molette, elle consomme en plus l'allocation correspondante de M.
- Si elle ne relève pas d'une molette, elle affecte M sans être transformée artificiellement en dépense pilotable.

### CB appliquée à M+1

- Elle appartient à **M+1** pour son impact de cycle.
- Elle n'affecte le **pilotage de M** que si elle relève d'une catégorie effectivement pilotée par les molettes de M.
- Si elle n'est pas contrôlée par une molette, elle ne doit pas être imputée artificiellement au pilotage de M.

En résumé :

| Situation | Effet sur M | Effet sur M+1 | Molette M |
|---|---|---|---|
| CB appliquée à M, pilotable | oui | seulement impact bancaire éventuel, sans double catégorie | oui |
| CB appliquée à M, hors molette | oui | seulement impact bancaire éventuel, sans double catégorie | non |
| CB appliquée à M+1, pilotable dans M | oui pour le pilotage | oui pour l'impact du cycle | oui |
| CB appliquée à M+1, hors molette | non pour le pilotage | oui | non |

Le code ne doit donc jamais réduire cette logique à un simple booléen `appartientAuMois`.

## 6. Une opération, plusieurs lectures

`Operations` reste l'unique base du Réel. Une CB ne doit jamais être dupliquée pour matérialiser son double rôle.

La même opération peut simultanément être :

- **future bancaire = oui** ;
- **engagée Cerbère = oui** ;
- **consommée dans une molette = oui ou non** selon sa catégorie et le cycle visé.

Les règlements techniques / agrégés de carte ne doivent pas recréer une dépense économique déjà portée par les achats unitaires.

## 7. Solde prévisionnel bancaire

Le solde prévisionnel appartient à la doctrine générale BudgetSoft, pas à la doctrine spéciale d'engagement Cerbère.

Conceptuellement :

`solde bancaire de référence + somme des flux futurs connus jusqu'à la date cible, selon leur date comptable`

Conséquences :

- une opération future au 07/09 doit affecter le solde prévisionnel au 07/09 ;
- elle ne doit pas apparaître comme opération réalisée le 05/09 ;
- le fait qu'une CB soit déjà engagée pour Cerbère ne la rend pas comptabilisée dans les autres modules.

## 8. Principe obligatoire de développement

**Aucun correctif ni développement ne doit être réalisé isolément.**

Avant modification du code, appliquer cet ordre de contrôle :

1. **Supradoctrine BudgetSoft** — invariants communs.
2. **Doctrine du module concerné** — règle spécialisée éventuelle.
3. **Doctrine du sous-module** — si le module possède une vue spécialisée, par exemple Cerbère Express.
4. **Effets de bord sur les modules frères** — vérifier explicitement qu'une exception locale ne fuit pas vers eux.

Une correction est considérée correcte seulement si elle respecte ces quatre niveaux.

## 9. Arbitres communs plutôt que règles recopiées

Les décisions structurantes doivent progressivement être centralisées dans des arbitres communs, puis consommées par les modules selon leur doctrine, par exemple :

- opération comptabilisée à une date ;
- opération future à une date ;
- identification d'une CB ;
- date d'achat métier ;
- cycle bancaire d'impact ;
- engagement Cerbère ;
- impact CB sur M ;
- impact CB sur M+1 ;
- impact CB sur une molette ;
- calcul du solde prévisionnel bancaire.

Le but est d'éviter que Cerbère, Cerbère Express, Opérations et Trésorerie prévisionnelle réimplémentent chacun une définition différente de `future`, `engagée`, `M`, `M+1` ou `débitée`.

## 10. Contrôles de non-régression obligatoires

Toute modification liée aux dates ou aux CB doit au minimum vérifier simultanément :

- qu'une opération future reste cachée de la liste des opérations réalisées jusqu'à sa date comptable ;
- qu'elle apparaît bien dans les opérations futures ;
- qu'elle entre dans le solde prévisionnel à la bonne date comptable ;
- que Cerbère peut néanmoins reconnaître son engagement anticipé si elle répond à sa doctrine CB ;
- que M / M+1 sont correctement distingués ;
- que les molettes ne reçoivent que les dépenses qui leur appartiennent ;
- qu'aucune CB n'est comptée deux fois ;
- que Cerbère Express restitue les mêmes vérités Cerbère que son module parent, avec seulement sa spécialisation d'affichage / synthèse.
