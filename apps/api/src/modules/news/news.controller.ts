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
import { createNewsSchema, updateNewsSchema, type AccessTokenPayload } from "@ligas/contracts";
import type { z } from "zod";
import { CurrentUser, Roles } from "../../auth/decorators";
import { slugify } from "../../common/slugify";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { PrismaService } from "../../infrastructure/prisma.service";

@Roles("LEAGUE_ADMIN")
@Controller("orgs/:orgId/news")
export class NewsController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  list(@Param("orgId") orgId: string) {
    return this.prisma.news.findMany({
      where: { organizationId: orgId },
      include: { author: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  @Post()
  create(
    @Param("orgId") orgId: string,
    @Body(new ZodValidationPipe(createNewsSchema)) body: z.infer<typeof createNewsSchema>,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.prisma.news.create({
      data: {
        organizationId: orgId,
        authorId: user.sub,
        title: body.title,
        slug: body.slug ?? slugify(body.title),
        excerpt: body.excerpt,
        content: body.content,
        status: body.status,
        publishedAt: body.status === "PUBLISHED" ? new Date() : null,
      },
    });
  }

  @Patch(":id")
  async update(
    @Param("orgId") orgId: string,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateNewsSchema)) body: z.infer<typeof updateNewsSchema>,
  ) {
    const found = await this.prisma.news.findFirst({ where: { id, organizationId: orgId } });
    if (!found) throw new NotFoundException("Noticia no encontrada");
    return this.prisma.news.update({
      where: { id },
      data: {
        ...body,
        publishedAt:
          body.status === "PUBLISHED" && !found.publishedAt ? new Date() : found.publishedAt,
      },
    });
  }

  @Delete(":id")
  async remove(@Param("orgId") orgId: string, @Param("id") id: string) {
    const found = await this.prisma.news.findFirst({ where: { id, organizationId: orgId } });
    if (!found) throw new NotFoundException("Noticia no encontrada");
    await this.prisma.news.delete({ where: { id } });
    return { id };
  }
}
