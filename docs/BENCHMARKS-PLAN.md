# Plan Benchmarks – Fichiers et schéma

## 1. Fichiers à créer / modifier

### Types
- **`types/index.ts`** — Ajouter `Benchmark`, `BenchmarkWithId`, `BenchmarkResult`, `BenchmarkResultWithId`, constantes catégories et score types.

### Firestore
- **`lib/firestore/benchmarks.ts`** — CRUD benchmarks: `listBenchmarks`, `getBenchmark`, `createBenchmark`, `updateBenchmark`, `deleteBenchmark`.
- **`lib/firestore/benchmarkResults.ts`** — Sous-collection `users/{uid}/benchmark_results`: `addBenchmarkResult`, `listBenchmarkResultsForUser`, `getBenchmarkResult`, `updateBenchmarkResult`, `deleteBenchmarkResult`.

### DB
- **`lib/db/index.ts`** — Exporter `@/lib/firestore/benchmarks` et `@/lib/firestore/benchmarkResults`.

### Règles
- **`firestore.rules`** — Lecture benchmarks (public ou auth), écriture benchmarks (organizer). Lecture/écriture `users/{uid}/benchmark_results` (propriétaire uniquement).

### Indexes
- **`firestore.indexes.json`** — Index pour `benchmarks` (category, nameLower) et pour `users/{uid}/benchmark_results` (benchmarkId, performedAt desc).

### Pages / composants
- **`app/benchmarks/page.tsx`** — Liste: recherche, filtres (Girls / Hero / 1RM / Open / Autres), pagination, cartes avec « Voir description » (Dialog) et « Voir » → `/benchmarks/[id]`.
- **`app/benchmarks/[id]/page.tsx`** — Fiche benchmark: nom, tags, « Voir description », « Entrer un résultat », section PR, historique (pour l’athlète connecté).
- **`components/benchmarks/BenchmarkDescriptionDialog.tsx`** — Modal avec onglets RX / Scaled (ou toggle), contenu `descriptionRx` / `descriptionScaled`.
- **`components/benchmarks/BenchmarkResultFormModal.tsx`** — Modal saisie résultat: track (RX/Scaled), type (time/reps/weight), champs selon type, date, note. Save → `addBenchmarkResult` ou `updateBenchmarkResult`.
- **`components/benchmarks/BenchmarkCard.tsx`** — Carte compacte liste (nom, category, scoreType, boutons). Optionnel si la liste est inline.

### Seed
- **`scripts/seed-benchmarks.ts`** — Script Node (ou appel API) pour importer Girls, Hero, 1RM (idempotent par nameLower + category). Ou **`app/organizer/benchmarks/seed/page.tsx`** — Bouton « Importer benchmarks officiels » (organizer only) qui appelle les creates.

---

## 2. Schéma Firestore final

### Collection `benchmarks`
| Champ | Type | Description |
|-------|------|-------------|
| name | string | Nom affiché (ex. "Fran", "Back Squat") |
| nameLower | string | Nom en minuscules pour recherche (ex. "fran") |
| category | string | "girls" \| "hero" \| "1rm" \| "open" \| "custom" |
| scoreType | string | "time" \| "reps" \| "weight" \| "time_or_reps" \| "custom" |
| timeCapSeconds | number \| null | Time cap en secondes (optionnel) |
| descriptionRx | string \| null | Description RX (longue) |
| descriptionScaled | string \| null | Description Scaled |
| defaultTrack | string | "rx" \| "scaled" |
| movements | string[] \| null | Liste des mouvements (optionnel) |
| source | string | "seed" \| "user" |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### Sous-collection `users/{uid}/benchmark_results`
| Champ | Type | Description |
|-------|------|-------------|
| benchmarkId | string | Référence benchmark |
| track | string | "rx" \| "scaled" |
| scoreType | string | Aligné sur le benchmark |
| timeSeconds | number \| null | Pour scoreType "time" ou "time_or_reps" |
| reps | number \| null | Pour "reps" ou "time_or_reps" (rounds/reps) |
| weight | number \| null | Pour "weight" (1RM) |
| unit | string \| null | "lb" \| "kg" |
| completedWithinTimeCap | boolean \| null | Si time cap utilisé |
| performedAt | timestamp | Date du résultat |
| note | string \| null | Note optionnelle |
| createdAt | timestamp | |
| updatedAt | timestamp | |

---

## 3. Index Firestore

```json
{
  "indexes": [
    {
      "collectionGroup": "benchmarks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "nameLower", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "benchmark_results",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "benchmarkId", "order": "ASCENDING" },
        { "fieldPath": "performedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

Note: `benchmark_results` est une sous-collection de `users`, donc l’index est sur la collection group `benchmark_results` avec `benchmarkId` + `performedAt`.

---

## 4. Ordre d’implémentation

1. Types + Firestore (benchmarks + benchmark_results) + rules + indexes
2. Page `/benchmarks` (liste, recherche, filtres, dialog description)
3. Page `/benchmarks/[id]` (détail, PR, historique, bouton « Entrer un résultat »)
4. Modal saisie résultat (create/update) + affichage PR/historique
5. Seed (script ou page organizer)
