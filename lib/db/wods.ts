/**
 * DB helpers: WODs (subcollection under gyms) and WOD scores. Re-exports from Firestore.
 */
export {
  getWod,
  getPublishedWodsByGym,
  getAllWodsByGym,
  createWod,
  updateWod,
  deleteWod,
  getWodScore,
  setWodScore,
  getWodLeaderboard,
  getWodLeaderboardAllDivisions,
  getWodLeaderboardByTrack,
  getMyRank,
} from "@/lib/firestore/wods";
export type { WodLeaderboardTrack } from "@/lib/firestore/wods";
