import type { Transporter } from 'nodemailer';
import { Mailer } from './mailer.js';

// Links kommen relativ aus den Services und werden hier absolut gemacht.
// Kein Logging: der Link enthält den Roh-Token (Issue #30).
export class SmtpMailer extends Mailer {
  constructor(
    private readonly transport: Transporter,
    private readonly absender: string,
    private readonly appUrl: string,
  ) {
    super();
  }

  async sendPasswortSetzenLink(empfaenger: string, link: string): Promise<void> {
    await this.senden(
      empfaenger,
      'RESEARCH: Passwort neu setzen',
      `Hallo,\n\nüber diesen Link kannst du dein Passwort für RESEARCH neu setzen:\n\n${this.appUrl}${link}\n\nDer Link ist nur begrenzt gültig. Wenn du das nicht erwartet hast, ignoriere diese Mail.\n`,
    );
  }

  async sendEinladung(empfaenger: string, link: string): Promise<void> {
    await this.senden(
      empfaenger,
      'RESEARCH: Einladung',
      `Hallo,\n\nfür dich wurde ein Zugang zu RESEARCH angelegt. Über diesen Link setzt du dein Passwort:\n\n${this.appUrl}${link}\n\nDer Link ist 7 Tage gültig.\n`,
    );
  }

  private async senden(empfaenger: string, betreff: string, text: string): Promise<void> {
    await this.transport.sendMail({ from: this.absender, to: empfaenger, subject: betreff, text });
  }
}
