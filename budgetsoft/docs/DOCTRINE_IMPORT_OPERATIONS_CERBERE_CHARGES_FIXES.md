# Doctrine BudgetSoft — import bancaire, Opérations, Cerbère et charges fixes

## 1. Principe cardinal

Toute donnée bancaire importée — qu’elle provienne d’un relevé PDF Hello bank! ou d’un copier-coller de l’application / du site Hello bank! — doit être transformée en **mouvement bancaire canonique unique** avant toute interprétation métier.

À partir de ce mouvement canonique, BudgetSoft alimente deux usages différents mais cohérents :

- **Opérations** : registre du réel bancaire, rétrospectif et durable ;
- **Cerbère** : moteur de pilotage du cycle courant et du cycle suivant, mêlant réel connu, engagements, prévisions et effets du plan.

Ces deux usages peuvent traiter le même mouvement différemment dans leurs calculs, mais ils doivent toujours partir de la **même opération bancaire normalisée**, de la **même catégorisation**, du **même rapprochement charge fixe**, et du **même statut de carte différée**.

> Une opération bancaire ne peut jamais être reconnue comme charge fixe dans Cerbère et ne pas l’être dans Opérations, ou inversement.

## 2. Interdiction absolue de régression côté Opérations

Le comportement actuel de l’onglet **Opérations** constitue la référence fonctionnelle à préserver.

Toute évolution de Cerbère, du rapprochement des charges fixes ou de l’import bancaire doit respecter les invariants suivants :

1. ne jamais recréer un doublon d’une opération déjà importée ;
2. ne jamais dégrader une catégorisation déjà correctement reconnue ;
3. ne jamais écraser un rapprochement charge fixe validé ;
4. ne jamais déplacer rétroactivement une opération entre cycles sans règle explicite ;
5. ne jamais remplacer silencieusement une opération réelle par une prévision ;
6. conserver la distinction entre date bancaire, date d’achat CB et date d’imputation Cerbère ;
7. conserver les corrections et enrichissements existants de l’onglet Opérations.

**Toute modification du moteur commun doit d’abord être compatible avec Opérations. Cerbère s’adapte au moteur commun ; Opérations ne doit pas être cassé pour satisfaire Cerbère.**

## 3. Chaîne canonique d’import

Quel que soit le canal d’entrée, le traitement logique doit être le même :

`Source bancaire → parsing → normalisation bancaire → identité/dédoublonnage → catégorisation → reconnaissance CF → écriture Opérations → lecture Cerbère`

Les parseurs PDF et copier-coller peuvent être différents, car leurs formats sources le sont. En revanche, leur sortie doit converger vers le même schéma canonique :

- compte ;
- date comptable ;
- date d’achat si disponible ;
- libellé bancaire brut ;
- contrepartie / marchand normalisé ;
- montant signé ;
- type revenu/dépense ;
- fin de numéro de carte si disponible ;
- clé de rapprochement / identité bancaire ;
- source bancaire ;
- statut bancaire.

À partir de ce point, **plus aucune règle métier ne doit dépendre du fait que l’opération venait d’un PDF ou d’un copier-coller**.

## 4. PDF et copier-coller : même opération, même résultat

Le PDF est une source bancaire rétrospective et consolidée. Le copier-coller est une source bancaire plus proche du temps réel, parfois provisoire.

Ces deux formats peuvent présenter différemment :

- le libellé ;
- la date ;
- l’ordre des informations ;
- la carte utilisée ;
- la contrepartie ;
- le statut de comptabilisation.

Le moteur doit donc extraire un **motif stable bancaire commun**. Une fois ce motif construit, les règles de catégorisation et de reconnaissance des charges fixes sont identiques.

Si un copier-coller a déjà créé une opération provisoire et que le PDF apporte ensuite la version bancaire consolidée, le PDF doit **enrichir ou rapprocher l’opération existante**, et non créer un doublon.

Le canal d’import ne constitue jamais une information métier de classement.

## 5. Distinction fondamentale : rétrospectif et nouveau

### 5.1 Import rétrospectif

Un import est rétrospectif lorsqu’il porte sur des opérations appartenant à un cycle déjà commencé, déjà terminé ou déjà partiellement connu de BudgetSoft.

Dans ce cas :

