# ChampBase — WOD + Leaderboard Architecture

## Summary

- **Option A (implemented)**: WODs and scores live as **subcollections under gyms**.
- **Flow**: Gym owner creates a WOD → one leaderboard per WOD (the `scores` subcollection). Athletes submit one score per WOD (doc id = `uid`). Leaderboard = query scores by division, ordered by value (time: asc, reps/weight: desc).
- **Anti-cheat**: Client write with strict Firestore rules (athlete can only write `scores/{uid}` where `uid == request.auth.uid`). Optional next step: Cloud Function `submitScore(gymId, wodId)` for server-validated writes.

---

## Firestore Structure (Option A)

```
gyms/{gymId}
  fields: name, city?, country?, ownerUid, createdAt, updatedAt

gyms/{gymId}/wods/{wodId}
  fields: title, description?, scoreType ("time"|"reps"|"weight"), createdAt, createdByUid, isPublished, eventId? (nullable)

gyms/{gymId}/wods/{wodId}/scores/{uid}   ← doc id MUST be athlete uid (one score per WOD)
  fields: uid, displayName, division (men_rx|men_scaled|women_rx|women_scaled), value (number), valueRaw? (string), createdAt, updatedAt
```

### Example documents

**gyms/abc123**
```json
{ "name": "CrossFit Box", "ownerUid": "user1", "createdAt": "...", "updatedAt": "..." }
```

**gyms/abc123/wods/wod1**
```json
{
  "title": "Fran",
  "description": "21-15-9 thrusters and pull-ups",
  "scoreType": "time",
  "createdAt": "...",
  "createdByUid": "user1",
  "isPublished": true,
  "eventId": null
}
```

**gyms/abc123/wods/wod1/scores/athleteUid1**
```json
{
  "uid": "athleteUid1",
  "displayName": "Jane Doe",
  "division": "women_rx",
  "value": 225,
  "valueRaw": "3:45",
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

## Indexes (firestore.indexes.json)

| Collection group | Fields | Purpose |
|------------------|--------|---------|
| `wods` | isPublished ASC, createdAt DESC | List published WODs for a gym |
| `scores` | division ASC, value ASC | Leaderboard (time: lower better) |
| `scores` | division ASC, value DESC | Leaderboard (reps/weight: higher better) |

**Deploy indexes**: `firebase deploy --only firestore:indexes`

Fallbacks in code: if the query fails with "requires an index", we retry without `orderBy` and sort in memory (see `getPublishedWodsByGym`, `getWodLeaderboard`).

---

## Security Rules (excerpt)

- **gyms/{gymId}/wods/{wodId}**: Read if authenticated and (WOD is published OR user is creator OR user is gym owner). Create only if gym owner and `createdByUid == request.auth.uid` and valid `scoreType`/`isPublished`. Update/delete only gym owner.
- **gyms/{gymId}/wods/{wodId}/scores/{uid}**: Read if authenticated. Create/update only if `request.auth.uid == uid` (doc id) and valid `division`, `value` (number), `displayName`. No delete.

---

## Queries

1. **Get published WODs for gym**: `collection(gyms, gymId, "wods")` → `where("isPublished", "==", true)`, `orderBy("createdAt", "desc")`, `limit(50)`.
2. **Get leaderboard**: `collection(gyms, gymId, "wods", wodId, "scores")` → `where("division", "==", division)`, `orderBy("value", asc|desc)`, `limit(N)`. Time: asc; reps/weight: desc.
3. **My rank**: Fetch all scores for division (or use a count query if needed), then count how many are better than my value + 1.

---

## How to run

1. `npm install`
2. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_FIREBASE_*` keys.
3. `npm run dev` — open http://localhost:3000.
4. Deploy Firestore rules: `firebase deploy --only firestore:rules`
5. Deploy indexes: `firebase deploy --only firestore:indexes`

---

## UI Routes

| Route | Who | Description |
|-------|-----|-------------|
| `/organizer/wods/new` | Organizer | Create WOD (select gym, title, scoreType, isPublished). |
| `/athlete/wods` | Athlete | Select gym → list published WODs. |
| `/athlete/wods/[wodId]?gymId=xxx` | Athlete | WOD detail, submit/update score, leaderboard by division, load more. |

Dashboard links: Organizer → "Créer un WOD (leaderboard auto)"; Athlete → "WODs & leaderboards".
