import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
import { HealthController } from "./health/health.controller";
import { PrismaService } from "./infrastructure/prisma.service";
import { AdminModule } from "./modules/admin.module";
import { PublicController } from "./modules/public/public.controller";

@Module({
  imports: [
    // Rate limiting global: 120 req/min por IP; /auth se endurece aparte.
    // En test los límites se relajan (las suites disparan cientos de req/min).
    ThrottlerModule.forRoot([
      { ttl: 60_000, limit: process.env.NODE_ENV === "test" ? 100_000 : 120 },
    ]),
    AuthModule,
    AdminModule,
  ],
  controllers: [HealthController, PublicController],
  providers: [PrismaService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