- **Opérations** est incrémenté ou enrichi avec le réel bancaire ;
- les doublons sont interdits ;
- les rapprochements existants sont conservés ;
- une charge fixe réelle remplace son occurrence prévue pour le cycle concerné ;
- une dépense pilotable réelle est comptabilisée dans son enveloppe du cycle d’imputation ;
- Cerbère est recalculé à partir de ce réel, mais ne doit pas réinjecter une dépense déjà comptée sous une autre forme.

Pour un cycle clos, l’import rétrospectif relève essentiellement de la qualité du bilan et des futures analyses. Pour le cycle courant, il modifie aussi la trajectoire Cerbère.

### 5.2 Nouvelle opération pendant le cycle courant

Lorsqu’une opération nouvelle apparaît pendant le cycle courant :

- elle entre immédiatement dans Opérations comme réel bancaire ;
- Cerbère la consomme dans la composante appropriée de son cycle ;
- si elle est pilotable, elle réduit l’enveloppe correspondante ;
- si elle est une charge fixe, elle remplace la prévision correspondante ;
- si elle est une recette, elle remplace ou complète la recette prévue selon la doctrine R0 / Actions-Événements ;
- si elle est un flux de trésorerie, elle ne doit pas modifier artificiellement le résultat économique du cycle.

## 6. Charges fixes : moteur commun obligatoire

La reconnaissance d’une charge fixe doit être fournie par **un seul moteur partagé**.

Ce moteur prend comme entrées :

- le mouvement bancaire canonique ;
- le référentiel `Charges_fixes` ;
- les rapprochements déjà validés ;
- les correspondances bancaires apprises ;
- éventuellement l’historique de rapprochement.

Il produit une décision unique :

- charge fixe reconnue avec identifiant `charge_fixe_id` ;
- candidat à valider ;
- ou non reconnue.

Cette décision est ensuite utilisée partout.

### 6.1 Si la charge fixe est reconnue

Alors :

- Opérations porte le lien avec la charge fixe ;
- Charges fixes mémorise le dernier rapprochement et le dernier montant réel ;
- Cerbère exclut cette opération du pilotable et du hors-pilotable ;
- le **réel remplace le prévu** pour l’occurrence du cycle ;
- l’écart `réel − prévu` ajuste la trajectoire du cycle ;
- si le montant varie, la variation est prise en compte sans créer une seconde charge.

### 6.2 Si la charge fixe est seulement probable

Elle ne doit pas être forcée automatiquement lorsque l’ambiguïté est réelle.

Le système crée un candidat à valider. Tant que la décision n’est pas prise :

- Opérations conserve le mouvement réel ;
- Cerbère peut le signaler en audit ;
- aucune disparition silencieuse du montant n’est autorisée.

### 6.3 Si elle n’est pas une charge fixe

Elle suit normalement sa catégorie métier : pilotable, trésorerie, recette ou hors-pilotable à contrôler.

## 7. CB différée : doctrine d’imputation

La CB différée impose de distinguer **date d’achat** et **date de débit bancaire**.

### 7.1 Dans Opérations

Opérations conserve les deux dates lorsqu’elles sont disponibles :

- date d’achat = réalité économique de la dépense ;
- date comptable = réalité bancaire du débit.

Le mouvement bancaire ne doit pas être dupliqué parce que les deux dates appartiennent à deux cycles différents.

### 7.2 Dans Cerbère

Pour une dépense pilotable CB différée :

- elle est imputée au cycle correspondant à la **date d’achat** selon la doctrine Cerbère ;
- si elle est déjà engagée dans M mais ne sera débitée qu’en M+1, elle doit apparaître comme engagement de M et comme débit bancaire futur de M+1 sans être comptée deux fois ;
- la carte `CB de M déjà engagées sur M+1` est une information de trésorerie / frontière, pas une seconde dépense économique.

### 7.3 Charge fixe payée par CB différée

Même règle de reconnaissance commune : si l’opération est une charge fixe, elle reste une charge fixe, quelle que soit la carte utilisée.

Le réel remplace le prévu dans le cycle métier auquel l’occurrence appartient. Le débit différé ne doit pas créer une nouvelle charge au cycle suivant.

## 8. Autres moyens de paiement

Pour prélèvements, virements, chèques, retraits ou paiements immédiats :

- la date comptable est généralement la date bancaire de référence ;
- la date d’imputation Cerbère peut être déterminée par une convention métier spécifique lorsqu’elle existe ;
- le moyen de paiement ne change jamais la catégorie économique de l’opération.

