import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaClient } from "@ligas/database";
import supertest from "supertest";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/app.setup";

export const prisma = new PrismaClient();

export async function createApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = configureApp(moduleRef.createNestApplication());
  await app.init();
  return app;
}

/** Limpia todas las tablas respetando FKs (TRUNCATE en cascada). */
export async function resetDatabase(): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma%'
  `;
  const list = tables.map((t) => `"${t.tablename}"`).join(", ");
  if (list) await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`);
}

export interface Session {
  token: string;
  orgId: string;
  agent: ReturnType<typeof supertest.agent>;
}

let seq = 0;

/** Registra un organizador nuevo y devuelve token + org. */
export async function registerAdmin(app: INestApplication): Promise<Session> {
  const agent = supertest.agent(app.getHttpServer());
  const email = `admin${++seq}-${Date.now()}@test.dev`;
  const res = await agent
    .post("/api/v1/auth/register")
    .send({
      firstName: "Admin",
      lastName: "Test",
      email,
      password: "ClaveSegura123",
      organizationName: `Org Test ${seq}`,
    })
    .expect(201);
  const token = res.body.accessToken as string;
  const me = await agent.get("/api/v1/auth/me").set(auth(token)).expect(200);
  return { token, orgId: me.body.memberships[0].organization.id, agent };
}

export function auth(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
