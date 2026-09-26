import { IsString, MaxLength } from 'class-validator';

export class AppFehlerDto {
  @IsString()
  @MaxLength(500)
  meldung!: string;

  @IsString()
  @MaxLength(200)
  seite!: string;
}
