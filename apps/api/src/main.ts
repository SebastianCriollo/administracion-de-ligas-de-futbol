import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { configureApp } from "./app.setup";
import { loadEnv } from "./config/env";

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  app.enableShutdownHooks();
  await app.listen(env.PORT);
  new Logger("Bootstrap").log(`API escuchando en http://localhost:${env.PORT}/api/v1`);
}

void bootstrap();
