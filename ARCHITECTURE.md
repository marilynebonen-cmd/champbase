# ChampBase – Architecture & Verification

This document verifies the project against production criteria for a real gym operations platform (not a demo). It includes the architecture summary, Firestore schema, security rules, file structure, core code paths, index requirements, and setup instructions.

---

## 1. Project Vision (Verified)

- **ChampBase** allows gyms to create WODs, associate them to leaderboards, and let athletes submit scores in a secure, scalable way.
- **Gyms own content** (WODs, events, leaderboards); **athletes** only interact with what is published.
- **Data structure** is designed to scale while staying simple; **leaderboards** are built via Firestore queries (no client-side aggregation).

---

## 2. Tech Stack (Verified)

| Requirement | Status | Location |
|-------------|--------|----------|
| Next.js App Router | Yes | `app/` |
| TypeScript | Yes | `tsconfig.json`, strict types in `types/index.ts` |
| Firebase Authentication | Yes | `lib/firebase.ts`, `contexts/AuthContext.tsx` |
| Cloud Firestore | Yes | `lib/firestore/*.ts`, `lib/db/*.ts` |
| Firebase Security Rules | Yes | `firestore.rules` (see section 6) |
| No deprecated Firebase APIs | Yes | Firebase v9+ modular SDK |

---

## 3. User Roles (Verified)

### Gym / Organizer
- **Owns** one or more gyms (`gyms` where `ownerUid == uid`).
- **Can**: create WODs (subcollection + event workouts), publish/unpublish WODs, create events, view scores.
- **Never** submits scores as athlete; organizer routes are protected by `OrganizerRoute` (checks `users/{uid}.roles.organizer`).
- **Implementation**: `components/OrganizerRoute.tsx`, `app/organizer/**`.

### Athlete
- Authenticated user; can belong to one or more gyms (select gym on athlete WOD list).
- **Can**: view published WODs, submit score to a WOD, view leaderboards, edit only their own score (subcollection WODs: doc id = uid; top-level scores: rule restricts update to `athleteUid == auth.uid`).
- **Implementation**: `app/athlete/wods/`, `app/leaderboards/`, `ProtectedRoute`.

---

## 4. WOD Types (Verified)

The system supports **multiple WOD types**:

| Type | Location | Description |
|------|----------|-------------|
| **WOD du jour** (gym) | `gyms/{gymId}/wods/{wodId}` | Created by gym, not attached to event. Has its own leaderboard (scores subcollection). |
| **Event WOD** | `workouts/{workoutId}` + `leaderboards/{leaderboardId}` | Attached to an event; same leaderboard logic (one per division). |
| **Open / Sporadic** | Same as WOD du jour | `eventId` nullable on subcollection WODs; can be used for benchmarks/challenges. |

Each WOD:
- **Belongs to exactly one gym** (`gymId`).
- **Has one leaderboard** (subcollection: scores under WOD; top-level: one leaderboard per division per workout).
- **Usable with or without an event** (subcollection: `eventId` optional; top-level: `workouts.eventId` null = gym WOD).

---

## 5. Score Types & Leaderboard Logic (Verified)

| Score type | Sort order | Implementation |
|------------|------------|----------------|
| **time** | Lower is better (ascending) | `lib/firestore/wods.ts` `getWodLeaderboard(..., order: 'asc')` |
| **reps** | Higher is better (descending) | `order: 'desc'` |
| **weight** | Higher is better (descending) | `order: 'desc'` |

**Divisions**
- **Subcollection WODs**: `men_rx`, `men_scaled`, `women_rx`, `women_scaled` (`types/index.ts` `WOD_DIVISIONS`).
- **Event leaderboards**: `M_RX`, `M_SCALED`, `F_RX`, `F_SCALED` (`DIVISIONS`).

**One score per athlete per WOD**
- Subcollection: document ID = `athleteUid` (`gyms/{gymId}/wods/{wodId}/scores/{uid}`).
- Top-level scores: one document per submission; uniqueness enforced by app/rule (e.g. single create per athlete per leaderboard; update allowed only for own score).

---

## 6. Firestore Data Model

### Preferred structure (WOD du jour – implemented)

```
gyms/{gymId}
  fields: name, city?, country?, ownerUid, createdAt, updatedAt

gyms/{gymId}/wods/{wodId}
  fields: title, description?, scoreType (time|reps|weight), createdAt, createdByUid, isPublished, eventId?

gyms/{gymId}/wods/{wodId}/scores/{uid}   ← doc id = athlete uid (1 score per athlete per WOD)
  fields: uid, displayName, division, value (number), valueRaw?, createdAt, updatedAt
```

**Why this structure**
- **Locality**: All WOD and score data for a gym lives under that gym; easy to reason about and secure by path.
- **Scale**: One gym rarely has millions of WODs; scores per WOD are bounded by athletes. Subcollections keep reads scoped.
- **CollectionGroup**: When listing “all published WODs” across gyms, use `collectionGroup('wods')` with `where('isPublished','==',true)` (index required).

