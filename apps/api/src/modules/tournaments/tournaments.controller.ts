import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";
import {
  createTournamentSchema,
  tournamentQuerySchema,
  updateTournamentSchema,
  type CreateTournamentInput,
} from "@ligas/contracts";
import type { z } from "zod";
import { Roles } from "../../auth/decorators";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { TournamentsService } from "./tournaments.service";

@Roles("LEAGUE_ADMIN")
@Controller("orgs/:orgId/tournaments")
export class TournamentsController {
  constructor(@Inject(TournamentsService) private readonly tournaments: TournamentsService) {}

  @Get()
  list(
    @Param("orgId") orgId: string,
    @Query(new ZodValidationPipe(tournamentQuerySchema)) query: z.infer<typeof tournamentQuerySchema>,
  ) {
    return this.tournaments.list(orgId, query);
  }

  @Get(":id")
  get(@Param("orgId") orgId: string, @Param("id") id: string) {
    return this.tournaments.get(orgId, id);
  }

  @Get(":id/standings")
  standings(@Param("orgId") orgId: string, @Param("id") id: string) {
    return this.tournaments.standings(orgId, id);
  }

  /** Paso 5 del wizard: fixture generado por el motor, sin persistir. */
  @Post("preview")
  preview(
    @Param("orgId") orgId: string,
    @Body(new ZodValidationPipe(createTournamentSchema)) body: CreateTournamentInput,
  ) {
    return this.tournaments.preview(orgId, body);
  }

  @Post()
  create(
    @Param("orgId") orgId: string,
    @Body(new ZodValidationPipe(createTournamentSchema)) body: CreateTournamentInput,
  ) {
    return this.tournaments.create(orgId, body);
  }

  @Post(":id/publish")
  publish(@Param("orgId") orgId: string, @Param("id") id: string) {
    return this.tournaments.publish(orgId, id);
  }

  @Patch(":id")
  update(
    @Param("orgId") orgId: string,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateTournamentSchema)) body: z.infer<typeof updateTournamentSchema>,
  ) {
    return this.tournaments.update(orgId, id, body);
  }

  @Delete(":id")
  remove(@Param("orgId") orgId: string, @Param("id") id: string) {
    return this.tournaments.remove(orgId, id);
  }
}
