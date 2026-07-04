import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { PrismaService } from "./infrastructure/prisma.service";

/**
 * Módulo raíz. Los módulos de negocio (auth, tournaments, matches…)
 * se registran aquí a medida que se implementan (Fases 9-11).
 */
@Module({
  controllers: [HealthController],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
