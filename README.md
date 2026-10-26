# Ma Tournée Optimisée — V2 iPhone

## Installation
1. Décompresse le ZIP.
2. Sur GitHub, crée un dépôt (GitHub Pages nécessite un dépôt public sur le plan gratuit). Dépose **uniquement les fichiers de code** du dossier, jamais tes données clients.
3. Settings → Pages → Deploy from a branch → main → /(root).
4. Ouvre l’URL HTTPS dans Safari sur iPhone, puis Partager → Sur l’écran d’accueil → Ajouter.
5. Si tu remplaces les fichiers de la V1, garde le même site et le même navigateur pour récupérer automatiquement les données locales V1. Fais une sauvegarde JSON avant mise à jour.

## Scanner les colis
Onglet Scanner → Démarrer la caméra → autoriser la caméra. Si Safari ne prend pas en charge BarcodeDetector, saisis le code-barres dans le champ prévu. Les formats disponibles dépendent du navigateur.
Un numéro déjà enregistré est détecté comme doublon. Pour un nouveau numéro, sélectionne un client existant ou crée une fiche ; l’application rattache alors le colis au client et sélectionne ce dernier pour la tournée. Plusieurs colis du même client partagent un arrêt.

**Important :** le code-barres seul ne donne généralement pas le nom ou l’adresse du destinataire. La reconnaissance automatique d’un client n’est possible qu’après association du numéro de colis à sa fiche. Il n’y a pas de connexion au système du transporteur.

## Limites
- Calcul d’itinéraire **approximatif**, à vol d’oiseau, sans réseau routier ni trafic.
- Les adresses importées de Google Takeout peuvent nécessiter un nettoyage et des coordonnées GPS.
- Données enregistrées **localement sur cet appareil et ce navigateur** ; pas de synchronisation entre appareils.
- Les numéros de colis sont uniques dans la base locale. Pour réutiliser un numéro, supprime d’abord son ancien enregistrement.
- Si plusieurs colis sont à un arrêt, le bouton « Livré » de la tournée marque tous les colis du jour de ce client comme livrés.
- Sauvegarde régulièrement depuis Dépôt / Import → Sauvegarde JSON.
- Ne scanne pas au volant.

## Test rapide
Crée un dépôt avec coordonnées GPS, puis un client. Dans Scanner, saisis TEST-001, associe-le au client, puis TEST-002 au même client. Dans Tournée, optimise : le client doit apparaître une seule fois avec 2 colis.
