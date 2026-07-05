import type { INestApplication } from "@nestjs/common";
import supertest from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { auth, createApp, prisma, registerAdmin, resetDatabase } from "./helpers";

let app: INestApplication;

beforeAll(async () => {
  await resetDatabase();
  app = await createApp();
});
afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe("Auth", () => {
  it("registra organizador: usuario + organización + rol LEAGUE_ADMIN", async () => {
    const s = await registerAdmin(app);
    const me = await s.agent.get("/api/v1/auth/me").set(auth(s.token)).expect(200);
    expect(me.body.memberships[0].role).toBe("LEAGUE_ADMIN");
    expect(me.body.memberships[0].organization.id).toBe(s.orgId);
  });

  it("login correcto emite tokens; credenciales malas → 401 genérico", async () => {
    const agent = supertest.agent(app.getHttpServer());
    await agent
      .post("/api/v1/auth/register")
      .send({
        firstName: "Ana",
        lastName: "López",
        email: "ana@test.dev",
        password: "ClaveSegura123",
        organizationName: "Liga Ana",
      })
      .expect(201);

    const ok = await agent
      .post("/api/v1/auth/login")
      .send({ email: "ana@test.dev", password: "ClaveSegura123" })
      .expect(200);
    expect(ok.body.accessToken).toBeTruthy();
    expect(ok.headers["set-cookie"]?.[0]).toContain("refresh_token=");
    expect(ok.headers["set-cookie"]?.[0]).toContain("HttpOnly");

    const bad = await agent
      .post("/api/v1/auth/login")
      .send({ email: "ana@test.dev", password: "incorrecta" })
      .expect(401);
    expect(bad.body.message).toBe("Credenciales inválidas");
    // usuario inexistente: misma respuesta (anti-enumeración)
    const ghost = await agent
      .post("/api/v1/auth/login")
      .send({ email: "nadie@test.dev", password: "incorrecta" })
      .expect(401);
    expect(ghost.body.message).toBe(bad.body.message);
  });

  it("refresh rota el token; el reuso tardío revoca la familia", async () => {
    const s = await registerAdmin(app);
    // la cookie del agente se actualiza en cada refresh
    const r1 = await s.agent.post("/api/v1/auth/refresh").expect(200);
    expect(r1.body.accessToken).toBeTruthy();

    // simular reuso tardío: retro-datar la revocación más allá de la gracia
    await prisma.refreshToken.updateMany({
      where: { revokedAt: { not: null } },
      data: { revokedAt: new Date(Date.now() - 60_000) },
    });
    // un agente con la cookie vieja
    const stale = supertest.agent(app.getHttpServer());
    const oldCookie = r1.headers["set-cookie"]![0]!.split(";")[0]!;
    await s.agent.post("/api/v1/auth/refresh").expect(200); // rota la actual
    await prisma.refreshToken.updateMany({
      where: { tokenHash: { not: "" }, revokedAt: { not: null } },
      data: { revokedAt: new Date(Date.now() - 60_000) },
    });
    const reuse = await stale
      .post("/api/v1/auth/refresh")
      .set("Cookie", oldCookie)
      .expect(401);
    expect(reuse.body.message).toContain("revocada");
  });

  it("endpoints protegidos exigen token; RBAC rechaza organización ajena", async () => {
    const s1 = await registerAdmin(app);
    const s2 = await registerAdmin(app);

    await supertest(app.getHttpServer()).get("/api/v1/auth/me").expect(401);
    await s1.agent.get(`/api/v1/orgs/${s1.orgId}/teams`).set(auth(s1.token)).expect(200);
    // token de s1 contra la org de s2 → 403
    await s1.agent.get(`/api/v1/orgs/${s2.orgId}/teams`).set(auth(s1.token)).expect(403);
  });
});
