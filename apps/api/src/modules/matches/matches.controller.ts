import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";
import {
  assignOfficialSchema,
  closeReportSchema,
  createMatchEventSchema,
  matchQuerySchema,
  matchTransitionSchema,
  rescheduleMatchSchema,
  type AccessTokenPayload,
  type CreateMatchEventInput,
  type MatchTransitionInput,
} from "@ligas/contracts";
import type { z } from "zod";
import { CurrentUser, Roles } from "../../auth/decorators";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { MatchesService } from "./matches.service";

/**
 * Operación de partido. Lectura y acta: cualquier rol de la org
 * (el servicio aplica el guard de propiedad para operar); programación
 * y designaciones: solo LEAGUE_ADMIN.
 */
@Roles("LEAGUE_ADMIN", "REFEREE", "TEAM_MANAGER", "PLAYER")
@Controller("orgs/:orgId/matches")
export class MatchesController {
  constructor(@Inject(MatchesService) private readonly matches: MatchesService) {}

  @Get()
  list(
    @Param("orgId") orgId: string,
    @Query(new ZodValidationPipe(matchQuerySchema)) q: z.infer<typeof matchQuerySchema>,
  ) {
    return this.matches.list(orgId, q);
  }

  @Get(":id")
  get(@Param("orgId") orgId: string, @Param("id") id: string) {
    return this.matches.get(orgId, id);
  }

  @Roles("LEAGUE_ADMIN")
  @Patch(":id/schedule")
  schedule(
    @Param("orgId") orgId: string,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(rescheduleMatchSchema)) body: z.infer<typeof rescheduleMatchSchema>,
  ) {
    return this.matches.schedule(orgId, id, body);
  }

  @Roles("LEAGUE_ADMIN")
  @Post(":id/officials")
  assignOfficial(
    @Param("orgId") orgId: string,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(assignOfficialSchema)) body: z.infer<typeof assignOfficialSchema>,
  ) {
    return this.matches.assignOfficial(orgId, id, body.refereeId, body.role);
  }

  @Post(":id/transitions")
  transition(
    @Param("orgId") orgId: string,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(matchTransitionSchema)) body: MatchTransitionInput,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.matches.transitionMatch(orgId, id, body, user);
  }

  @Post(":id/events")
  addEvent(
    @Param("orgId") orgId: string,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(createMatchEventSchema)) body: CreateMatchEventInput,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.matches.addEvent(orgId, id, body, user);
  }

  @Delete(":id/events/:eventId")
  removeEvent(
    @Param("orgId") orgId: string,
    @Param("id") id: string,
    @Param("eventId") eventId: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.matches.removeEvent(orgId, id, eventId, user);
  }

  @Post(":id/report/close")
  closeReport(
    @Param("orgId") orgId: string,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(closeReportSchema)) body: z.infer<typeof closeReportSchema>,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.matches.closeReport(orgId, id, body, user);
  }
}
