/**
 * DB helpers: workouts. Re-exports from Firestore.
 */
export {
  getWorkout,
  getWorkoutsByEvent,
  getWorkoutsByGym,
  createWorkout,
  updateWorkout,
  deleteWorkout,
} from "@/lib/firestore/workouts";
