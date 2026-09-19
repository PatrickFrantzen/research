import { Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ConsoleMailer } from './mailer.js';

describe('ConsoleMailer', () => {
  it('never logs the raw reset link/token, only that a link was sent', async () => {
    const logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const mailer = new ConsoleMailer();

    await mailer.sendPasswortSetzenLink('max@research.local', '/passwort-setzen?token=geheimer-roh-token');

    const loggedMessages = logSpy.mock.calls.map((call) => String(call[0]));
    expect(loggedMessages.some((message) => message.includes('geheimer-roh-token'))).toBe(false);
    expect(loggedMessages.some((message) => message.includes('max@research.local'))).toBe(true);
  });
});