### Event / competition path (also implemented)

```
events/{eventId}
  fields: gymId, title, description?, type, status, isPublic, startDate, endDate, createdByUid, ...

workouts/{workoutId}
  fields: gymId, eventId?, name, description?, scoreType, unit, deadline?, ...

leaderboards/{leaderboardId}
  fields: gymId, eventId?, workoutId, division (M_RX|...), isPublic, ...

scores (top-level)
  fields: gymId, eventId?, leaderboardId, workoutId, athleteUid, athleteName, division, scoreType, scoreValue, submittedByUid, submissionType, ...
```

**Example documents** (subcollection path)

**gyms/abc123**
```json
{ "name": "CrossFit Box", "ownerUid": "user1", "createdAt": "<ts>", "updatedAt": "<ts>" }
```

**gyms/abc123/wods/wod1**
```json
{
  "title": "Fran",
  "description": "21-15-9 thrusters and pull-ups",
  "scoreType": "time",
  "createdAt": "<ts>",
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
  "createdAt": "<ts>",
  "updatedAt": "<ts>"
}
```

---

## 7. Firebase Security Rules (Production-Ready)

Rules enforce:
- **Authenticated** read for published WODs; only **gym owners** create/update/delete WODs and subcollection scores (athlete: only own score doc).
- **Events**: read if public or creator; write only creator.
- **Workouts / leaderboards**: create only by gym owner or event creator; read as needed for public leaderboards.
- **Scores (top-level)**: read if leaderboard is public; create when athlete submits own or judge submits; **update only when athleteUid == auth.uid** (athlete edits own score).

See file `firestore.rules` (updated below). Deploy with: `firebase deploy --only firestore:rules`.

---

## 8. Anti-Cheat (Realistic)

- **Current (basic)**: Client-side write with strict Firestore rules (division enum, value type, doc id = uid for subcollection). No delete for scores.
- **Recommended next step**: Cloud Function `submitScore(gymId, wodId)` or `submitScoreEvent(leaderboardId)` to enforce 1 score per athlete, optional update window, and server timestamps. Trade-off: simpler ops vs. stronger guarantee; for many gyms the current rules are acceptable.

---

## 9. Required UI Pages (Verified)

| Screen | Route | Who | Status |
|--------|--------|-----|--------|
| Organizer – create WOD | `/organizer/wods/new` | Organizer | Yes |
| Organizer – publish/unpublish WOD | Subcollection WOD: update `isPublished` (organizer view); Event WODs via event page | Organizer | Yes |
| Organizer – view leaderboard | Subcollection: `/athlete/wods/[wodId]?gymId=`; Event: `/leaderboards/[leaderboardId]` | Organizer | Yes |
| Athlete – list WODs for gym | `/athlete/wods` (select gym → list published WODs) | Athlete | Yes |
| Athlete – WOD detail | `/athlete/wods/[wodId]?gymId=` | Athlete | Yes |
| Athlete – submit score | Same page (form + `setWodScore`); event path: `/scores/submit` or leaderboard page | Athlete | Yes |
| Leaderboard – division filter, sort, “my rank” | `/athlete/wods/[wodId]`: division selector, order by value, `getMyRank` | Athlete | Yes |

---

## 10. Performance & Queries

- **Firestore**: All list/leaderboard queries use `where`, `orderBy`, `limit`. No full collection scans.
- **Indexes**: Composite indexes in `firestore.indexes.json` for events, gyms, workouts, leaderboards, scores (including `division` + `value` for leaderboards), wods, registrations. Subcollection scores use same index (collection group `scores`).
- **Pagination**: Leaderboard uses `limit(PAGE_SIZE)`; cursor-based can be added via `startAfter` snapshot.
- **Fallbacks**: If index missing, code falls back to filter-only query and sorts in memory (e.g. `getPublishedWodsByGym`, `getWodLeaderboard`).

---

## 11. Next.js File Structure

