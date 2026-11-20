# Mélanisoft — Double vérification des métadonnées JPEG/TIFF

**Date :** 20 novembre 2026
**Statut :** implémenté sur la branche d'audit, non fusionné dans `main`.
**Référence :** Guide *Le contrôle des données numérisées* (Occitanie Livre & Lecture, juillet 2025), étape 2 p. 13 : images de préférence en TIFF ; métadonnées sur JPEG **et** TIFF ; contrôle 15 p. 23 : EXIF et IPTC Source/Headline ; contrôle 8 p. 16 : 400 dpi.

## Principe garanti par le code

- L'échantillonnage ISO continue à tirer une **vue logique une seule fois** par titre, sans compter TIFF et JPEG séparément dans la taille du lot.
- La **vue visuelle** reste représentée par le TIFF s'il existe, sinon le JPEG.
- Pour **chaque vue tirée**, le moteur retrouve ses fichiers JPEG et TIFF par combinaison du titre et de l'identité de vue logique. Il analyse les métadonnées de chaque fichier réellement présent, sans inventer le format absent.
- Les vérifications concernent **DPI, EXIF, IPTC Source, IPTC Headline et ICC RGB** pour chacun des formats présents.
- Les anomalies incluent le **chemin du fichier concerné**. Une mauvaise métadonnée uniquement présente sur le JPEG n'est plus masquée par un TIFF correct, et inversement.
- La synthèse et le rapport TXT indiquent **le nombre de fichiers JPEG et TIFF soumis au contrôle**, distinct de la taille en vues de l'échantillon.
- Les exceptions de lecture sont signalées sans empêcher l'analyse de l'autre format. Le contrôle manquant ou en échec ne doit pas être présenté comme conforme.

## Scénarios désormais couverts dans les tests automatisés

1. Une vue avec TIFF + JPEG → **1 vue visuelle**, **2 fichiers de métadonnées**.
2. Mauvaise Source IPTC dans le JPEG, TIFF sain → anomalie sur le **JPEG**.
3. Mauvaise Source IPTC dans le TIFF, JPEG sain → anomalie sur le **TIFF**.
4. JPEG uniquement → **1 fichier de métadonnées**, pas de TIFF fictif.
5. Doublons de référence dans les listes d'entrée → pas de double lecture du même chemin.
6. JPEG corrompu, TIFF sain → erreur isolée sur le JPEG ; le TIFF est quand même analysé.
7. JPEG 300 dpi, TIFF 400 dpi → anomalie de résolution sur le **JPEG uniquement**.
8. Le banc de tests ISO/récolement/export ALÉA existant continue à passer.

## Limites et validations encore nécessaires

- Vérifier sur une **livraison réelle** la diversité des encapsulations EXIF/IPTC/ICC (JPEG APP13/APP2, TIFF IFD, profils ICC fragmentés, BigTIFF non pris en charge) et comparer les résultats à XnView.
- Le contrôleur doit encore réaliser et enregistrer les **contrôles visuels** ; les seuils d'acceptation/rejet ISO ne sont pas encore alimentés automatiquement par des résultats humains.
- Le lanceur `Melanisoft_v1_1.html` lit encore le code de la branche `main` et peut modifier dynamiquement une fonction IPTC ; il **ne doit pas être considéré comme une démonstration de la branche d'audit**.
- La sécurité du chargement, la reproductibilité du tirage et la performance sur de très grands ensembles restent à évaluer.

**Conclusion :** correction métier en place sur la branche d'audit et tests synthétiques réussis. Cela ne vaut pas recette de production ni validation intégrale du guide.
