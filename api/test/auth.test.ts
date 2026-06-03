import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/server.js";

interface AuthBody {
  profile: { id: string; email: string };
  token: string;
}

const baseProfile = {
  name: "Auth Test",
  educationLevel: "BACHELOR",
  targetTerm: "Fall 2027",
  password: "correcthorse",
};

describe("auth: register, login, logout, ownership", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ dbFile: ":memory:", logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  it("registers two distinct students and isolates their data", async () => {
    const aEmail = `a-${Date.now()}@example.com`;
    const bEmail = `b-${Date.now()}@example.com`;

    const aReg = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { ...baseProfile, email: aEmail },
    });
    expect(aReg.statusCode).toBe(201);
    const a = aReg.json() as AuthBody;

    const bReg = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { ...baseProfile, email: bEmail },
    });
    expect(bReg.statusCode).toBe(201);
    const b = bReg.json() as AuthBody;

    // Student B may not read student A's profile, even with a valid token.
    const crossRead = await app.inject({
      method: "GET",
      url: `/api/profiles/${a.profile.id}`,
      headers: { authorization: `Bearer ${b.token}` },
    });
    expect(crossRead.statusCode).toBe(403);

    // Student A may read their own.
    const ownRead = await app.inject({
      method: "GET",
      url: `/api/profiles/${a.profile.id}`,
      headers: { authorization: `Bearer ${a.token}` },
    });
    expect(ownRead.statusCode).toBe(200);
  });

  it("blocks unauthenticated profile access", async () => {
    const aEmail = `unauth-${Date.now()}@example.com`;
    const aReg = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { ...baseProfile, email: aEmail },
    });
    const a = aReg.json() as AuthBody;

    const noAuth = await app.inject({
      method: "GET",
      url: `/api/profiles/${a.profile.id}`,
    });
    expect(noAuth.statusCode).toBe(401);
  });

  it("logs in with correct password and rejects wrong password", async () => {
    const email = `login-${Date.now()}@example.com`;
    await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { ...baseProfile, email },
    });

    const ok = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email, password: baseProfile.password },
    });
    expect(ok.statusCode).toBe(200);
    const body = ok.json() as AuthBody;
    expect(body.token.length).toBeGreaterThan(20);

    const bad = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email, password: "wrong-password" },
    });
    expect(bad.statusCode).toBe(401);
  });

  it("invalidates the token on logout", async () => {
    const email = `logout-${Date.now()}@example.com`;
    const reg = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { ...baseProfile, email },
    });
    const a = reg.json() as AuthBody;
    const headers = { authorization: `Bearer ${a.token}` };

    const before = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers,
    });
    expect(before.statusCode).toBe(200);

    const logout = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      headers,
    });
    expect(logout.statusCode).toBe(204);

    const after = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers,
    });
    expect(after.statusCode).toBe(401);
  });
});
