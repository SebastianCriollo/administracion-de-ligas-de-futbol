import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { createStaffSchema, createTeamSchema, updateTeamSchema } from "@ligas/contracts";
import type { Prisma } from "@ligas/database";
import type { z } from "zod";
import { Roles } from "../../auth/decorators";
import { slugify } from "../../common/slugify";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { PrismaService } from "../../infrastructure/prisma.service";

@Roles("LEAGUE_ADMIN")
@Controller("orgs/:orgId/teams")
export class TeamsController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  list(@Param("orgId") orgId: string) {
    return this.prisma.team.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { roster: { where: { leftAt: null } } } } },
      orderBy: { name: "asc" },
    });
  }

  @Get(":id")
  async get(@Param("orgId") orgId: string, @Param("id") id: string) {
    const team = await this.prisma.team.findFirst({
      where: { id, organizationId: orgId },
      include: {
        roster: {
          where: { leftAt: null },
          include: { player: true },
          orderBy: { shirtNumber: "asc" },
        },
        staff: true,
        sponsors: true,
        homeVenue: true,
      },
    });
    if (!team) throw new NotFoundException("Equipo no encontrado");
    return team;
  }

  @Post()
  create(
    @Param("orgId") orgId: string,
    @Body(new ZodValidationPipe(createTeamSchema)) body: z.infer<typeof createTeamSchema>,
  ) {
    return this.prisma.team.create({
      data: {
        organizationId: orgId,
        name: body.name,
        shortName: body.shortName ?? body.name.slice(0, 3).toUpperCase(),
        slug: body.slug ?? slugify(body.name),
        city: body.city,
        foundedYear: body.foundedYear,
        history: body.history,
        homeVenueId: body.homeVenueId,
        kits: body.kits as Prisma.InputJsonValue,
        socialLinks: body.socialLinks as Prisma.InputJsonValue,
      },
    });
  }

  @Patch(":id")
  async update(
    @Param("orgId") orgId: string,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateTeamSchema)) body: z.infer<typeof updateTeamSchema>,
  ) {
    await this.get(orgId, id);
    const { kits, socialLinks, ...rest } = body;
    return this.prisma.team.update({
      where: { id },
      data: {
        ...rest,
        kits: kits as Prisma.InputJsonValue | undefined,
        socialLinks: socialLinks as Prisma.InputJsonValue | undefined,
      },
    });
  }

  /** Desactiva (la historia deportiva es intocable, Fase 5 §3.6). */
  @Delete(":id")
  async remove(@Param("orgId") orgId: string, @Param("id") id: string) {
    await this.get(orgId, id);
    return this.prisma.team.update({ where: { id }, data: { isActive: false } });
  }

  @Post(":id/staff")
  async addStaff(
    @Param("orgId") orgId: string,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(createStaffSchema)) body: z.infer<typeof createStaffSchema>,
  ) {
    await this.get(orgId, id);
    return this.prisma.teamStaff.create({
      data: { teamId: id, name: body.name, role: body.role },
    });
  }
}
