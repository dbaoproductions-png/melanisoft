# Audit du classeur BudgetSoft — 24/08/2026

Source de contrôle : export `BudgetSoft (66)(2).xlsx` fourni pendant la consolidation Cerbère 3.6.2.

Ce document est un **repère de test**, pas une doctrine permanente. La doctrine est dans `DOCTRINE_BUDGETSOFT.md`.

## Structure utile confirmée

`Operations` contient les colonnes :

`id, date, libelle, categorie, compte, montant, type, commentaire, cree_le, modifie_le, source_bancaire, date_comptable, date_achat, libelle_bancaire, marchand_normalise, carte_fin, cle_rapprochement, statut_bancaire, charge_fixe_id`.

`Categories` contient notamment `nom`, `type`, `famille_analytique`.

`Charges_fixes` et `Rapprochements_charges_fixes` sont présents séparément.

## Carte à débit différé

Le classeur contient deux représentations possibles d'un même achat :

- ligne `flux`, souvent `statut_bancaire = provisoire` ;
- ligne `pdf`, `statut_bancaire = definitif`.

`cle_rapprochement` encode de façon structurée notamment :

`HB|SOURCE|date_comptable|date_achat|montant_centimes|marchand|carte|...`

Exemple observé : le même achat Intermarché 65,78 € existe en FLOW provisoire et PDF définitif, avec le même marchand, la même date métier, la même carte et le même montant.

**Règle moteur commun :** grouper ces achats par date d'achat métier + carte + montant + marchand et conserver la ligne définitive. Sa catégorie fait autorité.

La date d'achat métier est lue en priorité depuis `cle_rapprochement` lorsqu'elle est disponible, puis depuis `date_achat`. Cette priorité corrige les écarts de représentation de date observés entre certaines lignes FLOW et PDF.

## Référentiel catégories

Le classeur comporte notamment les types :

- `depense`
- `revenu`
- `tresorerie`
- `epargne`

Exemples de catégories `tresorerie` : `Crédits de trésorerie`, `Virements internes`, `Remboursements`, `Remboursements santé`.

Pour Cerbère, les mouvements de trésorerie ordinaires sont appliqués selon leur **signe**. `Remboursements santé` est traité spécialement dans Santé nette afin de ne pas compter deux fois le même remboursement.

## CF0 réel

Dans l'export audité, peu d'opérations ont encore `charge_fixe_id` renseigné. Cerbère 3.6.2 respecte la règle : seule cette liaison validée suffit à sortir une opération des enveloppes variables comme réel CF0.

Les propositions `À valider` présentes dans `Rapprochements_charges_fixes` ne sont pas assimilées automatiquement à du réel CF0.

## Benchmark de ventilation 3.6.2

Avec la doctrine structurée et la déduplication provisoire/définitif, l'export contient :

- 2 500 lignes Operations source ;
- 2 473 lignes après déduplication des achats CB ;
- **27 doublons CB provisoire/définitif neutralisés** ;
- aucune catégorie orpheline dans les deux cycles contrôlés.

### Août — cycle 28/07/2026 -> 27/08/2026

Ordres de grandeur attendus du moteur commun :

- réel non-CB variable : **3 765,50 €** ;
- CB héritée de la période précédente : **2 430,02 €** ;
- trésorerie nette : **+800,00 €** ;
- réel CF0 explicitement lié : **11,99 €** ;
- Santé nette imputée : **1 056,14 €**.

Le non-CB inclut volontairement des catégories telles que `Crédits`, `Crédits revolving`, `Impôts`, etc. lorsqu'elles ne sont pas marquées par `charge_fixe_id` : c'est conforme à la doctrine validée.

### Septembre — cycle 28/08/2026 -> 27/09/2026

Au moment de l'export :

- réel non-CB constaté : **0,00 €** ;
- CB déjà engagée depuis les achats d'août : **2 309,66 €** ;
- trésorerie nette constatée : **0,00 €** ;
- Santé CB nette déjà engagée : **33,76 €**.

Ces valeurs constituent un benchmark très utile pour le prochain Deploy TEST. Des écarts importants signaleraient un problème de lecture Apps Script, de période ou de sérialisation.
