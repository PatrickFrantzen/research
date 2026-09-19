import { IsString, MaxLength, MinLength } from 'class-validator';
import { IstKeinHaeufigesPasswort } from './haeufiges-passwort.validator.js';

export class PasswortSetzenDto {
  @IsString()
  token!: string;

  // OWASP ASVS empfiehlt ohne verpflichtende MFA mindestens 12 Zeichen.
  // Obergrenze schützt vor unnötig großen Eingaben, bcrypt kürzt ab 72 Bytes ohnehin.
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @IstKeinHaeufigesPasswort()
  neuesPasswort!: string;
}
