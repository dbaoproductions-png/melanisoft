# Audit de conformité de Mélanisoft au guide métier (juillet 2025)

Date : 20 novembre 2026
Référence métier : Occitanie Livre & Lecture, **Le contrôle des données numérisées — Contrôle-qualité d'une prestation de numérisation… pas à pas**, mise à jour juillet 2025, 26 pages.
Code examiné : **Melanisoft_finition_rose.html** et **Melanisoft_v1_1.html**, branche d'audit issue de main au commit 6479d066.
Banc de tests : **tests/melanisoft-core.test.cjs** ; les tests utilisent principalement des images et récolements synthétiques.
Portée : conformité des fonctions à la procédure du guide, et non certification ISO ou recette sur livraison réelle.

## Règles de lecture
- **A — présent** : l'automatisation principale est identifiable dans le code ; cela ne démontre pas une fiabilité absolue.
- **P — partiel** : fonctionnalité présente mais périmètre, validation ou garantie insuffisants.
- **H — humain** : une consigne de contrôle manuel figure dans le fichier ALÉA ; l'examen ni son verdict ne sont automatisés.
- **N — absent / non démontré** : fonctionnalité non trouvée, ou non démontrée dans le périmètre examiné.
- **HP — hors périmètre du guide fourni** : renvoi à un autre guide.

## Correspondance détaillée avec le guide

