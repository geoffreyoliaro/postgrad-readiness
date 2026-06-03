import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/server.js";

interface ProfileResponse {
  id: string;
  email: string;
}

interface AuthResponse {
  profile: ProfileResponse;
  token: string;
}

interface ChecklistItemView {
  requirementId: string;
  status: string;
  dueDate: string;
  requirement: { id: string; required: boolean; title: string };
}

interface ChecklistResponse {
  items: ChecklistItemView[];
}

interface ReadinessResponse {
  readinessScore: number;
  completedRequired: number;
  totalRequired: number;
  missingRequirements: { id: string }[];
  nextMilestones: { relatedRequirementId: string }[];
}

async function register(
  app: FastifyInstance,
  overrides: Partial<{ name: string; email: string; password: string }> = {}
): Promise<AuthResponse & { headers: { authorization: string } }> {
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/register",
    payload: {
      name: overrides.name ?? "Test Student",
      email: overrides.email ?? `student-${Date.now()}-${Math.random()}@example.com`,
      password: overrides.password ?? "correcthorse",
      educationLevel: "BACHELOR",
      targetTerm: "Fall 2027",
    },
  });
  if (res.statusCode !== 201) {
    throw new Error(`register failed: ${res.statusCode} ${res.body}`);
  }
  const body = res.json() as AuthResponse;
  return {
    ...body,
    headers: { authorization: `Bearer ${body.token}` },
  };
}

describe("api flow: profile -> checklist -> mark complete -> score updates", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ dbFile: ":memory:", logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  it("walks the happy path", async () => {
    const auth = await register(app);

    const programsRes = await app.inject({
      method: "GET",
      url: "/api/programs?degreeType=MS",
    });
    expect(programsRes.statusCode).toBe(200);
    const programsBody = programsRes.json() as { items: { id: string }[] };
    expect(programsBody.items.length).toBeGreaterThan(0);
    const programId = programsBody.items[0]!.id;

    const checklistRes = await app.inject({
      method: "POST",
      url: `/api/profiles/${auth.profile.id}/checklists`,
      payload: { programId },
      headers: auth.headers,
    });
    expect(checklistRes.statusCode).toBe(201);
    const checklist = checklistRes.json() as ChecklistResponse;
    expect(checklist.items.length).toBeGreaterThan(0);
    expect(checklist.items.every((i) => i.status === "NOT_STARTED")).toBe(true);
    expect(checklist.items[0]!.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const initialReadiness = await app.inject({
      method: "GET",
      url: `/api/profiles/${auth.profile.id}/programs/${programId}/readiness`,
      headers: auth.headers,
    });
    expect(initialReadiness.statusCode).toBe(200);
    const initial = initialReadiness.json() as ReadinessResponse;
    expect(initial.readinessScore).toBe(0);
    expect(initial.totalRequired).toBeGreaterThan(0);

    const firstRequired = checklist.items.find((i) => i.requirement.required);
    expect(firstRequired).toBeDefined();
    const requirementId = firstRequired!.requirementId;

    const patch = await app.inject({
      method: "PATCH",
      url: `/api/profiles/${auth.profile.id}/programs/${programId}/checklist/${requirementId}`,
      payload: { status: "COMPLETE", notes: "submitted" },
      headers: auth.headers,
    });
    expect(patch.statusCode).toBe(200);

    const after = await app.inject({
      method: "GET",
      url: `/api/profiles/${auth.profile.id}/programs/${programId}/readiness`,
      headers: auth.headers,
    });
    const afterBody = after.json() as ReadinessResponse;
    expect(afterBody.completedRequired).toBe(1);
    expect(afterBody.readinessScore).toBeGreaterThan(0);
    expect(afterBody.readinessScore).toBeCloseTo(1 / initial.totalRequired, 5);
    expect(
      afterBody.missingRequirements.some((r) => r.id === requirementId)
    ).toBe(false);

    const timelineRes = await app.inject({
      method: "GET",
      url: `/api/profiles/${auth.profile.id}/programs/${programId}/timeline`,
      headers: auth.headers,
    });
    const timeline = timelineRes.json() as { date: string }[];
    expect(timeline.length).toBe(checklist.items.length);
    for (let i = 1; i < timeline.length; i++) {
      expect(timeline[i]!.date >= timeline[i - 1]!.date).toBe(true);
    }
  });

  it("persists counselor notes alongside student notes", async () => {
    const auth = await register(app);

    const programs = (
      await app.inject({ method: "GET", url: "/api/programs" })
    ).json() as { items: { id: string }[] };
    const programId = programs.items[0]!.id;

    const checklist = (
      await app.inject({
        method: "POST",
        url: `/api/profiles/${auth.profile.id}/checklists`,
        payload: { programId },
        headers: auth.headers,
      })
    ).json() as ChecklistResponse;
    const requirementId = checklist.items[0]!.requirementId;

    const patch = await app.inject({
      method: "PATCH",
      url: `/api/profiles/${auth.profile.id}/programs/${programId}/checklist/${requirementId}`,
      payload: { counselorNotes: "Strong candidate; nudge on essays." },
      headers: auth.headers,
    });
    expect(patch.statusCode).toBe(200);
    const updated = patch.json() as {
      counselorNotes: string | null;
      notes: string | null;
    };
    expect(updated.counselorNotes).toBe("Strong candidate; nudge on essays.");
    expect(updated.notes).toBeNull();
  });

  it("returns per-program summaries for a profile", async () => {
    const auth = await register(app);

    const programs = (
      await app.inject({ method: "GET", url: "/api/programs" })
    ).json() as { items: { id: string }[] };
    const ids = programs.items.slice(0, 2).map((p) => p.id);

    for (const programId of ids) {
      await app.inject({
        method: "POST",
        url: `/api/profiles/${auth.profile.id}/checklists`,
        payload: { programId },
        headers: auth.headers,
      });
    }

    const res = await app.inject({
      method: "GET",
      url: `/api/profiles/${auth.profile.id}/program-summaries`,
      headers: auth.headers,
    });
    expect(res.statusCode).toBe(200);
    const summaries = res.json() as {
      programId: string;
      readinessScore: number;
      totalRequired: number;
    }[];
    expect(summaries.map((s) => s.programId).sort()).toEqual([...ids].sort());
    expect(summaries.every((s) => s.readinessScore === 0)).toBe(true);
    expect(summaries.every((s) => s.totalRequired > 0)).toBe(true);
  });

  it("rejects invalid registration input", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        name: "x",
        email: "not-an-email",
        educationLevel: "BACHELOR",
        targetTerm: "Whenever",
        password: "shortie",
      },
    });
    expect(res.statusCode).toBe(400);
  });
});
