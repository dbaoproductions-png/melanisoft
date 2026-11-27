# Recette sur disque : Supplément agricole du Télégramme — 24 novembre 2026

## Fichiers exploités

Exports de Mélanisoft des essais du 24 novembre 2026 : rapports TXT, fichiers ALÉA et points d'attention ; récolement de livraison OLL. **Les fichiers originaux ne sont pas publiés dans GitHub.** Les chiffres ci-dessous proviennent de l'analyse des fichiers fournis par le contrôleur.

## Évolution observée entre les exécutions

| Indicateur | Essais de 14 h 50 et 15 h 05 | Essai de 15 h 07 |
|---|---:|---:|
| Fichiers inventoriés | 803 | 803 |
| JPEG | 401 | 401 |
| TIFF | 401 | 401 |
| Fascicules logiques | 80 (double comptage JPEG/TIFF) | **40** |
| Lignes du récolement reconnues | 41 | **40** |
| Alertes brutes | 199 | **106** |
| Erreurs signalées | 0 | 0 |
| Plan ISO | 401 vues, code H, 50 vues, Ac 1/Re 2 | Inchangé |

Le fichier ALÉA du troisième essai comporte 50 **chemins TIFF distincts** et un seul identifiant de tirage `ISO-mwurlw7r-9b78pngm`. Les huit critères visuels sont encore vides : **aucun résultat d'acceptation du lot n'est acquis**. L'échantillon de métadonnées comprend 50 JPEG et 50 TIFF.

Le fichier de points d'attention du troisième essai comprend **31 groupes** totalisant **106 alertes brutes**. Le résumé par nature, généré à partir des groupes, était encore incorrect : il attribuait plusieurs fois les mêmes occurrences à des catégories distinctes. Correction sur la branche d'audit : les occurrences par nature sont désormais calculées **sur les anomalies individuelles**.

## Résultats métier encore à instruire

1. **IPTC Source (100 occurrences dans l'échantillon)** : le récolement porte « Bibliothèque municipale de Toulouse » et les métadonnées des images portent « Bibliothèque d'Etude et du Patrimoine de Toulouse ». La différence est textuelle et vérifiée par l'application sur 50 JPEG + 50 TIFF. Son acceptabilité nécessite une décision humaine selon le cahier des charges. Aucune équivalence silencieuse n'est programmée.
2. **Écart initial/prestataire (fascicule du 3 mars 1901, ligne Excel 46)** : 8 pages initiales / 9 fichiers produits. La **colonne d'observations de l'original** mentionne une feuille supplémentaire datée du 3 mars ; elle doit être visible dans les exports et sert à expliquer l'écart sans en prononcer automatiquement la conformité. Le nommage et la présence de la neuvième vue restent à vérifier.
3. **Périodicité** : intervalle de 14 jours entre le 21 octobre et le 4 novembre 1900. À examiner comme possible numéro manquant, publication non parue ou événement éditorial, pas comme « vues en trop ».
4. **Décodage TIFF** : les 50 TIFF tirés n'ont pas pu être décodés **graphiquement par le navigateur** pour l'histogramme. L'analyse des en-têtes et des métadonnées peut fonctionner indépendamment. Ce n'est pas une preuve de corruption des 50 fichiers. À comparer avec un logiciel de lecture TIFF dédié.

## Corrections supplémentaires de l'audit

- Les catégories « métadonnées IPTC », « récolement » et « périodicité » comptent uniquement leurs **propres anomalies individuelles**, pas le total du groupe auquel elles appartiennent.
- L'**observation de l'original** et l'**observation du prestataire** sont conservées **séparément** dans les exports Excel et le rapport HTML/TXT, avec une référence à la ligne du récolement.
- Des tests vérifient explicitement la feuille supplémentaire du 3 mars (ligne 46) dans l'export des points d'attention et le calcul sans multiplication des alertes.
- Le nombre de fascicules reste calculé sur les **vues logiques**, sans compter deux fois JPEG et TIFF ; les lignes de synthèse ne comptent pas comme fascicules.

## Précautions

- Les corrections postérieures à l'essai de 15 h 07 sont **testées sur fixtures synthétiques**, pas encore confirmées par une nouvelle exécution sur le disque réel.
- Aucun changement n'a été fusionné dans `main`.
- La nouvelle interface doit encore être recettée dans un navigateur réel avec un XLSX rempli puis réimporté. La lecture/décodage du TIFF ne peut pas être attestée par les seuls en-têtes.
