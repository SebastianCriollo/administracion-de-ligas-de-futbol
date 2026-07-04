import { Injectable, Logger } from "@nestjs/common";

/**
 * Servicio de correo. En desarrollo loguea el contenido; el proveedor
 * real (Resend/SES) se conecta en la fase de notificaciones sin cambiar
 * a los consumidores.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger("Mail");

  async send(to: string, subject: string, body: string): Promise<void> {
    // TODO(fase-12): integrar Resend. Interfaz estable desde ya.
    this.logger.log(`📧 → ${to} · ${subject}\n${body}`);
  }
}
