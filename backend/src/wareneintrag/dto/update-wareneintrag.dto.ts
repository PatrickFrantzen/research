import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { FREITEXT_MAX_LAENGE } from './create-wareneintrag.dto.js';

// Einzeln löschbare Dateien (Issue #104).
export const ENTFERNBARE_DATEIEN = [
  'fotoFern',
  'fotoNah',
  'fotoDetail',
  'dokument',
] as const;
export type EntfernbareDatei = (typeof ENTFERNBARE_DATEIEN)[number];

export class UpdateWareneintragDto {
  @IsUUID()
  avvCodeId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(FREITEXT_MAX_LAENGE)
  freitext!: string;

  // Multipart kennt keine Arrays, daher kommagetrennt: "fotoFern,dokument".
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').filter(Boolean) : value,
  )
  @IsIn(ENTFERNBARE_DATEIEN, { each: true })
  entfernen?: EntfernbareDatei[];

  // Die gespeicherte KI-Analyse löschen, das entscheidet der Nutzer beim
  // Löschen oder Ersetzen eines Fotos (Issue #104).
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  analyseLoeschen?: boolean;
}
