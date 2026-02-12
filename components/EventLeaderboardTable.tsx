"use client";

import type { EventLeaderboardTable as TableType } from "@/types/eventLeaderboard";
import type { UserProfile } from "@/types";
import { AthleteName } from "@/components/AthleteName";

type Props = {
  table: TableType;
  /** Map of athleteUid -> UserProfile for displaying firstName + lastName (batch-fetched by parent). */
  athletesMap?: Map<string, UserProfile>;
  className?: string;
};

/**
 * Renders the event leaderboard as a matrix: rows = athletes, columns = WODs, total column.
 * Each cell shows placement (rank) + raw score; total = sum of placement points (lower wins).
 */
export function EventLeaderboardTable({ table, athletesMap, className = "" }: Props) {
  const { columns, rows, division } = table;

  return (
    <div className={`overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 ${className}`}>
      <table className="w-full min-w-[600px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--card-border)]">
            <th className="text-left py-2 px-2 font-semibold text-[var(--foreground)] bg-[var(--card)]">
              #
            </th>
            <th className="text-left py-2 px-2 font-semibold text-[var(--foreground)] bg-[var(--card)] min-w-[120px]">
              Athlète
            </th>
            {columns.map((col) => (
              <th
                key={col.workoutId}
                className="text-left py-2 px-2 font-semibold text-[var(--foreground)] whitespace-nowrap"
              >
                {col.workoutName}
                {col.unit && (
                  <span className="block text-xs font-normal text-[var(--muted)]">{col.unit}</span>
                )}
              </th>
            ))}
            <th className="text-left py-2 px-2 font-semibold text-[var(--accent)]">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.athleteUid}
              className="border-b border-[var(--card-border)] hover:bg-[var(--background)]/50"
            >
              <td className="py-2 px-2 font-medium text-[var(--foreground)] bg-[var(--card)]">
                {row.overallRank}
              </td>
              <td className="py-2 px-2 text-[var(--foreground)] bg-[var(--card)]">
                {athletesMap ? (
                  <AthleteName athleteId={row.athleteUid} athletesMap={athletesMap} />
                ) : (
                  row.athleteName
                )}
              </td>
              {columns.map((col) => {
                const cell = row.wodCells[col.workoutId];
                if (!cell || cell.rankInWod === 0) {
                  return (
                    <td key={col.workoutId} className="py-2 px-2 text-[var(--muted)]">
                      —
                    </td>
                  );
                }
                return (
                  <td key={col.workoutId} className="py-2 px-2">
                    <span className="font-medium text-[var(--accent)]" title="Placement (points)">
                      {cell.rankInWod}
                    </span>
                    {cell.scoreDisplay && (
                      <span className="text-[var(--muted)] ml-1 text-xs">
                        ({cell.scoreDisplay})
                      </span>
                    )}
                  </td>
                );
              })}
              <td className="py-2 px-2 font-semibold text-[var(--foreground)]">
                {row.totalPoints}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="text-[var(--muted)] text-sm py-4 text-center">
          Aucun score pour la division {division} pour le moment.
        </p>
      )}
    </div>
  );
}
