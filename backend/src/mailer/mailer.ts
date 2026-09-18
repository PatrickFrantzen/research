import { Injectable, Logger } from '@nestjs/common';

export abstract class Mailer {
  abstract sendPasswortSetzenLink(empfaenger: string, link: string): Promise<void>;
}

// Es ist noch kein SMTP-Versand angebunden (kein Bestandteil dieses Tickets).
// Bis dahin wird der Link geloggt statt verschickt.
@Injectable()
export class ConsoleMailer extends Mailer {
  private readonly logger = new Logger(ConsoleMailer.name);

  async sendPasswortSetzenLink(empfaenger: string, link: string): Promise<void> {
    this.logger.log(`Passwort-setzen-Link für ${empfaenger}: ${link}`);
  }
}
