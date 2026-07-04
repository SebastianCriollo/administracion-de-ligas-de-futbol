import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { HealthController } from "./health/health.controller";
import { PrismaService } from "./infrastructure/prisma.service";

/**
 * Módulo raíz. Los módulos de negocio (tournaments, matches…) se
 * registran aquí a medida que se implementan (Fases 10-11).
 */
@Module({
  imports: [AuthModule],
  controllers: [HealthController],
  providers: [PrismaService],
})
export class AppModule {}
