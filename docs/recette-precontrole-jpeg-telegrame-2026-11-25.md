# Recette sur fichiers réels : précontrôle JPEG — Supplément agricole du Télégramme
Date : 25 novembre 2026.

## Données contrôlées
CSV de précontrôle du titre transmis pour analyse (non publié ici). 401 lignes correspondant aux 401 JPEG de la livraison réelle. Les fichiers JPEG originaux ne sont pas inclus dans le CSV ; aucune conclusion directe sur leur qualité visuelle ne peut donc être tirée de cette seule pièce.

| Résultat CSV (avant ajustement) | Valeur |
|---|---:|
| JPEG traités | 401 |
| « Aucun indice détecté » | 393 |
| « À vérifier » | 8 |
| « Non vérifiable » / « Non analysé » | 0 / 0 |
| Alerte rotation 90° | 0 |
| Alerte inclinaison | 0 |
| Alerte netteté | 8 |

## Anomalies constatées dans le **prototype**
- **Inclinaison non déterminée** : les 401 lignes portent exactement `0°` et un indice `1`. Une valeur optimale identique à la projection de référence n'est pas une mesure probante de 0°. L'affichage « 0° » pouvait faire croire, à tort, que toutes les pages étaient horizontales.
- **Netteté sensible à la position de vue** : la médiane de netteté est de 648,9 pour le titre, mais de 505,3 pour les vues 0004 (n=40), 295,8 pour les 0009 (n=21) et 280,9 pour les 0012 (n=20). Ces différences de contenu ou de mise en page peuvent abaisser l'indice indépendamment du flou.
- **Huit vues à examiner** :
  * vue 0004 : 27 mai, 3 juin, 10 juin, 17 juin, 24 juin et 7 octobre 1900 (six vues), avec indices 169,1 à 194,7, soit environ 33 à 39 % de la médiane des vues 0004 ;
  * vue 0009 : 23 septembre 1900, indice 192,2, soit environ 65 % de la médiane des vues 0009 ;
  * vue 0012 : 23 septembre 1900, indice 194,5, soit environ 69 % de la médiane des vues 0012.

## Corrections issues de la recette
1. Le champ `Inclinaison estimée (°)` reste **vide (non mesuré)** lorsque le maximum de projection ne dépasse pas de 14 % le score à 0°. Le nombre d'images dont l'inclinaison a réellement été estimée est indiqué dans le résumé. **Ne jamais transformer « non mesuré » en « 0° »**.
2. Les huit indices de netteté restent des **pistes de contrôle**, pas des NC. Le CSV fournit désormais la médiane de comparaison pour les vues de même numéro (si au moins huit vues comparables), un ratio et une explication contextuelle.
3. Le fichier CSV comprend quatre colonnes supplémentaires : numéro de vue, ratio de netteté par même numéro, commentaire de contexte et indicateur « Inclinaison mesurable ».
4. Le moteur ISO, le tirage ALÉA, les seuils Ac/Re et les contrôles humains restent séparés de cette analyse exploratoire.

## Recette à suivre
Contrôler visuellement les huit JPEG signalés, particulièrement les six vues 0004, en comparant chaque image à la même page dans les fascicules voisins et au TIFF correspondant. Noter : flou de prise de vue, faible contenu graphique normal, défaut d'impression original ou indéterminé. Vérifier également quelques pages choisies au hasard **non signalées** pour estimer les défauts manqués. Puis relancer le précontrôle mis à jour sur la même livraison et comparer l'export CSV.

**État** : modification validée par les tests automatisés, mais **non encore revalidée avec le disque réel** ; ne pas fusionner dans `main` sans cette recette.
