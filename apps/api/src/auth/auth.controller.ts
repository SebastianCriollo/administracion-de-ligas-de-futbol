import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import {
  acceptInvitationSchema,
  forgotPasswordSchema,
  googleLoginSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type AcceptInvitationInput,
  type AccessTokenPayload,
  type ForgotPasswordInput,
  type GoogleLoginInput,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
} from "@ligas/contracts";
import type { Request, Response } from "express";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { loadEnv } from "../config/env";
import { AuthService } from "./auth.service";
import { CurrentUser, Public } from "./decorators";
import { REFRESH_COOKIE, TokensService } from "./tokens.service";

@Controller("auth")
export class AuthController {
  private readonly env = loadEnv();

  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(TokensService) private readonly tokens: TokensService,
  ) {}

  @Public()
  @Post("register")
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.auth.register(body);
    this.setRefreshCookie(res, session.refreshToken);
    return { accessToken: session.accessToken };
  }

  @Public()
  @HttpCode(200)
  @Post("login")
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.auth.login(body, this.meta(req));
    this.setRefreshCookie(res, session.refreshToken);
    return { accessToken: session.accessToken };
  }

  @Public()
  @HttpCode(200)
  @Post("google")
  async google(
    @Body(new ZodValidationPipe(googleLoginSchema)) body: GoogleLoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.auth.loginWithGoogle(body.idToken, this.meta(req));
    this.setRefreshCookie(res, session.refreshToken);
    return { accessToken: session.accessToken };
  }

  @Public()
  @HttpCode(200)
  @Post("refresh")
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = (req.cookies as Record<string, string>)[REFRESH_COOKIE];
    if (!raw) throw new UnauthorizedException("Sin sesión");
    const session = await this.tokens.rotateRefreshToken(raw, this.meta(req));
    this.setRefreshCookie(res, session.refreshToken);
    return { accessToken: session.accessToken };
  }

  @Public()
  @HttpCode(200)
  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = (req.cookies as Record<string, string>)[REFRESH_COOKIE];
    if (raw) await this.tokens.revokeRefreshToken(raw);
    res.clearCookie(REFRESH_COOKIE, { path: "/" });
    return { message: "Sesión cerrada" };
  }

  @Public()
  @HttpCode(200)
  @Post("forgot-password")
  forgotPassword(@Body(new ZodValidationPipe(forgotPasswordSchema)) body: ForgotPasswordInput) {
    return this.auth.forgotPassword(body.email);
  }

  @Public()
  @HttpCode(200)
  @Post("reset-password")
  resetPassword(@Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordInput) {
    return this.auth.resetPassword(body);
  }

  @Public()
  @Post("invitations/accept")
  async acceptInvitation(
    @Body(new ZodValidationPipe(acceptInvitationSchema)) body: AcceptInvitationInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.auth.acceptInvitation(body);
    this.setRefreshCookie(res, session.refreshToken);
    return { accessToken: session.accessToken };
  }

  @Get("me")
  me(@CurrentUser() user: AccessTokenPayload) {
    return this.auth.me(user.sub);
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: this.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: this.env.JWT_REFRESH_TTL_DAYS * 86_400_000,
    });
  }

  private meta(req: Request) {
    return { ip: req.ip, userAgent: req.headers["user-agent"] };
  }
}
