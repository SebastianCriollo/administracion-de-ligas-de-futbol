import { Injectable, Logger } from "@nestjs/common";
import { loadEnv } from "../config/env";

/**
 * Correo transaccional vía Resend (HTTP API, sin SDK). Sin RESEND_API_KEY
 * configurada (desarrollo), loguea el contenido — misma interfaz.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger("Mail");
  private readonly env = loadEnv();

  async send(to: string, subject: string, body: string): Promise<void> {
    if (!this.env.RESEND_API_KEY) {
      this.logger.log(`📧 (dev) → ${to} · ${subject}\n${body}`);
      return;
    }
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.env.MAIL_FROM,
          to: [to],
          subject,
          text: body,
        }),
      });
      if (!res.ok) {
        this.logger.error(`Resend ${res.status}: ${await res.text()}`);
      }
    } catch (e) {
      // El correo nunca debe tumbar la operación de negocio.
      this.logger.error(`Fallo enviando correo a ${to}: ${String(e)}`);
    }
  }
}
