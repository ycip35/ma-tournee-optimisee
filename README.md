# Ma Tournée Optimisée V3 — iPhone

## IMPORTANT : sauvegarde AVANT mise à jour
Dans la V2, ouvre **Dépôt / Import → Sauvegarde JSON** et conserve le fichier dans Fichiers. Ne supprime pas les données Safari. La V3 utilise exactement la même clé locale `tournee_data_v2` que la V2. Le stockage de Safari et celui d’une application ajoutée à l’écran d’accueil peuvent être séparés : fais une restauration JSON si tes clients ne s’affichent pas.

## Mise à jour GitHub depuis iPhone
Ouvre le dépôt GitHub existant → Add file → Upload files. Décompresse le ZIP V3 dans Fichiers. Sélectionne les **six fichiers à l’intérieur** du dossier `ma-tournee-optimisee` et envoie-les **à la racine** du dépôt (pas le dossier entier). Valide Commit changes. Vérifie Settings → Pages → main / (root). Attends le déploiement et recharge Safari. Si l’ancienne version reste visible, ferme puis rouvre le site; le service worker V3 doit prendre le relais.

## Fonctionnement
- Scanner : caméra via ZXing Browser chargé en ligne, nécessite HTTPS, Safari compatible et autorisation caméra. Code inconnu : choisir un client ou créer une fiche.
- Carte : Leaflet + tuiles OpenStreetMap chargées en ligne.
- Recherche d’adresse : Nominatim, à utiliser ponctuellement et manuellement. Vérifier l’adresse proposée avant de l’accepter. Pas de recherche automatique massive : service public limité à environ 1 requête/s et soumis à une politique d’usage.
- GPS : position ponctuelle autorisée par l’utilisateur, utilisée comme départ de la session.
- Route : OSRM public de démonstration, table de durées routières puis route géométrique, sans trafic. Jusqu’à 49 clients par calcul; service **non garanti pour 40+ arrêts** et peut refuser les requêtes. Si refus, l’app affiche une erreur au lieu de présenter un trajet à vol d’oiseau comme routier. Les horaires sont estimés et l’ordre est heuristique, pas un optimum garanti.
- Sauvegarde : clients et colis restent en local. Les adresses sont transmises au service Nominatim lors d’une recherche; les coordonnées au service OSRM lors d’un calcul. Ne pas utiliser de données confidentielles sans autorisation.

## Limites et suite
Le serveur OSRM de démonstration n’est pas prévu pour un usage professionnel régulier; prévoir un service routier dédié ou auto-hébergé. Les services externes nécessitent Internet et peuvent être indisponibles. Pas de trafic temps réel, pas de guidage GPS intégré, pas de lecture automatique de nom/adresse sur étiquette. Ouvrir Google Maps pour la navigation.
