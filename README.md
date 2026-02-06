# OmniWatch 👁️

Un bot Discord professionnel écrit en TypeScript pour surveiller la disponibilité de vos sites web et serveurs avec des rapports de performance détaillés (CPU, RAM, Stockage).

## 🚀 Fonctionnalités

- **Monitoring en Temps Réel** : Vérification cyclique de l'accessibilité HTTP (HEAD requests).
- **Dashboard Dynamique** : Un tableau de bord qui se met à jour automatiquement avec l'historique de stabilité ("En ligne depuis...").
- **Statistiques Système** : Intégration avec [**MonitoringInfo**](https://github.com/akefis/MonitoringInfo) pour récupérer le CPU, la RAM, le Stockage et l'état du certificat SSL.
- **Résilience (Auto-retry)** : Système intelligent qui attend 3 échecs consécutifs avant d'envoyer une alerte pour éviter les faux positifs.
- **Gestion Interactive** : Modification des sites via des fenêtres surgissantes (Modals) Discord.
- **Nettoyage Automatique** : Suppression intelligente des messages de dashboard lors de la désinscription d'un site.

## 📊 Monitoring de Serveur

Pour afficher des statistiques détaillées, OmniWatch s'appuie sur [**MonitoringInfo**](https://github.com/akefis/MonitoringInfo), une API sécurisée à installer sur vos serveurs. Elle fournit des rapports détaillés (CPU, RAM, Disques, SSL) de manière sécurisée.

## 🛠️ Commandes Slash

| Commande    | Description                                                             |
| :---------- | :---------------------------------------------------------------------- |
| `/register` | Enregistre un nouveau site (URL, alias, URL de monitoring optionnelle). |
| `/edit`     | Ouvre une interface pour modifier les paramètres d'un site existant.    |
| `/setup`    | Génère un dashboard persistant et auto-actualisé dans le channel.       |
| `/status`   | Affiche le statut instantané d'un site spécifique.                      |
| `/list`     | Affiche la liste de tous les sites surveillés sur le serveur.           |
| `/delete`   | Supprime un site et nettoie son dashboard associé.                      |
| `/ping`     | Vérifie la latence du bot et de la base de données.                     |
| `/clear`    | Nettoie les messages de log du bot dans le channel.                     |

## 📦 Installation

### Pré-requis

- Node.js 18+
- Docker & Docker Compose
- Un bot Discord (Token + Client ID)

### Configuration

1. Clonez le projet.
2. Créez un fichier `.env` à la racine (voir `.env.example`) :

```env
DISCORD_TOKEN=votre_token
DISCORD_CLIENT_ID=votre_id_client
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

### Lancement

```bash
# 1. Installer les dépendances
npm install

# 2. Lancer la base de données
docker compose up -d

# 3. Appliquer le schéma de base de données
npx drizzle-kit push

# 4. Lancer le bot (développement)
npm run dev

# 5. Build & Start (production)
npm run build
npm start
```

## 🧪 Qualité du code

Le projet utilise **ESLint**, **Prettier** et **Knip** pour garantir un code propre, performant et sans fuites de mémoire.

```bash
npm run lint   # Vérifier le style et les erreurs
npm run build  # Vérifier la compilation TS
npx knip       # Détecter le code mort et les dépendances inutilisées
```

---

_Projet réalisé en TypeScript avec Drizzle ORM et Discord.js v14._
