import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { PasswortSetzenDto } from './passwort-setzen.dto.js';

async function validatePasswort(neuesPasswort: string) {
  const dto = plainToInstance(PasswortSetzenDto, { token: 'irgendein-token', neuesPasswort });
  return validate(dto);
}

describe('PasswortSetzenDto', () => {
  it('rejects passwords shorter than 12 characters (OWASP minimum)', async () => {
    const errors = await validatePasswort('kurz1234567'); // 11 Zeichen
    expect(errors).not.toHaveLength(0);
  });

  it('accepts a 12-character password', async () => {
    const errors = await validatePasswort('genau12zeic1'); // 12 Zeichen
    expect(errors).toHaveLength(0);
  });

  it('rejects passwords longer than 128 characters', async () => {
    const errors = await validatePasswort('a'.repeat(129));
    expect(errors).not.toHaveLength(0);
  });

  it('accepts a 128-character password', async () => {
    const errors = await validatePasswort('a'.repeat(128));
    expect(errors).toHaveLength(0);
  });

  it.each(['password123456', '123456789012', 'qwertyuiopas'])(
    'rejects the well-known weak password "%s"',
    async (schwachesPasswort) => {
      const errors = await validatePasswort(schwachesPasswort);
      expect(errors).not.toHaveLength(0);
    },
  );
});
