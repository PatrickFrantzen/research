import nodemailer, { type SendMailOptions } from 'nodemailer';
import { describe, expect, it } from 'vitest';
import { SmtpMailer } from './smtp-mailer.js';

// jsonTransport rendert die Mail, ohne sie zu verschicken.
function buildMailer() {
  const transport = nodemailer.createTransport({ jsonTransport: true });
  const gesendet: Array<{ to: Array<{ address: string }>; from: { address: string }; subject: string; text: string }> = [];
  const original = transport.sendMail.bind(transport);
  transport.sendMail = (async (mail: SendMailOptions) => {
    const info = await original(mail);
    gesendet.push(JSON.parse(info.message as string));
    return info;
  }) as typeof transport.sendMail;
  const mailer = new SmtpMailer(transport, 'absender@web.de', 'https://research.example.de');
  return { mailer, gesendet };
}

describe('SmtpMailer', () => {
  it('schickt den Passwort-Link als absolute URL vom konfigurierten Absender', async () => {
    const { mailer, gesendet } = buildMailer();

    await mailer.sendPasswortSetzenLink('max@research.local', '/passwort-setzen?token=abc123');

    expect(gesendet).toHaveLength(1);
    expect(gesendet[0].to[0].address).toBe('max@research.local');
    expect(gesendet[0].from.address).toBe('absender@web.de');
    expect(gesendet[0].subject).toContain('Passwort');
    expect(gesendet[0].text).toContain('https://research.example.de/passwort-setzen?token=abc123');
  });

  it('schickt die Einladung mit eigenem Betreff und absolutem Link', async () => {
    const { mailer, gesendet } = buildMailer();

    await mailer.sendEinladung('neu@research.local', '/passwort-setzen?token=xyz');

    expect(gesendet[0].to[0].address).toBe('neu@research.local');
    expect(gesendet[0].subject).toContain('Einladung');
    expect(gesendet[0].text).toContain('https://research.example.de/passwort-setzen?token=xyz');
  });
});
