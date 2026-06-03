import { describe, expect, it } from "vitest";
import {
  compareTimelineEvents,
  computeDueDate,
  computeMissing,
  computeNextMilestones,
  computeReadiness,
  computeReadinessScore,
  computeTimeline,
  joinChecklist,
} from "../src/readiness.js";
import type { ChecklistItem, Requirement } from "../src/types.js";

const reqs: Requirement[] = [
  {
    id: "r1",
    programId: "p",
    type: "TRANSCRIPT",
    title: "Transcripts",
    description: "",
    dueOffsetDays: 14,
    required: true,
    evidenceType: "FILE",
  },
  {
    id: "r2",
    programId: "p",
    type: "ESSAY",
    title: "Statement",
    description: "",
    dueOffsetDays: 7,
    required: true,
    evidenceType: "FILE",
  },
  {
    id: "r3",
    programId: "p",
    type: "TEST_SCORE",
    title: "Optional GRE",
    description: "",
    dueOffsetDays: 21,
    required: false,
    evidenceType: "TEXT",
  },
];

function makeItem(
  requirementId: string,
  status: ChecklistItem["status"]
): ChecklistItem {
  return {
    id: `item-${requirementId}`,
    checklistId: "cl",
    requirementId,
    status,
    notes: null,
    counselorNotes: null,
    updatedAt: "2026-06-02T00:00:00Z",
  };
}

describe("computeDueDate", () => {
  it("subtracts the offset from the deadline", () => {
    expect(computeDueDate("2027-12-01", 14)).toBe("2027-11-17");
  });

  it("returns the deadline when offset is 0", () => {
    expect(computeDueDate("2027-12-01", 0)).toBe("2027-12-01");
  });
});

describe("computeReadinessScore", () => {
  it("ignores optional requirements", () => {
    const items = [makeItem("r1", "COMPLETE"), makeItem("r3", "COMPLETE")];
    const result = computeReadinessScore(reqs, items);
    expect(result).toEqual({ score: 0.5, completed: 1, total: 2 });
  });

  it("is 1 when all required items are complete", () => {
    const items = [
      makeItem("r1", "COMPLETE"),
      makeItem("r2", "COMPLETE"),
      makeItem("r3", "NOT_STARTED"),
    ];
    expect(computeReadinessScore(reqs, items).score).toBe(1);
  });

  it("is 0 when nothing is complete", () => {
    const items = reqs.map((r) => makeItem(r.id, "NOT_STARTED"));
    expect(computeReadinessScore(reqs, items).score).toBe(0);
  });
});

describe("computeMissing", () => {
  it("returns required requirements that aren't complete", () => {
    const items = [makeItem("r1", "COMPLETE"), makeItem("r2", "IN_PROGRESS")];
    const missing = computeMissing(reqs, items);
    expect(missing.map((r) => r.id)).toEqual(["r2"]);
  });
});

describe("compareTimelineEvents", () => {
  it("sorts by date then title", () => {
    expect(
      compareTimelineEvents(
        { date: "2027-11-24", title: "B" },
        { date: "2027-11-10", title: "A" }
      )
    ).toBeGreaterThan(0);
    expect(
      compareTimelineEvents(
        { date: "2027-11-24", title: "Alpha" },
        { date: "2027-11-24", title: "Beta" }
      )
    ).toBeLessThan(0);
  });
});

describe("computeTimeline", () => {
  it("orders events by date ascending", () => {
    const items = reqs.map((r) => makeItem(r.id, "NOT_STARTED"));
    const timeline = computeTimeline(reqs, items, "2027-12-01");
    expect(timeline.map((e) => e.relatedRequirementId)).toEqual([
      "r3",
      "r1",
      "r2",
    ]);
    for (let i = 1; i < timeline.length; i++) {
      expect(
        compareTimelineEvents(timeline[i - 1]!, timeline[i]!)
      ).toBeLessThanOrEqual(0);
    }
  });
});

describe("joinChecklist", () => {
  it("orders checklist items by due date ascending", () => {
    const items = reqs.map((r) => makeItem(r.id, "NOT_STARTED"));
    const views = joinChecklist(reqs, items, "2027-12-01");
    expect(views.map((v) => v.requirementId)).toEqual(["r3", "r1", "r2"]);
  });
});

describe("computeNextMilestones", () => {
  it("excludes completed events", () => {
    const items = [
      makeItem("r1", "COMPLETE"),
      makeItem("r2", "NOT_STARTED"),
      makeItem("r3", "IN_PROGRESS"),
    ];
    const timeline = computeTimeline(reqs, items, "2027-12-01");
    const next = computeNextMilestones(timeline, 3);
    expect(next.map((e) => e.relatedRequirementId)).toEqual(["r3", "r2"]);
  });
});

describe("computeReadiness", () => {
  it("bundles score, missing, and next milestones", () => {
    const items = [
      makeItem("r1", "COMPLETE"),
      makeItem("r2", "NOT_STARTED"),
      makeItem("r3", "NOT_STARTED"),
    ];
    const result = computeReadiness(reqs, items, "2027-12-01");
    expect(result.readinessScore).toBe(0.5);
    expect(result.missingRequirements.map((r) => r.id)).toEqual(["r2"]);
    expect(result.nextMilestones[0]?.relatedRequirementId).toBe("r3");
  });
});
