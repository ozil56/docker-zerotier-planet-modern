[English](README.md) | [简体中文](README.zh-CN.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [日本語](README.ja.md)

# Docker ZeroTier Planet Modern

**[→ Générer et récupérer votre Planet personnalisé](#custom-planet)**

Une version modernisée de Planet privé, du Controller intégré et de l'interface ztncui avec Docker Compose, fondée sur l'approche de [xubiaolin/docker-zerotier-planet](https://github.com/xubiaolin/docker-zerotier-planet).

J'apprécie depuis longtemps la simplicité de déploiement du projet original. L'examen d'une vulnérabilité récente de Node.js m'a conduit à remettre à niveau l'environnement complet ; je souhaitais aussi actualiser le cœur ZeroTier de mon installation. Merci à xubiaolin et aux contributeurs, à Key Networks pour ztncui et aux auteurs de ZeroTier. Ce projet indépendant n'est pas une distribution officielle de ces équipes. Voir les [crédits et licences](THIRD_PARTY_NOTICES.md), en anglais.

## Contenu et périmètre

ZeroTier **1.16.2**, Node.js **24.22.1**, base Alpine **3.24**, argon2 **0.45.1** et Bootstrap **5.3.8**. Le conteneur utilise l'UID 10001, sans mode privileged ni capacités supplémentaires, avec une racine en lecture seule. TUN n'est pas nécessaire : le serveur ne rejoint pas les réseaux utilisateurs. SSO est désactivé.

Cette page présente l'installation. Le [guide complet en anglais](README.md) donne les résultats attendus et une méthode de téléchargement de secours si Git échoue. La plateforme testée est Linux amd64.

## Avant de commencer

- Pour une installation existante, suivez la [migration avec sauvegarde](docs/MIGRATION.md), sans réinitialiser les données.
- Lisez la [licence du Controller](docs/LICENSING.md). `ZT_NONFREE=1` active sa compilation, sans supprimer ses conditions. Un usage personnel non commercial admissible ne donne pas automatiquement le droit de distribuer une image combinée. Aucune image publique précompilée contenant ce Controller n'est fournie.
- Sauvegardez ensemble identité, base de données, comptes et clés de signature. Ne publiez ni `data/`, ni `.env`, ni les sauvegardes.

## Nouvelle installation

Exécutez les commandes sur le serveur Ubuntu en tant que root (`sudo -i` si nécessaire). Docker Engine et Compose v2.24 ou ultérieur doivent être installés ; sinon, suivez la [documentation officielle de Docker](https://docs.docker.com/engine/install/ubuntu/). Prévoyez environ 2 Go de RAM et 8 Go d'espace libre.

```bash
docker version
```

```bash
docker compose version
```

Installez Git si nécessaire (`apt-get update`, puis `apt-get install -y git`).

```bash
git clone https://github.com/ozil56/docker-zerotier-planet-modern.git
```

```bash
cd docker-zerotier-planet-modern
```

Exécutez toutes les commandes serveur suivantes dans ce répertoire.

```bash
cp .env.example .env
```

```bash
nano .env
```

Remplacez `PUBLIC_IPV4` par l'adresse publique réelle ; `203.0.113.10` est un exemple inutilisable. Laissez `PUBLIC_IPV6` vide tant que sa connectivité n'a pas été vérifiée. Après lecture de la licence et confirmation de votre admissibilité, définissez `ACCEPT_ZEROTIER_SOURCE_LICENSE=yes`. Gardez `UI_BIND` et `DOWNLOAD_BIND` à `127.0.0.1`. Autorisez le port UDP `9994` par défaut dans les pare-feu du serveur et du fournisseur cloud.

```bash
chmod 600 .env
```

```bash
docker compose config --quiet
```

```bash
docker compose build planet
```

Attendez la réussite de la compilation. Aucun compte Docker Hub n'est nécessaire pour construire à partir d'images publiques. Une connexion dans le navigateur n'authentifie pas la CLI Docker du serveur. N'utilisez pas `docker compose pull` pour obtenir ce projet.

```bash
docker compose --profile tools run --rm init
```

Le résultat attendu est `Initialized`. Cette opération ne se fait qu'une fois ; un répertoire de données non vide est refusé.

```bash
cat data/initial-admin-password.txt
```

Le compte est `admin`. Lisez le mot de passe aléatoire uniquement dans votre terminal, enregistrez-le dans un gestionnaire de mots de passe, puis supprimez la copie initiale. Ne publiez jamais son contenu.

```bash
rm -- data/initial-admin-password.txt
```

```bash
docker compose up -d --no-build planet
```

```bash
docker compose ps
```

Attendez environ 30 à 60 secondes pour obtenir `healthy`, puis vérifiez le cœur :

```bash
docker compose exec planet zerotier-cli -D/var/lib/zerotier-one info
```

Sur **votre ordinateur**, remplacez l'adresse du serveur et laissez cette connexion ouverte :

```bash
ssh -N -L 3443:127.0.0.1:3443 -L 3000:127.0.0.1:3000 root@YOUR_SERVER_IP
```

Ouvrez **http://127.0.0.1:3443** (HTTP, pas HTTPS), puis connectez-vous. Le [guide des clients](docs/CLIENTS.md) explique comment créer un réseau privé, distribuer uniquement `data/dist/planet`, autoriser deux clients et tester les deux sens de communication. N'exposez pas l'API du Controller.

Après avoir annoncé une courte interruption, créez une sauvegarde :

```bash
sh scripts/backup.sh
```

Les sauvegardes contiennent des secrets et **ne sont pas chiffrées**. Conservez une copie chiffrée hors du serveur. Consultez les guides anglais de [restauration](docs/BACKUP.md), de [dépannage](docs/TROUBLESHOOTING.md) et de [validation](docs/VALIDATION.md).

Deux essais complets sur un serveur de test situé en Chine continentale ont couvert installation, deux clients Linux, redémarrage et restauration. Ils ne valident pas toutes les plateformes clientes, ARM ni toutes les topologies NAT publiques. Un redémarrage ferme les sessions de l'interface, mais conserve l'identité et les réseaux.

<a id="custom-planet"></a>

## Générer et récupérer votre Planet personnalisé

La commande `docker compose --profile tools run --rm init` utilisée plus haut **génère déjà votre Planet**. Elle utilise `PUBLIC_IPV4`, l'éventuel `PUBLIC_IPV6` et `ZT_PORT` de .env, ainsi qu'une nouvelle identité et de nouvelles clés de signature. Aucun outil mkworld supplémentaire n'est nécessaire. Ne relancez pas init sur une installation existante.

Le fichier à distribuer à tous vos clients est **`data/dist/planet`**, dans le répertoire du projet ; `data/one/planet` est la copie du serveur. Sur le serveur, vérifiez que le fichier n'est pas vide et que les deux empreintes SHA-256 sont identiques :

```bash
ls -lh data/dist/planet
```

```bash
sha256sum data/one/planet data/dist/planet
```

Sur **votre ordinateur**, remplacez l'adresse du serveur et le chemin si nécessaire :

```bash
scp root@YOUR_SERVER_IP:/root/docker-zerotier-planet-modern/data/dist/planet ./planet
```

Conservez le nom exact `planet`, sans `.txt`. Comparez son empreinte à celle du serveur : `sha256sum ./planet` sous Linux ou `Get-FileHash .\planet -Algorithm SHA256` dans PowerShell. Ne distribuez jamais identity.secret, les fichiers JSON de signature ou tout le répertoire data.

Autre méthode : avec le service démarré et le tunnel SSH du port 3000 ouvert, utilisez `http://127.0.0.1:3000/planet?key=YOUR_DOWNLOAD_KEY`. La clé se trouve dans `data/config/file_server.key` sur le serveur ; lisez-la en privé et ne publiez pas l'URL complète.

Sur chaque client, arrêtez ZeroTier, sauvegardez l'ancien planet, remplacez uniquement ce fichier, puis redémarrez ZeroTier. Sous Linux, son emplacement est `/var/lib/zerotier-one/planet`. Rejoignez ensuite le Network ID à 16 chiffres hexadécimaux, autorisez le nœud dans l'interface, puis vérifiez le statut `OK`, l'adresse IP et les communications dans les deux sens. **Créer un réseau dans l'interface ne remplace pas l'installation du Planet sur les clients.** Le [guide détaillé des clients](docs/CLIENTS.md) fournit les commandes et les chemins Windows/macOS ; seul Linux a été validé de bout en bout.

Le fichier `.moon` supplémentaire ne remplace pas cette procédure. Modifier .env après l'initialisation ne signe pas un nouveau Planet : un changement d'adresse publique ou de port nécessite de prévoir sa signature et sa redistribution. Récupérez une installation existante à partir de ses fichiers ou d'une sauvegarde vérifiée, sans réinitialiser.
