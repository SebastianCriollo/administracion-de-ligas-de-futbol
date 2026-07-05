import {
  Body,
  ConflictException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  addToRosterSchema,
  createPlayerSchema,
  createTransferSchema,
  playerQuerySchema,
  updatePlayerSchema,
} from "@ligas/contracts";
import type { z } from "zod";
import { Roles } from "../../auth/decorators";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { PrismaService } from "../../infrastructure/prisma.service";

@Roles("LEAGUE_ADMIN")
@Controller("orgs/:orgId/players")
export class PlayersController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  list(
    @Param("orgId") orgId: string,
    @Query(new ZodValidationPipe(playerQuerySchema)) q: z.infer<typeof playerQuerySchema>,
  ) {
    return this.prisma.player.findMany({
      where: {
        organizationId: orgId,
        position: q.position,
        isActive: q.isActive,
        ...(q.teamId && { rosterEntries: { some: { teamId: q.teamId, leftAt: null } } }),
        ...(q.search && {
          OR: [
            { firstName: { contains: q.search, mode: "insensitive" } },
            { lastName: { contains: q.search, mode: "insensitive" } },
          ],
        }),
      },
      include: {
        rosterEntries: {
          where: { leftAt: null },
          include: { team: { select: { id: true, name: true, shortName: true } } },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 100,
    });
  }

  @Get(":id")
  async get(@Param("orgId") orgId: string, @Param("id") id: string) {
    const player = await this.prisma.player.findFirst({
      where: { id, organizationId: orgId },
      include: {
        rosterEntries: { include: { team: true, season: true }, orderBy: { joinedAt: "desc" } },
        transfers: { orderBy: { date: "desc" }, include: { fromTeam: true, toTeam: true } },
        injuries: { orderBy: { startDate: "desc" } },
      },
    });
    if (!player) throw new NotFoundException("Jugador no encontrado");
    return player;
  }

  @Post()
  create(
    @Param("orgId") orgId: string,
    @Body(new ZodValidationPipe(createPlayerSchema)) body: z.infer<typeof createPlayerSchema>,
  ) {
    const { email: _email, ...data } = body; // invitación se maneja en Fase 12
    return this.prisma.player.create({ data: { organizationId: orgId, ...data } });
  }

  @Patch(":id")
  async update(
    @Param("orgId") orgId: string,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updatePlayerSchema)) body: z.infer<typeof updatePlayerSchema>,
  ) {
    await this.get(orgId, id);
    const { email: _email, ...data } = body;
    return this.prisma.player.update({ where: { id }, data });
  }

  /** Alta en plantilla con validación de dorsal único vigente. */
  @Post(":id/roster")
  async addToRoster(
    @Param("orgId") orgId: string,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(addToRosterSchema)) body: z.infer<typeof addToRosterSchema>,
  ) {
    await this.get(orgId, id);
    if (body.shirtNumber) {
      const taken = await this.prisma.teamPlayer.findFirst({
        where: { teamId: body.teamId, shirtNumber: body.shirtNumber, leftAt: null },
      });
      if (taken) throw new ConflictException(`El dorsal ${body.shirtNumber} ya está ocupado`);
    }
    return this.prisma.teamPlayer.create({ data: { playerId: id, ...body } });
  }

  /** Transferencia: cierra la ficha vigente y abre una en el destino. */
  @Post(":id/transfers")
  async transfer(
    @Param("orgId") orgId: string,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(createTransferSchema)) body: z.infer<typeof createTransferSchema>,
  ) {
    await this.get(orgId, id);
    const current = await this.prisma.teamPlayer.findFirst({
      where: { playerId: id, leftAt: null },
    });
    return this.prisma.$transaction(async (tx) => {
      if (current) {
        await tx.teamPlayer.update({ where: { id: current.id }, data: { leftAt: new Date() } });
      }
      await tx.teamPlayer.create({
        data: { playerId: id, teamId: body.toTeamId, seasonId: current?.seasonId },
      });
      return tx.transfer.create({
        data: {
          playerId: id,
          fromTeamId: current?.teamId ?? null,
          toTeamId: body.toTeamId,
          date: body.date ?? new Date(),
          note: body.note,
        },
      });
    });
  }
}
