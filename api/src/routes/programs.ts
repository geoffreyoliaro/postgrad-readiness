import type { FastifyInstance } from "fastify";
import type { Repo } from "../repo.js";
import { listProgramsQuerySchema } from "../validation.js";

export async function registerProgramRoutes(
  app: FastifyInstance,
  repo: Repo
): Promise<void> {
  app.get("/programs", async (req, reply) => {
    const parsed = listProgramsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: {
          code: "INVALID_INPUT",
          message: "Invalid query",
          details: parsed.error.flatten(),
        },
      });
    }
    return repo.listPrograms(parsed.data);
  });

  app.get<{ Params: { id: string } }>("/programs/:id", async (req, reply) => {
    const program = repo.getProgram(req.params.id);
    if (program === null) {
      return reply.code(404).send({
        error: { code: "NOT_FOUND", message: "Program not found" },
      });
    }
    const requirements = repo.getRequirementsByProgram(program.id);
    return { ...program, requirements };
  });
}