Exemple majeur : le salaire de l’utilisateur est conventionnellement imputé au **28**, même si la banque le crédite le 27, 28 ou 29. Le montant réel remplace le montant prévu, mais la convention de date de début de cycle reste fixe.

## 9. Interaction Opérations ↔ Cerbère

Cerbère ne doit pas disposer d’un registre bancaire parallèle.

Il lit :

- les opérations réelles issues d’Opérations ;
- les rapprochements charge fixe communs ;
- les allocations P1 ;
- les références R0 et CF0 ;
- les Actions/Événements ;
- les règles de frontière et de CB différée.

Ainsi, un nouvel import incrémente d’abord le réel bancaire, puis Cerbère recalcule sa trajectoire.

**Opérations enregistre le fait ; Cerbère interprète ses conséquences pour le pilotage.**

## 10. Cas de figure synthétiques

| Cas | Opérations | Cerbère |
| --- | --- | --- |
| Dépense pilotable immédiate nouvelle | ajoute/enrichit le réel | réduit l’enveloppe du cycle |
| Dépense pilotable CB différée nouvelle | conserve achat + date comptable | impute l’achat au cycle métier, suit le débit futur sans double compte |
| Charge fixe nouvelle reconnue | lie l’opération à `charge_fixe_id` | réel remplace prévu |
| Charge fixe de montant différent | conserve le réel | applique uniquement `réel − prévu` |
| Charge fixe candidate ambiguë | conserve l’opération, propose validation | reste visible en audit tant que non validée |
| Recette nouvelle | ajoute le réel | remplace/complète la prévision selon R0/plan |
| Import PDF d’une opération déjà issue du copier-coller | enrichit/rapproche, pas de doublon | aucune nouvelle incidence économique |
| Import ancien d’un cycle clos | met à niveau l’historique | alimente bilan/analyses, pas de nouvelle dépense du cycle courant |
| Flux de trésorerie | conserve le mouvement bancaire | exclut du résultat économique |
| Salaire arrivé le 27/29 | conserve date banque | convention Cerbère : ouverture au 28, seul le montant réel varie |

## 11. Règles anti-double-compte

Une même réalité économique ne peut apparaître qu’une fois dans le calcul.

Sont notamment interdits :

- charge fixe réelle + charge fixe prévue simultanément ;
- dépense CB différée comptée à l’achat puis de nouveau au débit ;
- opération copier-coller puis même opération PDF comptées deux fois ;
- opération reconnue CF également laissée dans une enveloppe pilotable ;
- opération reconnue CF également laissée dans `HEt1` ;
- recette réelle additionnée à sa prévision lorsqu’elle est censée la remplacer.

## 12. Priorité des sources et stabilité

Lorsqu’une même information existe à plusieurs niveaux, la priorité fonctionnelle est :

1. réel bancaire consolidé ;
2. rapprochement validé ;
3. opération provisoire issue du flux / copier-coller ;
4. prévision / occurrence de référence ;
5. heuristique ou candidat à valider.

Une information de niveau supérieur **remplace ou enrichit** une information de niveau inférieur ; elle ne s’ajoute pas mécaniquement à elle.

## 13. Doctrine de développement

Toute évolution future doit respecter les règles suivantes :

- aucune logique de reconnaissance CF spécifique à Cerbère ;
- aucune logique de reconnaissance CF spécifique au PDF ou au copier-coller après normalisation ;
- les différences entre PDF et copier-coller sont confinées aux parseurs et à la consolidation de l’identité bancaire ;
- le moteur commun expose la décision de rapprochement aux différents écrans ;
- toute correction du moteur commun doit être testée contre les cas déjà correctement gérés dans Opérations ;
- **régression côté Opérations = blocage de livraison** ;
- les heuristiques Cerbère historiques doivent être progressivement remplacées par l’appel au moteur partagé, jamais dupliquées.

## 14. Critère de conformité

Le système est conforme si, pour une même opération bancaire, quel que soit son canal d’import :

- le même mouvement est identifié ;
- la même catégorie est retenue ;
- la même charge fixe est reconnue ;
- le même montant réel remplace la même prévision ;
- Opérations et Cerbère restent mathématiquement cohérents ;
- aucun double compte n’apparaît.

Cette doctrine prévaut sur toute heuristique locale antérieure de Cerbère.
