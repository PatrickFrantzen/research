import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { loadEnv } from '../config/env.js';
import { ConsoleMailer, Mailer } from '../mailer/mailer.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './jwt.strategy.js';

const passportModule = PassportModule.register({ defaultStrategy: 'jwt' });

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
  providers: [AuthService, JwtStrategy, { provide: Mailer, useClass: ConsoleMailer }],
  exports: [Mailer, passportModule],
})
export class AuthModule {}
