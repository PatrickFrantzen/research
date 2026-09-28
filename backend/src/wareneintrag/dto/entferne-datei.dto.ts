import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

// Einzeln löschbare Dateien eines Wareneintrags (Issue #104).
export const ENTFERNBARE_DATEIEN = [
  'fotoFern',
  'fotoNah',
  'fotoDetail',
  'dokument',
] as const;
export type EntfernbareDatei = (typeof ENTFERNBARE_DATEIEN)[number];

export class EntferneDateiParams {
  @IsString()
  id!: string;

  @IsIn(ENTFERNBARE_DATEIEN)
  feld!: EntfernbareDatei;
}

export class EntferneDateiQuery {
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  analyseLoeschen?: boolean;
}
