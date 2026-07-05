import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from "@nestjs/common";
import {
  createLeagueSchema,
  createSeasonSchema,
  duplicateSeasonSchema,
  updateLeagueSchema,
} from "@ligas/contracts";
import type { z } from "zod";
import { Roles } from "../../auth/decorators";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { LeaguesService } from "./leagues.service";

@Roles("LEAGUE_ADMIN")
@Controller("orgs/:orgId/leagues")
export class LeaguesController {
  constructor(@Inject(LeaguesService) private readonly leagues: LeaguesService) {}

  @Get()
  list(@Param("orgId") orgId: string) {
    return this.leagues.list(orgId);
  }

  @Get(":id")
  get(@Param("orgId") orgId: string, @Param("id") id: string) {
    return this.leagues.get(orgId, id);
  }

  @Post()
  create(
    @Param("orgId") orgId: string,
    @Body(new ZodValidationPipe(createLeagueSchema)) body: z.infer<typeof createLeagueSchema>,
  ) {
    return this.leagues.create(orgId, body);
  }

  @Patch(":id")
  update(
    @Param("orgId") orgId: string,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateLeagueSchema)) body: z.infer<typeof updateLeagueSchema>,
  ) {
    return this.leagues.update(orgId, id, body);
  }

  @Delete(":id")
  remove(@Param("orgId") orgId: string, @Param("id") id: string) {
    return this.leagues.remove(orgId, id);
  }

  @Post(":id/seasons")
  createSeason(
    @Param("orgId") orgId: string,
    @Param("id") leagueId: string,
    @Body(new ZodValidationPipe(createSeasonSchema)) body: z.infer<typeof createSeasonSchema>,
  ) {
    return this.leagues.createSeason(orgId, leagueId, body);
  }

  @Post(":id/seasons/duplicate")
  duplicateSeason(
    @Param("orgId") orgId: string,
    @Param("id") leagueId: string,
    @Body(new ZodValidationPipe(duplicateSeasonSchema))
    body: z.infer<typeof duplicateSeasonSchema>,
  ) {
    return this.leagues.duplicateSeason(orgId, leagueId, body);
  }
}
