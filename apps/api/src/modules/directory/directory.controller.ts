import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import {
  createRefereeSchema,
  createVenueSchema,
  updateRefereeSchema,
  updateVenueSchema,
} from "@ligas/contracts";
import type { z } from "zod";
import { Roles } from "../../auth/decorators";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { PrismaService } from "../../infrastructure/prisma.service";

/** Árbitros y escenarios: CRUDs de directorio de la organización. */
@Roles("LEAGUE_ADMIN")
@Controller("orgs/:orgId")
export class DirectoryController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // ─── Árbitros ──────────────────────────────────────────────────────────

  @Get("referees")
  listReferees(@Param("orgId") orgId: string) {
    return this.prisma.referee.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { assignments: true } } },
      orderBy: [{ lastName: "asc" }],
    });
  }

  @Post("referees")
  createReferee(
    @Param("orgId") orgId: string,
    @Body(new ZodValidationPipe(createRefereeSchema)) body: z.infer<typeof createRefereeSchema>,
  ) {
    const { email: _email, ...data } = body;
    return this.prisma.referee.create({ data: { organizationId: orgId, ...data } });
  }

  @Patch("referees/:id")
  async updateReferee(
    @Param("orgId") orgId: string,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateRefereeSchema)) body: z.infer<typeof updateRefereeSchema>,
  ) {
    const found = await this.prisma.referee.findFirst({ where: { id, organizationId: orgId } });
    if (!found) throw new NotFoundException("Árbitro no encontrado");
    const { email: _email, ...data } = body;
    return this.prisma.referee.update({ where: { id }, data });
  }

  // ─── Escenarios ────────────────────────────────────────────────────────

  @Get("venues")
  listVenues(@Param("orgId") orgId: string) {
    return this.prisma.venue.findMany({
      where: { organizationId: orgId },
      include: { photos: { orderBy: { order: "asc" } } },
      orderBy: { name: "asc" },
    });
  }

  @Post("venues")
  createVenue(
    @Param("orgId") orgId: string,
    @Body(new ZodValidationPipe(createVenueSchema)) body: z.infer<typeof createVenueSchema>,
  ) {
    return this.prisma.venue.create({ data: { organizationId: orgId, ...body } });
  }

  @Patch("venues/:id")
  async updateVenue(
    @Param("orgId") orgId: string,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateVenueSchema)) body: z.infer<typeof updateVenueSchema>,
  ) {
    const found = await this.prisma.venue.findFirst({ where: { id, organizationId: orgId } });
    if (!found) throw new NotFoundException("Escenario no encontrado");
    return this.prisma.venue.update({ where: { id }, data: body });
  }
}
