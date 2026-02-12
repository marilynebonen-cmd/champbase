# ChampBase Firestore – Production MVP

## Collections (top-level only)

| Collection      | Purpose                    | Writes on                    |
|----------------|----------------------------|------------------------------|
| `users/{uid}`  | User profile, roles, gym   | Signup (createUserIfNew), Profile update |
| `gyms/{gymId}` | Gym name, owner           | Organizer: Create gym        |
| `events/{eventId}` | Event metadata         | Organizer: Create/update event |
| `workouts/{workoutId}` | Workout per event   | Organizer: Create workout    |
| `leaderboards/{leaderboardId}` | Per workout/division | Organizer: Create leaderboard |
| `scores/{scoreId}` | Score per leaderboard (event: one leaderboard per event; gym WOD: per workout/division) | Athlete/Judge: Submit score  |
| `registrations/{regId}` | Event registration (MVP) | User: Inscribe to event |

## User document shape (production)

- `uid` (string)
- `displayName` (string)
- `email` (string)
- `roles` (map: `athlete`, `organizer` booleans)
- `gymId` (optional string)
- `createdAt`, `updatedAt` (timestamp)

App types use `affiliatedGymId`; Firestore stores/reads as `gymId`.

## Security

See project root `firestore.rules`. Deploy with:

```bash
firebase deploy --only firestore:rules
```

## Indexes

See project root `firestore.indexes.json`. Deploy with:

```bash
firebase deploy --only firestore:indexes
```

**Registrations** (for “my event registrations” query):

- **collectionGroup:** `registrations`
- **fields:** `userId` (ASC), `createdAt` (DESC)

If this index is missing, the app uses a fallback (query by `userId` only, sort by `createdAt` in memory) and shows a banner asking you to create the index.

## Leaderboard modes

- **Gym Daily WOD**: `gyms/{gymId}/wods/{wodId}/scores/{uid}` — one WOD = one leaderboard (one score column + rank).
- **Event**: One leaderboard per event (`leaderboards` with `eventId` set, `workoutId` null). Scores in `scores/` with `leaderboardId`; each score has `workoutId` (which WOD). The event leaderboard table is built in app: rows = athletes, columns = WODs, total = placement points (1st=1, 2nd=2, …; lowest wins). Real-time via `onScoresByLeaderboard(leaderboardId, callback)`.

## Firebase init

Single init in `lib/firebase.ts`. Import `auth` and `db` from `@/lib/firebase` only.
