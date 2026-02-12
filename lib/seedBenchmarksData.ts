/**
 * Official benchmarks seed data (Girls, Hero, 1RM).
 * Used by organizer seed page for idempotent import (dedup by nameLower + category).
 */
import type { BenchmarkCategory, BenchmarkScoreType } from "@/types";

export type SeedBenchmarkItem = {
  name: string;
  nameLower: string;
  category: BenchmarkCategory;
  scoreType: BenchmarkScoreType;
  timeCapSeconds?: number | null;
  descriptionRx?: string | null;
  descriptionScaled?: string | null;
  defaultTrack: "rx" | "scaled";
  movements?: string[] | null;
};

const GIRLS_NAMES = [
  "Angie",
  "Barbara",
  "Chelsea",
  "Diane",
  "Elizabeth",
  "Fran",
  "Grace",
  "Helen",
  "Isabel",
  "Jackie",
  "Karen",
  "Linda",
  "Mary",
  "Nancy",
] as const;

const HERO_NAMES = [
  "Michael",
  "Murph",
  "Josh",
  "Joshie",
  "Randy",
  "Lynne",
  "Daniel",
  "Helen",
  "Glen",
  "Tommy",
  "Roy",
  "Ryan",
  "JT",
  "Jerry",
  "Danny",
  "Jason",
  "Badger",
  "Nate",
  "Randy",
  "Josh",
] as const;

const LIFTS_1RM = [
  "Back Squat",
  "Front Squat",
  "Deadlift",
  "Bench Press",
  "Strict Press",
  "Push Press",
  "Push Jerk",
  "Split Jerk",
  "Clean",
  "Snatch",
  "Clean & Jerk",
] as const;

function girlsSeed(): SeedBenchmarkItem[] {
  return GIRLS_NAMES.map((name) => ({
    name,
    nameLower: name.toLowerCase(),
    category: "girls" as const,
    scoreType: "time_or_reps" as const,
    defaultTrack: "rx" as const,
    descriptionRx: null,
    descriptionScaled: null,
    movements: null,
    timeCapSeconds: null,
  }));
}

function heroSeed(): SeedBenchmarkItem[] {
  return [...new Set(HERO_NAMES)].map((name) => ({
    name,
    nameLower: name.toLowerCase(),
    category: "hero" as const,
    scoreType: "time_or_reps" as const,
    defaultTrack: "rx" as const,
    descriptionRx: null,
    descriptionScaled: null,
    movements: null,
    timeCapSeconds: null,
  }));
}

function oneRmSeed(): SeedBenchmarkItem[] {
  return LIFTS_1RM.map((name) => ({
    name,
    nameLower: name.toLowerCase(),
    category: "1rm" as const,
    scoreType: "weight" as const,
    defaultTrack: "rx" as const,
    descriptionRx: null,
    descriptionScaled: null,
    movements: null,
    timeCapSeconds: null,
  }));
}

export function getSeedBenchmarks(): SeedBenchmarkItem[] {
  return [...girlsSeed(), ...heroSeed(), ...oneRmSeed()];
}
