# BudgetSoft — Addendum supradoctrine : trésorerie prévisionnelle canonique

> **Normatif — 7 septembre 2026.**

Cet addendum complète `SUPRADOCTRINE_BUDGETSOFT_20260905.md` et rend obligatoire `docs/DOCTRINE_TRESORERIE_PREVISIONNELLE_CANONIQUE_20260907.md` pour tout développement touchant au solde réel, au solde prévisionnel, aux recettes canoniques, aux charges fixes, aux CB différées, au pilotable, au Plan ou aux consommateurs `Comptes`, `Dashboard`, `Cerbère` et `Cerbère Express`.

## Règle hiérarchique

Pour la trésorerie prévisionnelle :

`BudgetSoft supradoctrine -> doctrine canonique de trésorerie -> doctrine du module consommateur`

Aucun module consommateur ne peut définir un calcul divergent.

## Propriétaire unique

Une seule trajectoire bancaire est publiée par BudgetSoft. Les modules consommateurs peuvent la présenter, la filtrer ou l'expliquer, mais ne peuvent pas recalculer un solde bancaire parallèle.

## Contrat anti-régression

Toute modification doit respecter simultanément :

1. un solde réel unique ;
2. une révision globale unique ;
3. un propriétaire unique du prévisionnel ;
4. la décomposition canonique `R0 + CF0 + opérations futures + Plan confirmé + CB différées` ;
5. la hiérarchie `estimation -> Plan confirmé -> engagement connu -> opération réelle -> solde réel` ;
6. l'interdiction de double compter une même réalité ;
7. l'interdiction d'appliquer le pilotable au solde avant le débit CB ;
8. la date comptable comme vérité temporelle commune hors exception Cerbère ;
9. la réconciliation au centime du solde prévisionnel publié ;
10. le refus de publication de toute révision qui échoue à ces contrôles.

## Règle de maintenance

Une correction locale dans Dashboard, Comptes, Cerbère ou Cerbère Express visant seulement à faire « tomber juste » un chiffre est interdite. Toute anomalie doit être corrigée au niveau du propriétaire de la donnée ou de sa règle de remplacement.

Cette règle s'applique à tous les correctifs futurs, même lorsque l'affichage local semble plus simple à modifier.