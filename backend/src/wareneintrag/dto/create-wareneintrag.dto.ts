import { IsString, IsUUID, MinLength } from 'class-validator';

export class CreateWareneintragDto {
  @IsUUID()
  avvCodeId!: string;

  @IsString()
  @MinLength(1)
  freitext!: string;
}
