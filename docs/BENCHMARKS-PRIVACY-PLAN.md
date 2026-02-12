# Plan Benchmarks – Confidentialité, mobile, profil

## 1. Fichiers à créer / modifier

| Fichier | Action |
|---------|--------|
| `types/index.ts` | Ajouter `isPublic?: boolean` à `BenchmarkResult` |
| `lib/firestore/benchmarkResults.ts` | Lecture/écriture `isPublic`, `updateBenchmarkVisibility`, `listPublicBenchmarkResultsForUser`, `listRecentBenchmarkResultsForUser` |
| `firestore.indexes.json` | Index `benchmark_results`: (isPublic, performedAt desc), (updatedAt desc) |
| `firestore.rules` | Règles lecture: owner OU isPublic == true |
| `components/dashboard/AthleteDashboardView.tsx` | Mobile 4 preview, toggle Public par carte (resultId + isPublic) |
| `components/dashboard/BenchmarkCard.tsx` | Props: resultId, isPublic, onVisibilityChange |
| `app/gyms/[gymId]/members/[userId]/page.tsx` | **Créer** – Profil membre lecture seule + benchmarks publics |
| `app/gyms/[gymId]/page.tsx` | Lien membre → `/gyms/[gymId]/members/[userId]` |
| `app/benchmarks/page.tsx` | Tri A–Z / Récent, états loading/empty/error cohérents |
| Profil | Aucun champ « citoyenneté » trouvé – rien à retirer |

## 2. Modèle Firestore (inchangé, + champ)

- **`/users/{uid}`** – profil (déjà existant).
- **`/users/{uid}/benchmark_results/{resultId}`** – chaque résultat:
  - Champs existants + **`isPublic: boolean`** (défaut `true` si absent, rétro-compat).

## 3. Requêtes / helpers

- **Owner (mes benchmarks)**  
  - Existant: `listBenchmarkResultsForUser(uid, benchmarkId)`.  
  - Nouveau: `listRecentBenchmarkResultsForUser(uid, limit)` → orderBy `updatedAt` desc, limit (pour mobile 4).
- **Viewer (profil public)**  
  - **`listPublicBenchmarkResultsForUser(uid)`** → `where('isPublic', '==', true)`, orderBy `performedAt` desc.
- **Visibility**  
  - **`updateBenchmarkVisibility(uid, resultId, isPublic)`** → update uniquement `isPublic` (+ updatedAt).

## 4. Règles Firestore (extrait)

- **`users/{uid}/benchmark_results/{resultId}`**
  - **read**: `request.auth.uid == uid` OU `resource.data.isPublic == true`
  - **write**: `request.auth.uid == uid` uniquement.

## 5. Tests manuels (5–8)

1. **Mobile preview** – Réduire viewport < 768px, dashboard athlète: seulement 4 cartes benchmarks (ou 4 plus récents modifiés).
2. **Toggle Public** – Décocher "Public" sur un benchmark, recharger: le résultat reste privé pour le propriétaire; ouvrir en navigation privée avec un autre compte et aller sur le profil public du membre: ce benchmark ne doit pas apparaître.
3. **Profil public** – Depuis onglet Membres du gym, cliquer sur un membre: page profil lecture seule avec nom, photo, benchmarks **publics** uniquement.
4. **Profil non accessible** – Modifier l’URL pour un userId d’un autre gym (ou non affilié): message "Profil non accessible" (ou équivalent).
5. **Création résultat** – Nouveau résultat benchmark: créé avec `isPublic: true` par défaut.
6. **Tri / états page benchmarks** – Sur /benchmarks: choisir tri "Récent", vérifier loading puis liste; vider la recherche pour empty state.
7. **Accessibilité** – Toggle Public: label cliquable + aria-label pour lecteur d’écran.
8. **Rétro-compat** – Ancien doc sans `isPublic`: considéré public (true), pas d’erreur.

---

Implémentation ci-dessous.