| Guide | Exigence du guide | État | Constat dans Mélanisoft | Amélioration |
|---|---|---|---|---|
| Étape 1, contrôle 1, p. 3 | Disque fonctionnel, dossiers parcourables et fichiers lisibles ; contrôle à la réception | P | L'utilisateur choisit un dossier et un inventaire est créé ; la présence de fichiers n'atteste ni la santé du support physique ni la lecture exhaustive des contenus. | Séparer « dossier sélectionné », « inventaire complet » et « intégrité/lecture des fichiers » ; prévoir un procès-verbal matériel manuel. |
| Contrôle 2, p. 4 | 5 niveaux d'arborescence, récolement rempli | P | Niveaux titre, consultation/conservation, année, fascicule et nommage inspectés ; la liste de fichiers du navigateur ne représente pas les dossiers réellement vides ; lecture de CSV/XLSX mais pas du XLS ancien. | Comparer la structure réellement fournie avec la structure attendue ; expliciter les formats de récolement acceptés. |
| Contrôle 3, p. 5 | RCR, cote, date, vue sur quatre chiffres, extensions, underscores et bis | A | Fonction parseName et nombreux contrôles sur noms, dates, extension et suffixes ; attention aux variantes légitimes de cote. | Jeux d'essais positifs/négatifs exhaustifs et configuration des exceptions contractuelles. |
| Contrôle 4, pp. 6-10 | Concordance de tous les fascicules entre récolement et inventaire disque | P | Comparaisons de références, nombres et identités ; la procédure manuelle Karen/Excel est remplaçable par un logiciel, mais l'équivalence exhaustive reste à démontrer. | Rapprochement déterministe titre + fascicule + vue + format, rapprochement non ambigu, journal des données non appariées et contrôle des dossiers vides. |
| Contrôle 6, p. 11 | Nombre de pages inattendu et dates atypiques pour la périodicité | P | Détection statistique des quantités et inférence de périodicité. Les quantités atypiques sont calculées globalement sur des fascicules JPEG, pas individuellement par titre. Une périodicité non déductible peut recevoir le statut OK. | Analyse des vues et de la périodicité **par titre**, avec statut « non vérifiable » lorsque les séries sont insuffisantes, et référence documentaire si disponible. |
| Contrôle 7, p. 12 | Exhaustivité vis-à-vis du bulletinage initial exhaustif établi avant numérisation | P | Le logiciel exploite certaines colonnes « manuelles » et « prestataire » dans le récolement final, mais ne prouve pas qu'un bulletinage initial indépendant et exhaustif a été importé. | Import facultatif distinct de l'état initial, provenance des sources, concordance à trois sources et condition préalable de complétude. |
| Échantillonnage, pp. 13-15 | Une taille de lot **par titre**, niveau général II, NQA 1 %, tirage aléatoire | P | Plan ISO par titre fondé sur les vues logiques et tirage sans remise. Exemple 45 000 vues → code N, 500 vues, Ac 10 / Re 11 vérifié par test. Le tirage utilise Math.random sans trace de graine ; le résultat visuel n'est pas consolidé dans une décision Ac/Re. | Conserver un identifiant de tirage, le protocole et les paramètres ; enregistrer le résultat et compter les non-conformités pour **chaque titre**. |
| Contrôle 8, p. 16 | 400 dpi, couleurs RGB selon tests, échelle 100 % | P/H | DPI, métadonnées ICC et consignes visuelles présents ; aucune comparaison automatique au test colorimétrique approuvé ou à la taille physique de l'original. | Distinguer résolution déclarée, couleur technique et validation humaine du rendu/format physique. |
| Contrôle 9, p. 17 | 1 page = 1 vue ; double page si contenu transversal | H | Ligne de contrôle visuel dans ALÉA. | Saisie du verdict par vue avec note et preuve facultative. |
| Contrôle 10, p. 18 | Cadrage, marges extérieures de 2 mm à 1,5 cm, fond de reliure réduit | H | Check-list « Cadrage » ; la plage numérique des marges n'est pas rappelée explicitement dans les consignes Excel. | Reprendre les marges et la spécificité du bord intérieur avec indication d'appréciation humaine. |
| Contrôle 11, p. 18 | Sens de lecture de l'original | H | Check-list présente. | Saisie du verdict et exceptions. |
| Contrôle 12, p. 19 | Redressement de la page ou des lignes selon le document | H | Check-list présente, sans distinction formalisée par typologie. | Ajouter la règle presse/monographie. |
| Contrôle 13, p. 19 | Netteté, courbure et lisibilité au zoom 100 %, 120 % en cas de doute | H | Consignes adéquates dans ALÉA, pas de verdict relu automatiquement. | Centraliser les résultats manuels et annotations. |
| Exceptions, pp. 20-21 | Ne pas classer comme défaut de numérisation des lacunes, pliures, pages collées ou contraintes inévitables de reliure | H | Consignes écrites présentes ; pas de typologie de traitement effectivement utilisée par un moteur de décision. | Classer « défaut prestataire », « défaut original », « contrainte admise », « à expertiser ». |
| Contrôle 14, p. 22 | Vérification de l'exemplarisation, dates imprimées, bis et suppléments | H/P | Vérification structurelle du nom et consigne humaine « Date et numéro de fascicule » ; pas de rapprochement de la date et du numéro effectivement imprimés. | Contrôle manuel enregistré ; statut particulier pour suppléments datés/numérotés ou intégrés. |
| Contrôle 15, p. 23 | EXIF/IPTC présents sur **JPEG et TIFF** ; IPTC Source = établissement, Headline = cote | P — écart majeur | Le moteur examine les métadonnées du fichier choisi pour le contrôle visuel : TIFF prioritaire, JPEG de repli. Les JPEG correspondants sont donc omis lorsque le TIFF existe. Le lanceur v1.1 modifie en outre dynamiquement la logique de correspondance IPTC. | Tirer les vues une seule fois mais contrôler **chaque format présent** pour les métadonnées ; centraliser une seule logique de correspondance. |
| Contrôle 16, p. 24 | Histogramme et jugement sur sous-/surexposition, écrêtage et plage dynamique | P | Heuristiques automatiques ; lecture/décodage TIFF dépend de la prise en charge du navigateur, différente d'une simple lecture des en-têtes. | Documenter limites et taux de décodage, ne pas assimiler heuristique à verdict visuel ; revoir les faux positifs dus à l'original. |
| Étape 3, p. 25 | Contrôle dans Gallica | HP | Le document renvoie expressément à un autre guide. | Ne pas annoncer la conformité de cette étape avant réception et audit de son guide propre. |

**Note éditoriale :** le guide saute directement du contrôle 4 au contrôle 6 ; il n'y a pas de contrôle 5 à reconstituer. Page 13, la référence « ISO 2958-1 » paraît être une coquille au vu du tableau d'échantillonnage et de la référence ISO 2859-1 utilisée par le logiciel ; faire confirmer le libellé de référence sans changer les critères du guide.

## Écarts les plus sérieux à corriger

### P0 — Écart métier bloquant
1. **Deux formats, une vue (p. 13 et p. 23) :** conserver la sélection visuelle TIFF prioritaire mais exécuter les contrôles EXIF/IPTC et autres métadonnées sur le TIFF **et** le JPEG associés, lorsqu'ils existent. Étiqueter format et résultat. Ne pas compter deux vues dans le tirage.
2. **Décision réelle par titre (p. 14) :** les seuils Ac/Re sont affichés, mais aucune fonction ne lit les constats visuels validés et ne compte les non-conformités pour accepter/rejeter chaque lot. Ne jamais afficher « lot accepté » avant validation des résultats humains.
3. **Source indépendante d'exhaustivité (p. 12) :** le guide exige un état de collection initial complet. Le récolement prestataire ne peut pas se substituer silencieusement à cet état initial. Mettre à disposition un rapprochement à trois sources avec statut « source initiale absente » ou « exhaustivité non démontrée ».

