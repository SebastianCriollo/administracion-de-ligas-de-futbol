import { Controller, Get, Inject } from "@nestjs/common";
import { PrismaService } from "../infrastructure/prisma.service";

// Convención del proyecto: inyección explícita con @Inject(...) — no
// dependemos de emitDecoratorMetadata, que esbuild/tsx no soporta.
@Controller("health")
export class HealthController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
