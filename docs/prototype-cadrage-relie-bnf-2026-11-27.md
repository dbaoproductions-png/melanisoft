# Précontrôle exploratoire de cadrage — mode relié (27 novembre 2026)

## Référence documentaire

BnF, *Référentiel de numérisation des documents opaques*, version 3, 11 juillet 2014, règle 7 « Présentation de la page et cadrage », **page 16/60**. Dans la partie **documents à traiter en mode relié**, le référentiel prévoit la reproduction de la page intégrale, avec dépassement des bords extérieurs pour éviter toute information coupée. Il prévoit aussi un cadrage serré au **fond de cahier** lorsque le texte de la page opposée serait parasite. Pour les imprimés **présentés en feuilles** mais traités en mode relié, l'intégralité de la feuille et des bords extérieurs doit être visible. 

**Ne pas appliquer les débordements de 2 mm à 1,5 cm** : ceux-ci apparaissent dans le référentiel **en mode pièce**, et non dans cette prescription relative au mode relié. La règle 8, **page 17**, indique une page par image par défaut, avec des exceptions, notamment pour les illustrations occupant deux pages. Cette seconde règle n'est pas implémentée par le présent prototype.

Le choix métier confirmé pour Mélanisoft est **mode relié pour l'intégralité des documents**. Aucune bascule vers un autre mode n'est proposée dans ce prototype.

## Fonctionnement

Le précontrôle JPEG existant propose désormais une estimation des bords du papier, en parallèle des mesures exploratoires de netteté, orientation et inclinaison. Il ne s'appuie pas sur un décodeur ou un service distant.

1. Décodage local JPEG et réduction à une dimension maximale de 560 pixels, pour préserver la mémoire.
2. Estimation de la couleur du **papier** par une région centrale et du **fond** par les coins ; mesure de différence chromatique `rouge - bleu`. Cette approximation distingue assez bien le papier jauni du fond gris ou blanc.
3. Si cette séparation est trop faible, résultat **NON VÉRIFIABLE**, jamais « Conforme ».
4. Recherche d'une grande région correspondant au papier. Mesure approximative des marges extérieures **en pourcentage de la largeur/hauteur de l'image** ; aucun calcul en millimètres n'est justifié par ce simple aperçu réduit.
5. Si la région estimée touche un bord de l'image, résultat **BORD À EXAMINER**. Cela peut correspondre au **fond de cahier**, à une particularité de montage ou à un cadrage trop serré. Le contrôle ne prononce aucune cause.
6. Si les quatre bords sont distinguables, résultat **BORDS REPÉRÉS**, qui ne prouve pas à lui seul qu'aucune information n'a été coupée.
7. Export CSV avec statut, côtés non isolés, marges en %, interprétation, et reprise dans les rapports HTML/TXT.

**Isolation** : le contrôle ne change ni les anomalies de réception, ni l'échantillon aléatoire, ni les huit critères manuels ALÉA, ni les seuils de décision ISO. Le compteur de bords à examiner est distinct de celui des alertes de netteté.

## Deux pages déjà transmises (repères exploratoires)

Les deux images de référence ont été inspectées localement **sans être publiées dans le dépôt** :

- **27 mai 1900, vue 0004** : séparation du papier très plausible sur les bords gauche, haut et bas ; **bord droit non isolé** dans l'image réduite. Hypothèses concurrentes : proximité du bord, cadrage serré, particularité du document. Ne pas classer « page rognée ».
- **23 septembre 1900, vue 0009** : bords haut, droit et bas probablement visibles ; **bord gauche non isolé**, potentiellement lié au fond de cahier. Ne pas classer « défaut » automatiquement.

Les observations sont des **estimations chromatiques**, à confirmer par inspection des images et, au besoin, des originaux. Elles n'autorisent aucune conclusion de conformité ni de non-conformité.

## Limites et recette à mener

- Les papiers blancs sur fond blanc, les supports très sombres, les fonds similaires au papier ou les montages atypiques peuvent être non vérifiables.
- Une bande claire peut provenir d'une bordure, d'une ombre ou d'un cache ; le prototype ne sait pas prouver qu'un contenu est coupé.
- Il ne distingue pas automatiquement une page indépendante d'une double page, ni ne reconnaît systématiquement le fond de cahier.
- Le même seuil chromatique ne peut pas être garanti pour tous les documents : vérifier les faux positifs et faux négatifs.
- La détection des pages rognées et les mesures en millimètres exigeraient une autre validation avec le gabarit/format physique et la résolution appropriée.
- La recette à mener consiste à analyser les 401 JPEG du Télégramme et confronter le CSV de cadrage aux images physiques : contrôler les côtés signalés, un échantillon de pages « BORDS REPÉRÉS » et plusieurs pages « NON VÉRIFIABLE ».
- Ne fusionner dans `main` qu'après la vérification sur le disque et la décision explicite du responsable.

**Statut** : prototype sur branche d'audit ; tests automatisés sur images synthétiques ; aucun verdict métier automatique.