### P1 — Risque important de faux résultat
4. **Statuts des contrôles statistiques :** le contrôle de périodicité (22.5) conclut « OK » si aucune alerte, même si toutes les séries sont trop courtes pour inférer une périodicité.
5. **Statistiques par titre :** le contrôle de nombre de vues atypique (35) calcule une distribution globale. Des titres normalement très différents peuvent être comparés à tort.
6. **Lisibilité physique/technique :** un fichier TIFF dont les en-têtes sont analysables n'est pas nécessairement entièrement décodable. Il faut distinguer parseur de métadonnées et ouverture/décodage.
7. **Chargement dynamique :** le lanceur Melanisoft_v1_1.html recharge la branche main et réécrit des fonctions IPTC à l'exécution ; la version testée par le banc automatisé n'est donc pas identique dans tous les modes de lancement.
8. **Dossiers vides et fichiers non identifiés :** la liste des fichiers du navigateur et le filtrage par noms valides ne suffisent pas à démontrer l'intégrité intégrale du support.
9. **Traçabilité :** tirage aléatoire non reproductible, identité de livraison et versions du guide/contrat non verrouillées dans un dossier de contrôle.

### P2 — Complétude professionnelle
10. Intégrer les **marges de 2 mm à 1,5 cm** au rappel de cadrage et les règles propres aux suppléments (pp. 18 et 22).
11. Saisir le résultat humain **par vue et par contrôle**, distinguer non-conformité prestataire et défaut de l'original (pp. 19-21).
12. Documenter ce qui est réellement vérifié sur les profils ICC/RGB, l'histogramme, les TIFF compressés et les BigTIFF.
13. Proposer deux profils de livraison : **intermédiaire** (guide : contrôle sur JPEG) et **définitive** (présence de TIFF et JPEG requise), sans masquer les absences.

## Proposition d'architecture métier

1. **Réception / inventaire exhaustif :** empreinte du lot, métadonnées de réception, état du support, structure complète, fichiers détectés et non appariés.
2. **Récolement à trois sources :** état de collection avant numérisation, récolement final du prestataire, données réelles du disque ; différences explicitement classées.
3. **Échantillon par titre :** 1 vue logique tirée 1 fois, fichier TIFF privilégié pour observation, les deux formats associés pour métadonnées.
4. **Double piste de contrôle :** résultats techniques automatiques et contrôles visuels saisis/validés par le contrôleur, chacun avec son périmètre.
5. **Décision signée :** par titre, non-conformités retenues, Ac/Re, justification des exceptions, verdict final en attente/accepté/rejeté selon les règles approuvées.

## Jeux d'essais à constituer
- Un même numéro livré en JPEG + TIFF, avec métadonnées IPTC incorrectes seulement sur le JPEG.
- Livraison avec un titre sans TIFF, et une livraison intermédiaire explicitement limitée aux JPEG.
- Deux titres avec fascicules normaux de 4 et 8 vues : **aucun faux « nombre atypique »**.
- Série de seulement deux dates : périodicité **non vérifiable**, pas OK.
- Plusieurs fascicules avec dates erronées/vides dans le récolement.
- Fascicule présent dans le bulletinage initial mais absent du récolement final.
- Doublon de nom dans deux titres, mauvais rattachement de cote, fichier d'image corrompu après les en-têtes.
- TIFF non décodable par le navigateur malgré métadonnées lisibles.
- Exemple guide 45 000 vues : code N / 500 vues / acceptation jusqu'à 10 NC / rejet à 11.
- Saisie visuelle de 10 et de 11 NC sur le même titre : verdicts différents ; aucun verdict sans saisie.

## État et recommandation de livraison

Le code métier de la branche **main** n'a pas été modifié par cet audit. La branche d'audit est intégrée à une demande de modification **en brouillon**. Des tests unitaires/synthétiques passent, mais **le contrôle visuel et une livraison documentaire réelle n'ont pas été recettés**.

**Recommandation :** ne pas fusionner ce travail en production avant d'avoir (1) corrigé l'analyse JPEG + TIFF pour les métadonnées, (2) intégré le circuit de validation manuelle et de décision par titre, (3) fiabilisé le rapprochement avec l'état initial, (4) exécuté les jeux d'essais métier et au moins une livraison témoin.

Ce document est un **audit de correspondance** et une feuille de route. Il n'est **pas** une attestation de conformité au guide, au contrat de numérisation ou à la norme ISO.
