import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateNutzerDto {
  @IsString()
  @MinLength(1)
  vorname!: string;

  @IsString()
  @MinLength(1)
  nachname!: string;

  @IsEmail()
  email!: string;

  // Genau eins von beidem, siehe NutzerService.standortIdAus.
  @IsOptional()
  @IsUUID()
  standortId?: string;

  // Freitext, wenn der Standort nicht in der Liste steht (wird angelegt).
  @IsOptional()
  @IsString()
  @MaxLength(100)
  neuerStandort?: string;
}
