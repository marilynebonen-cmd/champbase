# Fil d'activité gym – Schéma et plan de test

## Schéma Firestore

### Collections

- **gyms/{gymId}**
  - `feedIsPublic` (boolean, optionnel) : si `false`, le feed n’est lisible que par les utilisateurs authentifiés. Par défaut (absent) = lecture autorisée.

- **gyms/{gymId}/wods/{wodId}/scores/{userId}**
  - Champs existants + optionnels pour le feed :
  - `caption` (string, optionnel)
  - `photoStoragePath` (string, optionnel)
  - `photoUrl` (string, optionnel)

- **gyms/{gymId}/feedPosts/{postId}**
  - `postId` = `{wodId}_{athleteId}` (un post par couple WOD + athlète).
  - Créé/mis à jour **uniquement par la Cloud Function** au write d’un score (WOD Daily uniquement, sans `eventId`).
  - Champs : `gymId`, `wodId`, `scoreRefPath`, `athleteId`, `athleteName`, `athleteAvatarUrl`, `wodTitle`, `scoringType`, `scoreDisplay`, `valueRaw`, `caption`, `photoUrl`, `createdAt`, `updatedAt`, `repliesCount`, `starsCount`, `starsAvg`.

- **gyms/{gymId}/feedPosts/{postId}/replies/{replyId}**
  - `userId`, `userName`, `userAvatarUrl`, `text`, `createdAt`.

- **gyms/{gymId}/feedPosts/{postId}/stars/{userId}**
  - Un document par utilisateur ; `rating` (1–5), `createdAt`, `updatedAt`.

### Storage

- **gyms/{gymId}/wodScores/{wodId}_{userId}.{ext}**
  - Photo optionnelle du score (JPEG/PNG/WebP, max 5 Mo).

## Cloud Functions

1. **onWodScoreWritten**  
   Déclencheur : `gyms/{gymId}/wods/{wodId}/scores/{userId}` (create/update).  
   - Ignore les WODs liés à un événement (`eventId` non vide).  
   - Lit le profil utilisateur et le WOD, formate `scoreDisplay`, crée ou met à jour `gyms/{gymId}/feedPosts/{wodId}_{userId}` en conservant `repliesCount`, `starsCount`, `starsAvg`.

2. **onFeedStarWritten**  
   Déclencheur : `gyms/{gymId}/feedPosts/{postId}/stars/{userId}`.  
   - Recalcule `starsCount` et `starsAvg` sur le document `feedPosts/{postId}`.

3. **onFeedReplyCreated**  
   Déclencheur : création dans `gyms/{gymId}/feedPosts/{postId}/replies/{replyId}`.  
   - Incrémente `repliesCount` sur `feedPosts/{postId}`.

4. **onFeedReplyDeleted**  
   Déclencheur : suppression dans `gyms/{gymId}/feedPosts/{postId}/replies/{replyId}`.  
   - Met à jour `repliesCount` sur `feedPosts/{postId}`.

### Déploiement des Functions

```bash
cd champbase
npm install -g firebase-tools   # si besoin
firebase login
cd functions
npm install
cd ..
firebase deploy --only functions
```

Si le projet n’a jamais eu de Functions :

```bash
firebase init functions
# Choisir TypeScript ou JavaScript, puis utiliser le dossier functions/ existant.
```

## Règles de sécurité (résumé)

- **feedPosts** : lecture si `gym.feedIsPublic != false` ou utilisateur authentifié ; aucune écriture client (seule la Cloud Function écrit).
- **replies** : lecture/écriture réservées aux utilisateurs authentifiés ; création avec `userId == request.auth.uid` ; modification/suppression uniquement pour son propre `userId`.
- **stars** : lecture pour les authentifiés ; création/mise à jour uniquement pour le document `stars/{userId}` avec `userId == request.auth.uid` et `rating` entre 1 et 5.
- **scores** (sous WOD) : l’athlète ne peut créer/mettre à jour que son propre document (`uid` = `request.auth.uid`) ; champs optionnels `caption`, `photoStoragePath`, `photoUrl` autorisés.

### Règles Storage (optionnel)

Si vous utilisez Firebase Storage pour les photos de score, ajoutez des règles pour restreindre l’upload aux utilisateurs authentifiés, par exemple :

- Lecture : autoriser les URLs de téléchargement (ou règles publiques si les URLs sont signées).
- Écriture : `request.auth != null` et le chemin doit correspondre à l’utilisateur (ex. `gyms/{gymId}/wodScores/*` avec vérification que le nom de fichier contient l’UID de l’utilisateur).

---

## Plan de test

1. **Création de post**
   - Créer un WOD Daily (sans événement) pour un gym.
   - Se connecter en tant qu’athlète, ouvrir le WOD, soumettre un score avec optionnellement une photo et une légende.
   - Vérifier : le fil du gym (onglet « Fil d’activité ») affiche un nouveau post avec nom, WOD, score formaté, légende et photo.

2. **Mise à jour du même post (pas de doublon)**
   - Modifier le score (ou la légende/photo) et enregistrer.
   - Vérifier : un seul post pour ce WOD + cet athlète, mis à jour (pas de second post).

3. **Réponses**
   - Avec un autre utilisateur authentifié, ouvrir les commentaires du post et ajouter une réponse.
   - Vérifier : la réponse s’affiche et `repliesCount` du post est incrémenté (et se met à jour en temps réel si des listeners sont utilisés).

4. **Étoiles**
   - Avec un autre utilisateur, donner une note (1–5) au post.
   - Vérifier : `starsCount` et `starsAvg` du post se mettent à jour (via la Cloud Function) et l’affichage reflète la note.

5. **Permissions**
   - Vérifier qu’un utilisateur ne peut pas modifier le score d’un autre (règles Firestore).
   - Vérifier qu’un utilisateur ne peut modifier/supprimer que ses propres réponses et ne peut écrire que dans son propre document `stars/{userId}`.

6. **Dates et libellés**
   - Vérifier que les dates sont en français (fr-CA) et que le type de score affiché correspond au WOD (ex. « Temps (plus bas = mieux) »).

7. **WOD « Créé le »**
   - Sur la page du WOD, vérifier que la date « Créé le » s’affiche sous le titre du WOD.
