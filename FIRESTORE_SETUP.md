# Configuration Firestore pour ChampBase

Avec Firestore, **la collection `gyms` n’a pas besoin d’être créée à la main** : elle apparaît dès que vous créez le premier document (premier gym).

## 1. Activer Firestore dans Firebase

1. Ouvrez la [Console Firebase](https://console.firebase.google.com/).
2. Sélectionnez votre projet (ou créez-en un).
3. Dans le menu de gauche : **Build** → **Firestore Database**.
4. Cliquez sur **Créer une base de données**.
5. Choisissez **Démarrer en mode test** (pour le dev) ou **Mode production**.
6. Sélectionnez une région (ex. `europe-west1`), puis validez.

## 2. Déployer les règles et les index

À la racine du projet, si vous avez installé la CLI Firebase :

```bash
# Connexion (une fois)
firebase login

# Associer le projet (une fois)
firebase use <votre-project-id>

# Déployer uniquement Firestore (règles + index)
firebase deploy --only firestore
```

Cela déploie :
- **firestore.rules** : lecture/écriture des `gyms` (création si vous êtes connecté et `ownerUid` = votre UID).
- **firestore.indexes.json** : index pour la requête « gyms par propriétaire » (`ownerUid` + `createdAt`).

## 3. Créer un gym fictif

Deux possibilités :

### Option A : Depuis l’app (recommandé)

1. Lancez l’app : `npm run dev`, puis ouvrez http://localhost:3000.
2. **Inscrivez-vous** ou connectez-vous (Auth).
3. Allez dans **Dashboard** → cochez le rôle **Organizer** → **Save roles**.
4. Cliquez sur **Organizer** dans la barre de navigation.
5. Cliquez sur **Create gym** (ou **Create gym** dans la carte « Create your gym » si vous n’avez pas encore de gym).
6. Remplissez le formulaire (nom obligatoire, ville et pays optionnels) puis **Create gym**.

La collection `gyms` est créée automatiquement et votre premier document gym est enregistré.

### Option B : Données de démo

1. Connectez-vous avec un compte **Organizer** (comme ci-dessus).
2. Allez sur **Organizer**.
3. Cliquez sur **Create Demo Setup** : un gym « CrossFit Stricken », un événement et des workouts sont créés. Vous pouvez ensuite créer d’autres gyms via **Create gym**.

## Structure d’un document `gyms`

Chaque gym est un document dans la collection `gyms` avec des champs comme :

| Champ       | Type     | Description                    |
|------------|----------|--------------------------------|
| `name`     | string   | Nom du gym (obligatoire)       |
| `city`     | string   | Ville (optionnel)              |
| `country`  | string   | Pays (optionnel)               |
| `ownerUid` | string   | UID Firebase du propriétaire   |
| `createdAt`| timestamp| Date de création               |
| `updatedAt`| timestamp| Dernière mise à jour           |

L’ID du document est généré automatiquement par Firestore à la création.

## Dépannage

- **Permission denied** : vérifiez que vous êtes connecté et que les règles Firestore ont bien été déployées (`firebase deploy --only firestore`).
- **Missing index** : pour activer les index manquants :
  1. À la racine du projet : `npx firebase use --add` puis choisir votre projet Firebase (ou `npx firebase use <votre-project-id>` si vous connaissez l’ID — même valeur que `NEXT_PUBLIC_FIREBASE_PROJECT_ID` dans `.env.local`).
  2. Déployer uniquement les index : `npm run firestore:indexes` (ou `npx firebase deploy --only firestore:indexes`).
  Les index définis dans `firestore.indexes.json` seront créés ; la construction peut prendre quelques minutes dans la console Firebase.
- **Variables d’environnement** : assurez-vous que `.env.local` contient bien `NEXT_PUBLIC_FIREBASE_*` (apiKey, authDomain, projectId, etc.) pour que l’app pointe vers le bon projet Firebase.
