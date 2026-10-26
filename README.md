# Ma Tournée Optimisée V3.1 — recherche Geoapify

## Installation iPhone (GitHub Pages)
1. Garde ta sauvegarde JSON de clients et colis.
2. Dans le dépôt GitHub existant, remplace les fichiers du site par ceux du dossier `ma-tournee-optimisee` (sans publier de données clients ni de clé).
3. Vérifie que les nouveaux fichiers sont à la racine du dépôt, puis valide `Commit changes`.
4. Attends la publication GitHub Pages, ouvre Safari et actualise. Si l'ancienne version reste affichée, ferme/réouvre l'application.
5. Dans **Dépôt / Import**, colle la clé Geoapify dans le champ prévu, puis touche **Activer la recherche**.
6. Dans **Clients**, tape un nom d'entreprise et une ville dans le champ Adresse. Choisis un résultat, puis enregistre le client.

## Important
- Ne colle JAMAIS ta clé dans `app.js` ou dans un dépôt public. Le champ de cette version conserve la clé dans le stockage local du navigateur, pas dans GitHub. Une clé utilisée depuis un navigateur reste néanmoins exposée aux outils de développement et aux requêtes réseau : restreins les domaines autorisés et les quotas depuis Geoapify, ou utilise un proxy serveur pour une protection plus robuste.
- Les données de tournée existantes utilisent la même clé `tournee_data_v2` dans le stockage local : aucune migration ni effacement automatique. Une sauvegarde reste indispensable.
- Les résultats de recherche peuvent être incomplets. Vérifie l'entreprise et son emplacement sur la carte avant de livrer.
- Le routage OSRM public reste un service de démonstration, sans garantie de disponibilité pour 40+ arrêts.
