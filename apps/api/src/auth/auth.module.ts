import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { MailService } from "../infrastructure/mail.service";
import { PrismaService } from "../infrastructure/prisma.service";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { TokensService } from "./tokens.service";

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    PrismaService,
    MailService,
    TokensService,
    AuthService,
    // Guard global: todo endpoint exige token salvo @Public().
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [TokensService],
})
export class AuthModule {}
