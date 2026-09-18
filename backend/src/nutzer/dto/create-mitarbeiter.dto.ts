import { IsEmail, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateMitarbeiterDto {
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
}
