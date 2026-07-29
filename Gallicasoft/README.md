# GALLICASOFT

GALLICASOFT compare le récolement final d’un prestataire de numérisation avec le fichier « état des livraisons » fourni par la BnF afin de contrôler l’intégration dans Gallica.

## Utilisation

1. Ouvrir `Gallicasoft_VERT.html` dans un navigateur récent. Ce nom distinct évite la réutilisation en cache de l’ancienne interface rose.
2. Sélectionner le récolement prestataire au format XLSX, CSV ou ZIP contenant un seul XLSX.
3. Sélectionner l’état Gallica au format XLSX ou CSV.
4. Vérifier les feuilles détectées automatiquement.
5. Lancer la comparaison.
6. Examiner les points d’attention et compléter le contrôle manuel sur l’échantillon.
7. Exporter le rapport HTML ou le classeur Excel.

Les fichiers sont traités localement dans le navigateur et ne sont pas envoyés sur un serveur.

## Contrôles automatiques

- détection des feuilles et des colonnes utiles ;
- prise en charge des dates Excel postérieures à 1900 et des dates textuelles antérieures à 1900 ;
- comparaison du nombre de fascicules ;
- comparaison du nombre total de pages ;
- recherche bidirectionnelle des dates attendues et intégrées ;
- déduction de la périodicité probable de chaque titre (quotidienne, hebdomadaire, mensuelle, etc.) ;
- regroupement des fascicules attendus non retrouvés en ruptures de régularité du calendrier ;
- extraction de l’année de tomaison, de l’édition éventuelle et du numéro de fascicule ;
- signalement des tomaisons absentes, mal structurées, répétées ou chronologiquement incohérentes ;
- signalement des dates Gallica absentes ou illisibles ;
- signalement des dates associées à plusieurs fascicules ;
- comparaison des pages produites et des pages valides par fascicule apparié ;
- contrôle des ID document numérique, URL Gallica, titre, cote et origine de la collection ;
- recherche des ID et URL dupliqués.

Une ligne Gallica sans date n’est jamais appariée arbitrairement à un fascicule attendu. Le rapport indique explicitement que certaines dates attendues non retrouvées peuvent correspondre à ces lignes non appariables.

## Contrôles manuels

Le guide 2024 demande une revue visuelle du calendrier et, sur une dizaine de fascicules, la concordance :

- du titre ;
- de la date ;
- de la tomaison ;
- de l’établissement de conservation ;
- de la cote.

Le contrôle automatique de la tomaison vérifie sa structure et sa cohérence interne. La concordance exacte de l’année, de l’édition et du numéro avec les mentions imprimées sur le fascicule reste un contrôle visuel.

Le classeur exporté contient les feuilles `Synthese`, `Regularite`, `Tomaisons`, `Points_attention`, `Echantillon_manuel` et `Consignes`.

## Jeu de référence 2022

Avec les fichiers fournis pour la campagne Arkhenum 2022, le résultat attendu est :

- 5 447 fascicules attendus ;
- 5 446 lignes Gallica ;
- 26 106 pages attendues ;
- 26 092 pages valides ;
- 34 lignes Gallica sans date exploitable ;
- 2 écarts certains de pagination ;
- 307 tomaisons à vérifier, dont 75 avec défaut de structure (45 valeurs absentes) et 232 présentant au moins une incohérence chronologique ;
- 378 points d’attention au total.

## Test

```bash
node Gallicasoft/tests/gallicasoft-core.test.cjs chemin/recolement.zip chemin/etat-gallica.xlsx
```
