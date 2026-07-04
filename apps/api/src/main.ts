import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/http-exception.filter";
import { loadEnv } from "./config/env";

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api/v1");
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.enableCors({ origin: env.CORS_ORIGIN.split(","), credentials: true });
  app.enableShutdownHooks();

  await app.listen(env.PORT);
  new Logger("Bootstrap").log(`API escuchando en http://localhost:${env.PORT}/api/v1`);
}

void bootstrap();