```
app/
  layout.tsx
  page.tsx
  globals.css
  (protected)/page.tsx
  auth/login/, signup/
  login/, signup/
  dashboard/page.tsx
  profile/page.tsx
  events/page.tsx, events/[eventId]/page.tsx
  leaderboards/page.tsx, leaderboards/[leaderboardId]/page.tsx
  scores/submit/page.tsx
  athlete/
    wods/page.tsx, wods/[wodId]/page.tsx
    leaderboards/page.tsx, SubmitScoreForm.tsx
  organizer/
    page.tsx
    gyms/page.tsx, gyms/new/page.tsx, create/page.tsx
    events/new/page.tsx, events/[eventId]/page.tsx, create/page.tsx
    wods/new/page.tsx
    workouts/new/page.tsx, create/page.tsx
    leaderboards/create/page.tsx
    seed-workouts/page.tsx
components/
  OrganizerRoute.tsx, ProtectedRoute.tsx
  ui/Layout.tsx, Card.tsx, Avatar.tsx, Logo.tsx
contexts/
  AuthContext.tsx, ToastContext.tsx
lib/
  firebase.ts
  db/index.ts, db/gyms.ts, db/events.ts, db/workouts.ts, db/leaderboards.ts, db/wods.ts
  firestore/index.ts, firestore/gyms.ts, firestore/events.ts, firestore/wods.ts,
    firestore/workouts.ts, firestore/leaderboards.ts, firestore/scores.ts, firestore/users.ts, firestore/registrations.ts
  scoreValidation.ts, wodScoreUtils.ts
types/
  index.ts
firestore.rules
firestore.indexes.json
firebase.json
```

---

## 12. Core Code Paths

| Concern | File(s) |
|---------|--------|
| Firebase init | `lib/firebase.ts` |
| WOD creation (subcollection) | `lib/firestore/wods.ts` `createWod` |
| WOD creation (event) | `lib/firestore/workouts.ts` `createWorkout`; `lib/firestore/leaderboards.ts` `createLeaderboardsForWorkout` |
| Score submission (subcollection) | `lib/firestore/wods.ts` `setWodScore` |
| Score submission (event/top-level) | `lib/firestore/scores.ts` `submitScore` |
| Leaderboard query (subcollection) | `lib/firestore/wods.ts` `getWodLeaderboard`, `getMyRank` |
| Leaderboard query (top-level) | `lib/firestore/scores.ts` `getScoresByLeaderboard` |
| Score validation | `lib/scoreValidation.ts` (TIME/REPS/WEIGHT); `lib/wodScoreUtils.ts` (parse/format for WOD) |

---

## 13. Index Requirements

Deploy: `npm run firestore:indexes` or `firebase deploy --only firestore:indexes`.

| Collection / Group | Fields | Purpose |
|--------------------|--------|--------|
| events | status ASC, startDate DESC | Published events |
| events | createdByUid ASC, createdAt DESC | Creator’s events |
| gyms | ownerUid ASC, createdAt DESC | Gyms by owner |
| workouts | gymId ASC, createdAt DESC | Workouts by gym |
| workouts | eventId ASC, createdAt ASC | Workouts by event |
| leaderboards | eventId ASC, createdAt ASC | Leaderboards by event |
| leaderboards | workoutId ASC, division ASC | By workout + division |
| leaderboards | workoutId ASC, createdAt ASC | By workout |
| scores | leaderboardId ASC, createdAt ASC | Scores by leaderboard |
| scores | athleteUid ASC, createdAt DESC | Scores by athlete |
| scores | division ASC, value ASC/DESC | Leaderboard sort (subcollection or group) |
| wods | isPublished ASC, createdAt DESC | Published WODs by gym |
| registrations | userId ASC, createdAt DESC | Registrations by user |

---

## 14. Setup Instructions

1. **Clone & install**
   ```bash
   cd champbase
   npm install
   ```

2. **Firebase project**
   - Create a project at [Firebase Console](https://console.firebase.google.com).
   - Enable **Authentication** (e.g. Email/Password).
   - Create **Firestore** database (mode test or production).

3. **Environment**
   - Copy `.env.example` to `.env.local` (or create `.env.local`).
   - Set `NEXT_PUBLIC_FIREBASE_API_KEY`, `AUTH_DOMAIN`, `PROJECT_ID`, `STORAGE_BUCKET`, `MESSAGING_SENDER_ID`, `APP_ID`.

4. **Deploy Firestore**
   ```bash
   npx firebase use --add   # select project
   npm run firestore       # rules + indexes
   ```
   Or: `firebase deploy --only firestore:rules` and `firebase deploy --only firestore:indexes`.

5. **Run app**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000. Sign up, set **Organizer** role in Dashboard, create a gym and WODs; use another user as athlete to submit scores.

---

## 15. Verification Summary

| Criterion | Status |
|-----------|--------|
| Real gym operations (not demo) | Yes – roles, gym-owned content, events, WODs |
| Next.js App Router + TypeScript | Yes |
| Firebase Auth + Firestore + Rules | Yes |
| Organizer: create WOD, publish, view leaderboard; no score submit | Yes |
| Athlete: view WODs, submit score, view leaderboard, edit own score | Yes (own-score edit: subcollection; top-level in rules) |
| Multiple WOD types (gym, event, open) | Yes |
| Score types: time/reps/weight; divisions | Yes |
| Firestore schema: gyms/wods/scores subcollection + events/workouts/leaderboards/scores | Yes |
| Security rules: auth, ownership, athlete own score only | Yes (rules tightened in firestore.rules) |
| Indexes defined; no full scans | Yes |
| Required UI pages | Yes |
