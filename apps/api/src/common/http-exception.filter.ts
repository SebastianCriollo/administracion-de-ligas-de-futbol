import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";
import type { Response } from "express";

/** Convierte toda excepción al envelope único de la API (Fase 6 §1). */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("Exceptions");

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      res
        .status(status)
        .json(
          typeof body === "object"
            ? { statusCode: status, error: HttpStatus[status], ...body }
            : { statusCode: status, error: HttpStatus[status], message: body },
        );
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    res.status(500).json({
      statusCode: 500,
      error: "INTERNAL_SERVER_ERROR",
      message: "Error interno del servidor",
    });
  }
}
