import type { FastifyInstance } from "fastify";
import { requireOwnProfile } from "../auth-plugin.js";
import { computeReadiness, computeTimeline } from "../readiness.js";
import type { Repo } from "../repo.js";

export async function registerReadinessRoutes(
  app: FastifyInstance,
  repo: Repo
): Promise<void> {
  app.get<{ Params: { profileId: string; programId: string } }>(
    "/profiles/:profileId/programs/:programId/readiness",
    async (req, reply) => {
      const { profileId, programId } = req.params;
      if (!requireOwnProfile(req, reply, profileId)) {
        return;
      }
      const program = repo.getProgram(programId);
      if (program === null) {
        return reply
          .code(404)
          .send({ error: { code: "NOT_FOUND", message: "Program not found" } });
      }
      const cl = repo.getChecklist(profileId, programId);
      if (cl === null) {
        return reply.code(404).send({
          error: { code: "NOT_FOUND", message: "Checklist not found" },
        });
      }
      const reqs = repo.getRequirementsByProgram(programId);
      return computeReadiness(reqs, cl.items, program.applicationDeadline);
    }
  );

  app.get<{ Params: { profileId: string; programId: string } }>(
    "/profiles/:profileId/programs/:programId/timeline",
    async (req, reply) => {
      const { profileId, programId } = req.params;
      if (!requireOwnProfile(req, reply, profileId)) {
        return;
      }
      const program = repo.getProgram(programId);
      if (program === null) {
        return reply
          .code(404)
          .send({ error: { code: "NOT_FOUND", message: "Program not found" } });
      }
      const cl = repo.getChecklist(profileId, programId);
      if (cl === null) {
        return reply.code(404).send({
          error: { code: "NOT_FOUND", message: "Checklist not found" },
        });
      }
      const reqs = repo.getRequirementsByProgram(programId);
      return computeTimeline(reqs, cl.items, program.applicationDeadline);
    }
  );
}
