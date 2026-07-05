import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AuditInterceptor } from "../common/audit.interceptor";
import { PrismaService } from "../infrastructure/prisma.service";
import { DirectoryController } from "./directory/directory.controller";
import { LeaguesController } from "./leagues/leagues.controller";
import { LeaguesService } from "./leagues/leagues.service";
import { OrganizationsController } from "./organizations/organizations.controller";
import { PlayersController } from "./players/players.controller";
import { TeamsController } from "./teams/teams.controller";
import { FixtureService } from "./tournaments/fixture.service";
import { TournamentsController } from "./tournaments/tournaments.controller";
import { TournamentsService } from "./tournaments/tournaments.service";

/** Módulos administrativos (Fase 10). */
@Module({
  controllers: [
    OrganizationsController,
    LeaguesController,
    TournamentsController,
    TeamsController,
    PlayersController,
    DirectoryController,
  ],
  providers: [
    PrismaService,
    LeaguesService,
    FixtureService,
    TournamentsService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AdminModule {}
