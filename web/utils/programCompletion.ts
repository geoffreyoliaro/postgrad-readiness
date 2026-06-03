import type { ProfileProgramSummary } from "~/types/api";

/** True when every required checklist item is complete for a started program. */
export function isProgramSummaryComplete(
  summary: ProfileProgramSummary | null | undefined
): boolean {
  if (summary == null) {
    return false;
  }
  const { readinessScore, completedRequired, totalRequired } = summary;
  if (
    typeof readinessScore !== "number" ||
    typeof completedRequired !== "number" ||
    typeof totalRequired !== "number"
  ) {
    return false;
  }
  return (
    readinessScore === 1 ||
    (totalRequired > 0 && completedRequired === totalRequired)
  );
}
