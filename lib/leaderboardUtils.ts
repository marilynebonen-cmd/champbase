import type { UserProfile } from "@/types";

/**
 * Display name for leaderboard rows: firstName + lastName, fallback to email.
 * Used by both Daily WOD leaderboard and Event leaderboard.
 */
export function getAthleteDisplayName(profile: UserProfile | null | undefined): string {
  if (!profile) return "—";
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (profile.email) return profile.email;
  if (profile.displayName) return profile.displayName;
  return "—";
}
