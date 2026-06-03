/**
 * Pure readiness computations — no database access.
 *
 * Rules (see README):
 *   dueDate = applicationDeadline − dueOffsetDays (UTC calendar days)
 *   readinessScore = completedRequired / totalRequired
 *   timeline = one event per requirement, sorted earliest-first (derived, not stored)
 */
import type {
  ChecklistItem,
  ChecklistItemView,
  ReadinessResponse,
  Requirement,
  TimelineEvent,
} from "./types.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Earliest due date first; ties broken by title for stable ordering. */
export function compareTimelineEvents(
  a: Pick<TimelineEvent, "date" | "title">,
  b: Pick<TimelineEvent, "date" | "title">
): number {
  const byDate = a.date.localeCompare(b.date);
  if (byDate !== 0) {
    return byDate;
  }
  return a.title.localeCompare(b.title);
}

export function computeDueDate(
  applicationDeadline: string,
  dueOffsetDays: number
): string {
  // Interpret deadline as UTC midnight, then walk back by whole days.
  const deadline = new Date(`${applicationDeadline}T00:00:00Z`);
  const due = new Date(deadline.getTime() - dueOffsetDays * MS_PER_DAY);
  return due.toISOString().slice(0, 10);
}

export function joinChecklist(
  reqs: Requirement[],
  items: ChecklistItem[],
  applicationDeadline: string
): ChecklistItemView[] {
  const itemByReq = new Map(items.map((i) => [i.requirementId, i]));
  return reqs
    .map((r) => {
      const item = itemByReq.get(r.id);
      if (item === undefined) {
        throw new Error(
          `Missing checklist item for requirement ${r.id}. Checklist is out of sync with program requirements.`
        );
      }
      const dueDate = computeDueDate(applicationDeadline, r.dueOffsetDays);
      return {
        ...item,
        requirement: r,
        dueDate,
      };
    })
    .sort(
      (a, b) =>
        a.dueDate.localeCompare(b.dueDate) ||
        a.requirement.title.localeCompare(b.requirement.title)
    );
}

export function computeReadinessScore(
  reqs: Requirement[],
  items: ChecklistItem[]
): { score: number; completed: number; total: number } {
  const required = reqs.filter((r) => r.required);
  const total = required.length;
  if (total === 0) {
    return { score: 1, completed: 0, total: 0 };
  }
  const completedIds = new Set(
    items.filter((i) => i.status === "COMPLETE").map((i) => i.requirementId)
  );
  const completed = required.filter((r) => completedIds.has(r.id)).length;
  return { score: completed / total, completed, total };
}

export function computeMissing(
  reqs: Requirement[],
  items: ChecklistItem[]
): Requirement[] {
  const completedIds = new Set(
    items.filter((i) => i.status === "COMPLETE").map((i) => i.requirementId)
  );
  return reqs.filter((r) => r.required && !completedIds.has(r.id));
}

export function computeTimeline(
  reqs: Requirement[],
  items: ChecklistItem[],
  applicationDeadline: string
): TimelineEvent[] {
  const itemByReq = new Map(items.map((i) => [i.requirementId, i]));
  const events: TimelineEvent[] = reqs.map((r) => {
    const item = itemByReq.get(r.id);
    return {
      id: `evt-${r.id}`,
      title: r.title,
      date: computeDueDate(applicationDeadline, r.dueOffsetDays),
      status: item !== undefined ? item.status : "NOT_STARTED",
      relatedRequirementId: r.id,
    };
  });
  events.sort(compareTimelineEvents);
  return events;
}

export function computeNextMilestones(
  timeline: TimelineEvent[],
  n = 3
): TimelineEvent[] {
  // Timeline is already chronological; take the first N incomplete events.
  return timeline.filter((e) => e.status !== "COMPLETE").slice(0, n);
}

export function computeReadiness(
  reqs: Requirement[],
  items: ChecklistItem[],
  applicationDeadline: string
): ReadinessResponse {
  const { score, completed, total } = computeReadinessScore(reqs, items);
  const timeline = computeTimeline(reqs, items, applicationDeadline);
  return {
    readinessScore: score,
    completedRequired: completed,
    totalRequired: total,
    missingRequirements: computeMissing(reqs, items),
    nextMilestones: computeNextMilestones(timeline, 3),
  };
}
