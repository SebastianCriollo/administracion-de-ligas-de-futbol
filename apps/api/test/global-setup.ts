import { execSync } from "node:child_process";
import path from "node:path";

const TEST_DB_URL = "postgresql://postgres:postgres@localhost:5432/ligas_test?schema=public";

/** Aplica las migraciones reales sobre la base de test antes de la suite. */
export default function globalSetup() {
  const databaseDir = path.resolve(__dirname, "../../../packages/database");
  execSync("npx prisma migrate deploy", {
    cwd: databaseDir,
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "pipe",
  });
}
