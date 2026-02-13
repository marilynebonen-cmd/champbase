/**
 * DB layer – re-exports from Firestore and db-specific modules.
 * Use: import { getGym, createEvent, ... } from "@/lib/db";
 */
export * from "./gyms";
export * from "./events";
export * from "./workouts";
export * from "./leaderboards";
export * from "./wods";
export * from "@/lib/firestore/users";
export * from "@/lib/firestore/scores";
export * from "@/lib/firestore/registrations";
export * from "@/lib/firestore/feed";
export * from "@/lib/firestore/gymFeed";
export * from "@/lib/firestore/benchmarks";
export * from "@/lib/firestore/benchmarkResults";
export * from "@/lib/firestore/skills";
export * from "@/lib/firestore/skillVisibility";
export * from "@/lib/firestore/gymRoles";
export {
  getUserWeightBenchmarks,
  type UserWeightBenchmark,
} from "@/lib/getUserWeightBenchmarks";
