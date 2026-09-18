import { IsString, IsUUID, MinLength } from 'class-validator';

export class UpdateEigeneDatenDto {
  @IsString()
  @MinLength(1)
  vorname!: string;

  @IsString()
  @MinLength(1)
  nachname!: string;

  @IsUUID()
  standortId!: string;
}
