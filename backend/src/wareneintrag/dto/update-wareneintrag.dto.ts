import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { FREITEXT_MAX_LAENGE } from './create-wareneintrag.dto.js';

export class UpdateWareneintragDto {
  @IsUUID()
  avvCodeId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(FREITEXT_MAX_LAENGE)
  freitext!: string;
}
