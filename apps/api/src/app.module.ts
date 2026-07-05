import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { HealthController } from "./health/health.controller";
import { PrismaService } from "./infrastructure/prisma.service";
import { AdminModule } from "./modules/admin.module";

/**
 * Módulo raíz. Los módulos deportivos (matches, standings en vivo…)
 * se registran en la Fase 11.
 */
@Module({
  imports: [AuthModule, AdminModule],
  controllers: [HealthController],
  providers: [PrismaService],
})
export class AppModule {}
