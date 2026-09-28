import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { FREITEXT_MAX_LAENGE } from './create-wareneintrag.dto.js';

export class UpdateWareneintragDto {
  @IsUUID()
  avvCodeId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(FREITEXT_MAX_LAENGE)
  freitext!: string;

  // Die gespeicherte KI-Analyse löschen, das entscheidet der Nutzer beim
  // Ersetzen eines Fotos (Issue #104).
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  analyseLoeschen?: boolean;
}
