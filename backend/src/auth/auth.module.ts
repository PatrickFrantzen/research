import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { loadEnv } from '../config/env.js';
import nodemailer from 'nodemailer';
import { ConsoleMailer, Mailer } from '../mailer/mailer.js';
import { SmtpMailer } from '../mailer/smtp-mailer.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './jwt.strategy.js';

const passportModule = PassportModule.register({ defaultStrategy: 'jwt' });

function erzeugeMailer(): Mailer {
  const mail = loadEnv().mail;
  if (!mail) {
    return new ConsoleMailer();
  }
  const transport = nodemailer.createTransport({
    host: mail.host,
    port: mail.port,
    // 465 = implizites TLS, sonst STARTTLS (web.de: 587).
    secure: mail.port === 465,
    requireTLS: mail.port !== 465,
    auth: { user: mail.user, pass: mail.passwort },
  });
  return new SmtpMailer(transport, mail.absender, mail.appUrl);
}

@Global()
@Module({
  imports: [
    passportModule,
    JwtModule.registerAsync({
      useFactory: () => {
        const env = loadEnv();
        return {
          secret: env.auth.jwtSecret,
          signOptions: {
            expiresIn: env.auth.jwtExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
            algorithm: 'HS256',
            // Muss zu den Optionen passen, die JwtStrategy beim Verifizieren
            // erzwingt (Issue #34).
            issuer: env.auth.jwtIssuer,
            audience: env.auth.jwtAudience,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, { provide: Mailer, useFactory: erzeugeMailer }],
  exports: [Mailer, passportModule],
})
export class AuthModule {}
