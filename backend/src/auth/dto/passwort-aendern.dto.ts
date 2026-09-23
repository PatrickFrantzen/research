import { IsString, MaxLength, MinLength } from 'class-validator';
import { IstKeinHaeufigesPasswort } from './haeufiges-passwort.validator.js';

// Ersetzt das Initialpasswort beim ersten Login (Issue #76). Regeln wie
// PasswortSetzenDto.
export class PasswortAendernDto {
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @IstKeinHaeufigesPasswort()
  neuesPasswort!: string;
}
