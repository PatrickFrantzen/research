// Prüft die Längengrenzen des Freitexts in Create- und Update-DTO (Security-Audit run-1).
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateWareneintragDto } from './create-wareneintrag.dto.js';
import { UpdateWareneintragDto } from './update-wareneintrag.dto.js';

const AVV_CODE_ID = 'f8a3632d-6b2c-4843-b223-85a711b4a9a7';

describe.each([
  ['CreateWareneintragDto', CreateWareneintragDto],
  ['UpdateWareneintragDto', UpdateWareneintragDto],
])('%s', (_name, Dto) => {
  async function validateFreitext(freitext: string) {
    return validate(plainToInstance(Dto, { avvCodeId: AVV_CODE_ID, freitext }));
  }

  it('accepts a freitext of 2000 characters', async () => {
    expect(await validateFreitext('a'.repeat(2000))).toHaveLength(0);
  });

  it('rejects a freitext longer than 2000 characters', async () => {
    expect(await validateFreitext('a'.repeat(2001))).not.toHaveLength(0);
  });
});
