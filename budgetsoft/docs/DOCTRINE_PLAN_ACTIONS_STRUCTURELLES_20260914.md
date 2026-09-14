# Doctrine Plan — actions structurelles et rapprochement bancaire

Version : 2026-09-14.1

## Principe

BudgetSoft distingue deux objets qui ne se clôturent pas de la même manière :

1. **Événement financier** : dépense ou recette prévue représentant un flux bancaire futur. Il reste prévisionnel tant qu'une opération réelle ou un rapprochement confirmé n'en apporte pas la preuve. Sa clôture normale est donc le **rapprochement bancaire**.
2. **Action structurelle** : décision ou acte qui modifie durablement une donnée canonique, par exemple résilier un abonnement, réduire un contrat ou remplacer une charge fixe. Sa clôture normale est la **réalisation de l'action**, pas le rapprochement bancaire de l'action elle-même.

Une action structurelle ne doit jamais être ajoutée une seconde fois au calcul financier lorsqu'un propriétaire canonique porte déjà son effet durable.

## Cas SUPPRIMER sur une charge fixe

Pour une action `SUPPRIMER` reliée à `Charges_fixes` :

- le Plan conserve l'action, son statut, sa date de réalisation et le gain obtenu ;
- lorsque l'action est explicitement réalisée (`Effective` côté donnée, affiché `Réalisée` côté UI), elle est considérée comme accomplie sans attendre un futur débit bancaire ;
- si `impact_confirme` et `reevaluer_charges_fixes` sont activés, la charge fixe liée est clôturée par sa `date_fin` ;
- le prochain cycle de calcul doit alors lire le nouveau montant de `Charges_fixes` ;
- l'action du Plan reste informative et mesurable mais **n'ajoute pas son économie une seconde fois à Pn**.

L'absence ultérieure de débit peut servir de contrôle de cohérence, mais ne constitue pas le mécanisme de clôture d'une résiliation déjà déclarée réalisée.

## Exemple Deezer

Si Deezer vaut 11,99 € par mois et qu'aucun prélèvement ne doit appartenir au cycle du 28/09/2026 au 27/10/2026 :

- l'action « Résilier Deezer » doit être passée à `Réalisée` avec la date réelle de résiliation ;
- la ligne Deezer de `Charges_fixes` doit recevoir une date de fin correspondant à sa dernière période payée ;
- Deezer ne doit alors plus entrer dans CF2 ;
- le bloc Actions peut conserver l'information « Résilier Deezer — Réalisée — 11,99 €/mois économisés », sans bouton de rapprochement bancaire.

Avec les valeurs de référence observées lors du contrôle :

- CF2 : 2 666,53 € − 11,99 € = **2 654,54 €** ;
- P2 : 1 282,10 € + 11,99 € = **1 294,09 €**.

Ces deux valeurs sont les résultats attendus après mise à jour effective de la donnée canonique ; elles ne doivent pas être obtenues en ajoutant directement l'action du Plan à la formule de P2.

## Garde de cohérence

`auditerActionsStructurellesPlan20260914()` contrôle les actions `SUPPRIMER` réalisées et reliées à une charge fixe. Une action réalisée dont la charge fixe liée n'a aucune date de fin est signalée comme non conforme.
