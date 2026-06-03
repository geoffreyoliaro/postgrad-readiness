import type { FastifyInstance } from "fastify";
import { requireOwnProfile } from "../auth-plugin.js";
import {
  computeReadinessScore,
  computeTimeline,
} from "../readiness.js";
import type { Repo } from "../repo.js";
import type { ProfileProgramSummary } from "../types.js";
import { updateProfileSchema } from "../validation.js";

export async function registerProfileRoutes(
  app: FastifyInstance,
  repo: Repo
): Promise<void> {
  app.get<{ Params: { id: string } }>("/profiles/:id", async (req, reply) => {
    if (!requireOwnProfile(req, reply, req.params.id)) {
      return;
    }
    return req.profile;
  });

  app.get<{ Params: { id: string } }>(
    "/profiles/:id/program-summaries",
    async (req, reply) => {
      if (!requireOwnProfile(req, reply, req.params.id)) {
        return;
      }
      const profile = req.profile;
      if (profile === null) {
        return;
      }
      const checklists = repo.listProfileChecklists(profile.id);
      const summaries: ProfileProgramSummary[] = checklists.flatMap((cl) => {
        const program = repo.getProgram(cl.programId);
        if (program === null) {
          return [];
        }
        const reqs = repo.getRequirementsByProgram(program.id);
        const { score, completed, total } = computeReadinessScore(
          reqs,
          cl.items
        );
        const timeline = computeTimeline(
          reqs,
          cl.items,
          program.applicationDeadline
        );
        const nextDueDate =
          timeline.find((e) => e.status !== "COMPLETE")?.date ?? null;
        return [
          {
            programId: program.id,
            programName: program.name,
            degreeType: program.degreeType,
            applicationDeadline: program.applicationDeadline,
            readinessScore: score,
            completedRequired: completed,
            totalRequired: total,
            nextDueDate,
          },
        ];
      });
      return summaries;
    }
  );

  app.patch<{ Params: { id: string } }>(
    "/profiles/:id",
    async (req, reply) => {
      if (!requireOwnProfile(req, reply, req.params.id)) {
        return;
      }
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: {
            code: "INVALID_INPUT",
            message: "Invalid profile patch",
            details: parsed.error.flatten(),
          },
        });
      }
      const updated = repo.updateProfile(req.params.id, parsed.data);
      if (updated === null) {
        return reply
          .code(404)
          .send({ error: { code: "NOT_FOUND", message: "Profile not found" } });
      }
      return updated;
    }
  );
}
