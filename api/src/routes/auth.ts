import type { FastifyInstance } from "fastify";
import { requireAuth } from "../auth-plugin.js";
import type { Repo } from "../repo.js";
import { loginSchema, registerSchema } from "../validation.js";

export async function registerAuthRoutes(
  app: FastifyInstance,
  repo: Repo
): Promise<void> {
  app.post("/auth/register", async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: {
          code: "INVALID_INPUT",
          message: "Invalid registration",
          details: parsed.error.flatten(),
        },
      });
    }
    const existing = repo.getProfileByEmail(parsed.data.email);
    if (existing !== null) {
      return reply.code(409).send({
        error: {
          code: "CONFLICT",
          message: "A profile with that email already exists",
        },
      });
    }
    const { profile, token } = repo.registerProfile(parsed.data);
    return reply.code(201).send({ profile, token });
  });

  app.post("/auth/login", async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: {
          code: "INVALID_INPUT",
          message: "Invalid login",
          details: parsed.error.flatten(),
        },
      });
    }
    const result = repo.login(parsed.data.email, parsed.data.password);
    if (result === null) {
      return reply.code(401).send({
        error: {
          code: "UNAUTHORIZED",
          message: "Email or password is incorrect",
        },
      });
    }
    return { profile: result.profile, token: result.token };
  });

  app.post("/auth/logout", async (req, reply) => {
    const header = req.headers.authorization;
    if (header !== undefined && header.startsWith("Bearer ")) {
      const token = header.slice("Bearer ".length).trim();
      if (token.length > 0) {
        repo.deleteSession(token);
      }
    }
    return reply.code(204).send();
  });

  app.get("/auth/me", async (req, reply) => {
    if (!requireAuth(req, reply)) {
      return;
    }
    return req.profile;
  });
}
