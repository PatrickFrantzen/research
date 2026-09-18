import { IsString, MinLength } from 'class-validator';

export class PasswortSetzenDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  neuesPasswort!: string;
}
