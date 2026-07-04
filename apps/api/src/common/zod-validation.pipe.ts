import { BadRequestException, Injectable, type PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";

/**
 * Pipe de validación con schemas de @ligas/contracts.
 * Uso: @Body(new ZodValidationPipe(createTeamSchema)) body: CreateTeamInput
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        statusCode: 400,
        error: "VALIDATION_ERROR",
        message: "Datos inválidos",
        details: result.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
    }
    return result.data;
  }
}
