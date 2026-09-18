import { IsString, IsUUID, MinLength } from 'class-validator';

export class UpdateWareneintragDto {
  @IsUUID()
  avvCodeId!: string;

  @IsString()
  @MinLength(1)
  freitext!: string;
}
