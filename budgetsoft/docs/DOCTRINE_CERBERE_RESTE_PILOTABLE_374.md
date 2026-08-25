# Cerbère 3.7.4 — doctrine du reste réellement pilotable

Ce complément est normatif et complète `DOCTRINE_BUDGETSOFT.md`.

## Indicateur principal du cockpit

Cerbère est un outil de décision quotidienne. Son indicateur principal n'est pas le bilan de consommation des enveloppes mais la réponse à la question : **combien puis-je encore engager raisonnablement d'ici au 27 compte tenu de ce que l'on sait maintenant ?**

### REt1 — reste des enveloppes

`REt1 = P1 − pilotable déjà consommé − pilotable futur réservé`

REt1 est un indicateur de comparaison entre le budget local P1 et son exécution. Il est utile au contrôle et au futur module Analyses, mais il n'est pas le grand chiffre du cockpit.

### Variations depuis la construction de P1

Cerbère calcule uniquement les variations qui modifient la capacité du cycle par rapport aux hypothèses qui ont servi à établir P1 :

- `ΔRt1` : écarts de recettes par rapport à R1/P1 (réel différent du prévu, recette nouvelle, renfort de trésorerie, Action ou Événement de recette) ;
- `ΔCFt1` : économie ou surcoût des charges fixes par rapport à CF1 ;
- `ΔAt1` : autres variations explicites de liquidité non déjà comptées dans REt1, Rt1 ou CFt1.

Les recettes normales déjà intégrées à R1 ne sont jamais ajoutées une deuxième fois.

### RPt1 — reste réellement pilotable

`RPt1 = REt1 + ΔRt1 + ΔCFt1 + ΔAt1`

RPt1 est le **grand chiffre Cerbère**. Il doit être libellé **Reste réellement pilotable** et répondre directement à la décision quotidienne.

Une recette exceptionnelle ou un crédit de trésorerie peut donc redonner de l'air à RPt1 sans modifier P0. Un surcoût de charge fixe le réduit. P0 reste maître ; P1 reste l'allocation locale décidée pour le cycle.

## Actions et Événements

Actions et Événements pondèrent les prévisions de période. Tant qu'ils sont prévisionnels et suffisamment confirmés, ils participent aux variations ou réservations correspondantes. Lorsqu'ils sont rapprochés d'une opération réelle, le Réel remplace intégralement la prévision : **jamais Prévision + Réel**.

Une Action/Événement pilotable futur confirmé réserve l'enveloppe et entre dans REt1. Une Action/Événement de recette ou de charge fixe modifie le delta correspondant. Une opération réelle rapprochée prend ensuite seule la place de cette prévision.

## Affichage

Le cockpit met en avant RPt1. Les indicateurs de comparaison P1/réel, R1/réel et CF1/réel sont secondaires : ils peuvent être accessibles par un bouton d'information/contrôle et nourrir ultérieurement l'onglet Analyses.

Le contrôle `SHBt1 ↔ SC-présent` et la trajectoire `SCt1` restent des contrôles de cohérence/soutenabilité ; ils ne remplacent pas RPt1 comme consigne quotidienne.