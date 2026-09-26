import { Injectable, Logger } from '@nestjs/common';

export abstract class Mailer {
  abstract sendPasswortSetzenLink(empfaenger: string, link: string): Promise<void>;
  abstract sendEinladung(empfaenger: string, link: string): Promise<void>;
}

// Es ist noch kein SMTP-Versand angebunden (kein Bestandteil dieses Tickets).
// Bis dahin wird der Link geloggt statt verschickt.
@Injectable()
export class ConsoleMailer extends Mailer {
  private readonly logger = new Logger(ConsoleMailer.name);

  async sendPasswortSetzenLink(empfaenger: string, _link: string): Promise<void> {
    // Der Link enthält den Roh-Reset-Token und darf nie geloggt werden
    // (Issue #30) – Logzugriff würde sonst zur Kontoübernahme reichen.
    this.logger.log(`Passwort-setzen-Link wurde an ${empfaenger} versendet.`);
  }

  async sendEinladung(empfaenger: string, _link: string): Promise<void> {
    this.logger.log(`Einladung wurde an ${empfaenger} versendet.`);
  }
}
