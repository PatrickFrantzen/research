import { IsString, MaxLength, MinLength } from 'class-validator';
import { IstKeinHaeufigesPasswort } from '../../auth/dto/haeufiges-passwort.validator.js';

// Neues Initialpasswort für einen Kollegen, der sein Passwort vergessen hat
// (Issue #76). Regeln wie PasswortSetzenDto.
export class PasswortZuruecksetzenDto {
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @IstKeinHaeufigesPasswort()
  passwort!: string;
}
