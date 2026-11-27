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
5. **Correction métier apportée après recette** : une page **intérieure** de ce lot en mode relié a **trois marges extérieures** ; le quatrième côté est le fond de cahier. Seules la **première et la dernière vue du fascicule** sont évaluées avec quatre bords extérieurs attendus.
6. Le programme déduit le **sens de la reliure pour chaque titre** de la régularité des vues intérieures : si les observations sont assez nombreuses et cohérentes (au moins trois observations par parité et au moins 80 % de concordance), il identifie le côté du fond de cahier. Il **ne présume pas** que le côté droit correspond toujours aux vues paires sur tous les corpus.
7. Si le seul bord non isolé est **le fond de cahier attendu**, résultat **FOND DE CAHIER ATTENDU** et **aucune alerte de cadrage**. Les marges du côté de reliure ne sont pas chiffrées en « marge manquante ».
8. Si un bord **extérieur** n'est pas isolé, ou si une page intérieure présente quatre bords isolés de manière inhabituelle, résultat **À EXAMINER**, sans conclure à un rognage. Si le sens de reliure n'est pas déductible, résultat **RELIURE À CONFIRMER**. Une séparation papier/fond insuffisante donne **NON VÉRIFIABLE**.
9. Export CSV enrichi avec côté du fond de cahier, nombre de marges extérieures attendues (3/4), espaces mesurés seulement sur les côtés extérieurs et interprétation métier ; synthèse HTML/TXT distincte des alertes de netteté et du résultat ISO.

**Isolation** : le contrôle ne change ni les anomalies de réception, ni l'échantillon aléatoire, ni les huit critères manuels ALÉA, ni les seuils de décision ISO. Le compteur de bords à examiner est distinct de celui des alertes de netteté.

## Deux pages déjà transmises (repères exploratoires)

Les deux images de référence ont été inspectées localement **sans être publiées dans le dépôt** :

- **27 mai 1900, vue 0004** : trois marges extérieures probablement visibles (gauche, haut, bas). Le **côté droit** correspond au fond de cahier attendu dans ce titre.
- **23 septembre 1900, vue 0009** : trois marges extérieures probablement visibles (droite, haut, bas). Le **côté gauche** correspond au fond de cahier attendu dans ce titre.

Les observations sont des **estimations chromatiques**, à confirmer par inspection des images et, au besoin, des originaux. Elles n'autorisent aucune conclusion de conformité ni de non-conformité.

## Limites et recette à mener

- Les papiers blancs sur fond blanc, les supports très sombres, les fonds similaires au papier ou les montages atypiques peuvent être non vérifiables.
- Une bande claire peut provenir d'une bordure, d'une ombre ou d'un cache ; le prototype ne sait pas prouver qu'un contenu est coupé.
- Il ne distingue pas automatiquement une page indépendante d'une double page. Le fond de cahier n'est **déduit** que si l'alternance des côtés est suffisamment régulière ; cette déduction n'est pas une reconnaissance visuelle certaine du pli.
- Le même seuil chromatique ne peut pas être garanti pour tous les documents : vérifier les faux positifs et faux négatifs.
- La détection des pages rognées et les mesures en millimètres exigeraient une autre validation avec le gabarit/format physique et la résolution appropriée.
- La recette à mener consiste à relancer l'analyse des 401 JPEG du Télégramme et à contrôler les **quatre cas intérieurs atypiques** et les **44 vues non vérifiables**. Examiner également des cas déclarés « fond de cahier attendu » pour mesurer les faux négatifs.
- Ne fusionner dans `main` qu'après la vérification sur le disque et la décision explicite du responsable.

**Statut** : prototype sur branche d'audit ; tests automatisés sur images synthétiques ; aucun verdict métier automatique.

## Correction validée à partir du CSV du disque réel — 27 novembre 2026

Le CSV `Melanisoft_precontrole_JPEG (2).csv` transmis pour la recette (conservé hors dépôt) comprend **401 vues et 40 fascicules** : 20 fascicules à 12 vues, 19 à 8 vues et un à 9 vues.

Le détecteur initial signalait **298 bords non isolés** comme devant être examinés. Le diagnostic croisé par rang montre que **152 sont à droite des vues intérieures paires et 146 à gauche des impaires**, exactement aux côtés du fond de cahier. La correction supprime donc l'interprétation erronée « marge extérieure manquante ».

| Résultat observé dans le CSV initial | Après réinterprétation métier (attendu avant nouvelle exécution) |
|---|---:|
| Fond de cahier attendu sur les vues intérieures | **298** |
| Première/dernière vue, quatre bords repérés | **55** |
| Vues intérieures à quatre bords apparents, à examiner | **4** |
| Séparation chromatique impossible / non vérifiable | **44** |
| Total | **401** |

Ces chiffres correspondent à **une réinterprétation des mesures déjà enregistrées**, reproduite par un test automatisé synthétique. Ils **ne constituent pas une nouvelle analyse des pixels du disque**. Une nouvelle exécution dans le navigateur reste nécessaire.

L'algorithme ne classe pas automatiquement les quatre cas atypiques comme non conformes. Les 44 vues dont le contour n'est pas mesurable restent inconnues, et non « conformes ». Les contrôles et seuils ISO/ALÉA sont inchangés.
