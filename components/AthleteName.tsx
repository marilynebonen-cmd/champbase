"use client";

import type { UserProfile } from "@/types";
import { getAthleteDisplayName } from "@/lib/leaderboardUtils";

type Props = {
  /** Athlete user id (uid). */
  athleteId: string;
  /** Map of uid -> UserProfile from batch getUsersByIds. Use this so all leaderboards display firstName + lastName (fallback to email). */
  athletesMap: Map<string, UserProfile>;
  className?: string;
};

/**
 * Renders athlete display name for leaderboard rows: firstName + lastName, fallback to email.
 * Parent must batch-fetch users with getUsersByIds(leaderboardRowUids) and pass the map.
 * Use this in any leaderboard (Daily WOD, Event, or future) for consistent name display.
 */
export function AthleteName({ athleteId, athletesMap, className = "" }: Props) {
  const profile = athletesMap.get(athleteId);
  return <span className={className}>{getAthleteDisplayName(profile)}</span>;
}
