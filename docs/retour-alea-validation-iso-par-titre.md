# Mélanisoft — Retour du contrôle visuel ALÉA et décision ISO par titre

**Date :** 20 novembre 2026  
**Portée :** branche d'audit, pas encore en production.  
**Guide métier :** *Le contrôle des données numérisées*, Occitanie Livre & Lecture, juillet 2025, pages 13 à 22 (échantillonnage, contrôles visuels et exceptions).

## Nouveau circuit de contrôle

1. Analyser la livraison et vérifier les anomalies automatiques.
2. Exporter **Melanisoft_echantillon_controle_visuel.xlsx** : chaque vue logique de l'échantillon n'apparaît qu'une fois, avec TIFF prioritaire et JPEG de repli.
3. Renseigner pour chaque vue les huit colonnes **I à P**, exclusivement avec **Conforme** ou **NC**, en appliquant les règles du guide (cadrage, lisibilité, exemplarisation, etc.).
4. Utiliser **Q** pour signaler des défauts de l'original ou contraintes matérielles, **R** pour des commentaires. Une information en Q ne neutralise pas automatiquement une NC en I:P.
5. **Ne pas modifier** le numéro de tirage, le titre, le nom de fichier, le chemin, les paramètres du plan ISO ou l'**identifiant de tirage (colonne S)**.
6. Dans Mélanisoft, renseigner le nom du contrôleur, sélectionner le XLSX rempli et cliquer **Importer les résultats visuels**.
7. Consulter la **décision statistique par titre** dans l'interface et dans le rapport TXT.

## Calcul des décisions (NQA 1 %, niveau général II)

- Une vue compte au maximum **une unité non conforme**, même lorsque plusieurs critères I:P sont marqués NC.
- **Les huit critères doivent être renseignés** sur chaque ligne pour que la vue soit considérée comme contrôlée.
- Une ligne absente, répétée, étrangère au tirage, modifiée dans ses références, contenant une valeur inconnue ou un autre identifiant de tirage **invalide l'import** (aucun verdict).
- Si le fichier est structurellement valide mais qu'il reste des cases vides, le titre concerné est **EN ATTENTE**.
- Lorsque toutes les vues du titre ont été évaluées : **ACCEPTATION STATISTIQUE** si les vues non conformes sont au plus au seuil Ac ; **REJET STATISTIQUE** si elles atteignent le seuil Re.
- **Ces décisions décrivent le résultat de l'échantillon seulement.** Elles ne valent pas réception définitive de la livraison ni validation des autres contrôles automatiques, documentaires et humains.

**Exemple explicitement donné par le guide :** titre de 45 000 vues → lettre N, échantillon de 500, Ac 10 et Re 11. Une feuille entièrement renseignée avec 10 vues NC donne une acceptation statistique ; avec 11, un rejet statistique.

## Garde-fous et traçabilité

- L'ID de tirage est renouvelé à chaque nouvelle analyse. Un résultat provenant d'un ancien tirage ne peut pas être réimporté automatiquement.
- Le nom du contrôleur est obligatoire dans l'interface d'import.
- Les changements de fichier ALÉA ou de contrôleur invalident les résultats affichés précédemment.
- Un nouveau dossier ou une nouvelle analyse réinitialise le résultat visuel en mémoire.
- Le traitement reste local dans le navigateur ; **aucune donnée du fichier de contrôle n'est téléversée** par le moteur HTML.
- Le rapport TXT rappelle l'ID du tirage, le nom du contrôleur, la date d'import, les résultats par titre et les seuils utilisés.

## Tests ajoutés au banc de non-régression

- Deux titres distincts ; chacun obtient une décision indépendante.
- Plusieurs critères NC pour une même vue = **1 seule vue NC**.
- Fichier incomplet : décision **EN ATTENTE**, jamais acceptation.
- Ancien ID, titre altéré, ligne manquante, chemin étranger, doublon, valeur hors liste : **import refusé**.
- Note d'original seule = **0 vue NC** ; note d'original et case NC explicite = **1 vue NC**.
- 45 000 vues, 500 contrôlées : **10 NC = acceptation statistique ; 11 = rejet statistique**.
- Export XLSX : nouvelle colonne **S « ID de tirage »**, conservant les colonnes I:P et leurs listes de validation.

## Limitations et prochaines vérifications

1. **Recette de bout en bout sur navigateur / Excel :** tests du moteur sur tableaux synthétiques et vérification structurelle du XLSX exporté. Vérifier encore la réimportation d'un classeur effectivement rempli puis enregistré par les versions d'Excel utilisées au service.
2. **Persistance :** les résultats importés ne sont conservés que durant la session de navigateur et dans le rapport TXT exporté. Il faudra concevoir une sauvegarde explicite ou un dossier de contrôle si nécessaire.
3. **Acceptation finale :** les NC détectées automatiquement ne sont pas injectées dans le résultat visuel. Leur analyse et les arbitrages du contrôleur restent indépendants et nécessaires.
4. **Exceptions :** pour une NC finalement jugée imputable à l'original, le contrôleur doit corriger explicitement la case correspondante et justifier son jugement dans Q/R.
5. **Norme :** le guide donne l'exemple chiffré et les paramètres de sélection. Le décompte par **vue non conforme** est un choix de mise en œuvre à valider avec le protocole qualité de l'établissement avant tout usage comme décision formelle de réception.

Ne pas fusionner avant recette utilisateur et contrôle sur une livraison réelle.
