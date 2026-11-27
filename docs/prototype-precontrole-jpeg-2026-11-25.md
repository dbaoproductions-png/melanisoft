# Prototype facultatif — précontrôle exploratoire JPEG

Date : 25 novembre 2026  
Portée : branche `audit/melanisoft-non-regression-2026-11-20`, **hors production**, **hors ISO**.

## Fonctionnement

Après **Analyser la livraison**, utiliser le nouveau bouton **Analyser les JPEG de la livraison**. L'outil travaille **localement**, sur tous les JPEG documentaires identifiés dans le dossier déjà sélectionné. Les mires sont exclues.

- Un JPEG est décodé à la fois avec les fonctions graphiques du navigateur (`createImageBitmap`, `canvas`). Le moteur réduit la plus grande dimension à **560 pixels** pour limiter le coût mémoire et processeur. Il libère les bitmaps à chaque itération.
- L'analyse utilise une représentation en niveaux de gris et mesure :
  1. **Orientation inhabituelle (90° possible)** : asymétrie prononcée des gradients horizontal/vertical. Ce n'est pas une détection OCR ; **une page tournée à 180° ne peut pas être détectée de façon fiable**.
  2. **Inclinaison probable** : recherche de la direction maximisant la projection horizontale de l'encre entre -5° et +5° ; alerte indicatrice si l'angle atteint 2,5° avec amélioration significative du score (> 1,14). Une illustration, une page structurée en tableaux, un titre vertical ou une impression oblique d'origine peuvent entraîner des faux positifs.
  3. **Netteté atypique** : indice de hautes fréquences (différences de Laplacien), comparé à la médiane des autres JPEG analysables **du même titre**. Le signal est émis si au moins huit mesures valides existent, si la médiane dépasse un plancher d'information et si le score est inférieur à 32 % de cette médiane. Il ne prouve pas un flou de numérisation.
- Des images trop petites, presque sans texte ou à contraste insuffisant sont marquées **NON VÉRIFIABLE**, jamais conformes par défaut.
- Un JPEG dont le navigateur ne sait pas décoder les pixels est indiqué **NON ANALYSÉ**, sans arrêter l'analyse des autres fichiers.
- Bouton **Arrêter le précontrôle** et progression explicite. Une annulation ne conserve **aucun résultat partiel**.
- Le résultat est consultable dans l'interface et exportable au format `Melanisoft_precontrole_JPEG.csv`, avec une ligne par fichier et les indices numériques mesurés.

## Isolation du calcul ISO

Le précontrôle est **facultatif et séparé**. Il ne modifie ni `anomalies`, ni `controls`, ni la sélection de l'échantillon ISO, ni les huit champs de contrôle manuel du fichier ALÉA, ni les seuils Ac/Re, ni le nom du contrôleur. Son résultat est une aide au tri et non un verdict de conformité. Le rapport TXT résume l'étape avec la mention explicite « hors ISO » uniquement si elle a été exécutée.

## Recette à réaliser sur fichiers réels

1. Dans la version de test de Mélanisoft, sélectionner de nouveau le disque du **Supplément agricole du Télégramme** et lancer l'analyse classique (401 JPEG/401 TIFF attendus dans le dernier essai).
2. Cliquer **Analyser les JPEG de la livraison**, laisser terminer ou interrompre volontairement pour vérifier le bouton d'arrêt.
3. Exporter le CSV complet des JPEG. Comparer les lignes suspectes avec les images réelles : orientation, inclinaison, netteté et distinction des défauts de l'original.
4. Consigner le nombre de faux positifs, de défauts manqués, d'images non vérifiables et la durée du traitement. Ajuster les seuils **après** analyse ; ne pas assimiler les valeurs numériques actuelles à des seuils métier validés.
5. Pour les TIFF, conserver le chantier de décodage graphique séparé ; les mesures JPEG ne prouvent pas la qualité du TIFF correspondant.

## Non-régression

Tests automatisés avec images synthétiques pour la rotation de 90°, l'inclinaison de 3,5°, une image rendue floue, une image presque vide, une erreur de décodage, les résultats séparés par titre, le résumé des suspects et l'indépendance du workflow ISO. Cela **ne remplace pas** une recette visuelle sur les véritables images de la livraison.

**Ne pas fusionner dans `main` sans validation de la recette humaine.**
