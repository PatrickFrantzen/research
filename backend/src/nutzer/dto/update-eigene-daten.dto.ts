import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateEigeneDatenDto {
  @IsString()
  @MinLength(1)
  vorname!: string;

  @IsString()
  @MinLength(1)
  nachname!: string;

  // Genau eins von beidem, siehe NutzerService.standortIdAus.
  @IsOptional()
  @IsUUID()
  standortId?: string;

  // Freitext, wenn der Standort nicht in der Liste steht (wird angelegt).
  @IsOptional()
  @IsString()
  @MaxLength(100)
  neuerStandort?: string;

  @IsString()
  @MaxLength(30)
  @Matches(/\S/, { message: 'telefon darf nicht leer sein' })
  @Matches(/^[0-9+()/\-\s]*$/, {
    message: 'telefon darf nur Ziffern, Leerzeichen und + ( ) / - enthalten',
  })
  telefon!: string;

  @IsString()
  @MaxLength(100)
  @Matches(/\S/, { message: 'position darf nicht leer sein' })
  position!: string;
}
