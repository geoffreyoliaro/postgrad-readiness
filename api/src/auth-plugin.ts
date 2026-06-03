import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Repo } from "./repo.js";
import type { StudentProfile } from "./types.js";

declare module "fastify" {
  interface FastifyRequest {
    profile: StudentProfile | null;
  }
}

/** Attach req.profile from a Bearer token when present; routes opt in to requireAuth. */
export async function registerAuthPlugin(
  app: FastifyInstance,
  repo: Repo
): Promise<void> {
  app.decorateRequest("profile", null);

  app.addHook("preHandler", async (req) => {
    req.profile = null;
    const header = req.headers.authorization;
    if (header === undefined || !header.startsWith("Bearer ")) {
      return;
    }
    const token = header.slice("Bearer ".length).trim();
    if (token.length === 0) {
      return;
    }
    req.profile = repo.getProfileByToken(token);
  });
}

export function requireAuth(req: FastifyRequest, reply: FastifyReply): boolean {
  if (req.profile === null) {
    reply
      .code(401)
      .send({ error: { code: "UNAUTHORIZED", message: "Sign in required" } });
    return false;
  }
  return true;
}

export function requireOwnProfile(
  req: FastifyRequest,
  reply: FastifyReply,
  profileId: string
): boolean {
  if (!requireAuth(req, reply)) {
    return false;
  }
  if (req.profile === null || req.profile.id !== profileId) {
    reply.code(403).send({
      error: { code: "FORBIDDEN", message: "You can only access your own data" },
    });
    return false;
  }
  return true;
}
