import type { FastifyInstance } from "fastify";
import { requireOwnProfile } from "../auth-plugin.js";
import { joinChecklist } from "../readiness.js";
import { RepoError, type Repo } from "../repo.js";
import {
  createChecklistSchema,
  updateChecklistItemSchema,
} from "../validation.js";

export async function registerChecklistRoutes(
  app: FastifyInstance,
  repo: Repo
): Promise<void> {
  app.post<{ Params: { profileId: string } }>(
    "/profiles/:profileId/checklists",
    async (req, reply) => {
      if (!requireOwnProfile(req, reply, req.params.profileId)) {
        return;
      }
      const parsed = createChecklistSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: {
            code: "INVALID_INPUT",
            message: "Invalid body",
            details: parsed.error.flatten(),
          },
        });
      }
      try {
        const { programId } = parsed.data;
        // Returns the existing checklist when one already exists for this program.
        repo.createChecklist(req.params.profileId, programId);
        const program = repo.getProgram(programId);
        if (program === null) {
          return reply.code(404).send({
            error: { code: "NOT_FOUND", message: "Program not found" },
          });
        }
        const reqs = repo.getRequirementsByProgram(programId);
        const cl = repo.getChecklist(req.params.profileId, programId);
        if (cl === null) {
          throw new Error("Checklist disappeared after creation");
        }
        return reply.code(201).send({
          programId,
          profileId: req.params.profileId,
          items: joinChecklist(reqs, cl.items, program.applicationDeadline),
        });
      } catch (err) {
        if (err instanceof RepoError && err.code === "NOT_FOUND") {
          return reply
            .code(404)
            .send({ error: { code: "NOT_FOUND", message: err.message } });
        }
        throw err;
      }
    }
  );

  app.get<{ Params: { profileId: string; programId: string } }>(
    "/profiles/:profileId/programs/:programId/checklist",
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
      return {
        programId,
        profileId,
        items: joinChecklist(reqs, cl.items, program.applicationDeadline),
      };
    }
  );

  app.patch<{
    Params: { profileId: string; programId: string; requirementId: string };
  }>(
    "/profiles/:profileId/programs/:programId/checklist/:requirementId",
    async (req, reply) => {
      if (!requireOwnProfile(req, reply, req.params.profileId)) {
        return;
      }
      const parsed = updateChecklistItemSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: {
            code: "INVALID_INPUT",
            message: "Invalid update",
            details: parsed.error.flatten(),
          },
        });
      }
      const { profileId, programId, requirementId } = req.params;
      const updated = repo.updateChecklistItem(
        profileId,
        programId,
        requirementId,
        parsed.data
      );
      if (updated === null) {
        return reply.code(404).send({
          error: {
            code: "NOT_FOUND",
            message: "Checklist item not found",
          },
        });
      }
      return updated;
    }
  );
}
