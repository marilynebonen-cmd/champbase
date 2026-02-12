/**
 * DB helpers: gyms. Re-exports from Firestore.
 */
export {
  getGym,
  getGymFromServer,
  getGymsByOwner,
  getGymsList,
  createGym,
  updateGym,
  updateGymImageUrl,
  updateGymPhoto,
  deleteGym,
} from "@/lib/firestore/gyms";
