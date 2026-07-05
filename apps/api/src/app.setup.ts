import type { INestApplication } from "@nestjs/common";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { GlobalExceptionFilter } from "./common/http-exception.filter";
import { loadEnv } from "./config/env";

/** Configuración común de la app — compartida por main.ts y los tests. */
export function configureApp(app: INestApplication): INestApplication {
  const env = loadEnv();
  app.setGlobalPrefix("api/v1");
  app.use(helmet()); // headers de seguridad (HSTS, nosniff, frameguard…)
  app.use(cookieParser());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.enableCors({ origin: env.CORS_ORIGIN.split(","), credentials: true });
  return app;
}
