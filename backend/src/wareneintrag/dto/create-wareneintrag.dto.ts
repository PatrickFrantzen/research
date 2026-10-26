import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

// Obergrenze, damit einzelne Einträge die für alle Nutzer ausgelieferte
// Liste nicht aufblähen können (Security-Audit run-1).
export const FREITEXT_MAX_LAENGE = 2000;

export const GEWICHT_MAX_LAENGE = 100;

export class CreateWareneintragDto {
  @IsUUID()
  avvCodeId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(FREITEXT_MAX_LAENGE)
  freitext!: string;

  @IsOptional()
  @IsString()
  @MaxLength(GEWICHT_MAX_LAENGE)
  gewicht?: string;
}
