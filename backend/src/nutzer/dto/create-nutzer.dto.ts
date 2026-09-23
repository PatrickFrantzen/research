import { IsEmail, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { IstKeinHaeufigesPasswort } from '../../auth/dto/haeufiges-passwort.validator.js';

export class CreateNutzerDto {
  @IsString()
  @MinLength(1)
  vorname!: string;

  @IsString()
  @MinLength(1)
  nachname!: string;

  @IsEmail()
  email!: string;

  @IsUUID()
  standortId!: string;

  // Initialpasswort, persönlich an den neuen Kollegen übergeben (kein
  // Mailversand, Issue #76). Muss beim ersten Login geändert werden.
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @IstKeinHaeufigesPasswort()
  passwort!: string;
}
