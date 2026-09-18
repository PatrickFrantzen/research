import { IsEmail } from 'class-validator';

export class PasswortVergessenDto {
  @IsEmail()
  email!: string;
}
