import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { pathToFileURL } from "node:url";
import { registerAuthPlugin } from "./auth-plugin.js";
import { createDb } from "./db.js";
import { Repo } from "./repo.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerChecklistRoutes } from "./routes/checklists.js";
import { registerProfileRoutes } from "./routes/profiles.js";
import { registerProgramRoutes } from "./routes/programs.js";
import { registerReadinessRoutes } from "./routes/readiness.js";

export interface AppOptions {
  dbFile: string;
  logger?: boolean;
}

export async function buildApp(opts: AppOptions): Promise<FastifyInstance> {
  // Exported separately from the CLI entrypoint so Vitest can inject :memory: DBs.
  const app = Fastify({ logger: opts.logger ?? false });
  await app.register(cors, { origin: true });

  const db = createDb(opts.dbFile);
  const repo = new Repo(db);

  app.get("/health", async () => ({ ok: true }));

  await app.register(
    async (api) => {
      await registerAuthPlugin(api, repo);
      await registerAuthRoutes(api, repo);
      await registerProgramRoutes(api, repo);
      await registerProfileRoutes(api, repo);
      await registerChecklistRoutes(api, repo);
      await registerReadinessRoutes(api, repo);
    },
    { prefix: "/api" }
  );

  app.setErrorHandler((err, _req, reply) => {
    app.log.error(err);
    reply.code(500).send({
      error: { code: "INTERNAL", message: err.message },
    });
  });

  return app;
}

// Only start the HTTP listener when executed directly (not when imported by tests).
// pathToFileURL is required on Windows where import.meta.url and argv use different formats.
const isEntrypoint = import.meta.url === pathToFileURL(process.argv[1]!).href;
if (isEntrypoint) {
  const port = Number(process.env.PORT ?? 3001);
  const host = process.env.HOST ?? "0.0.0.0";
  const dbFile = process.env.DB_FILE ?? "postgrad-eval.db";
  buildApp({ dbFile, logger: true })
    .then((app) => app.listen({ port, host }))
    .then((addr) => {
      // eslint-disable-next-line no-console
      console.log(`API listening on ${addr}`);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      process.exit(1);
    });
}
