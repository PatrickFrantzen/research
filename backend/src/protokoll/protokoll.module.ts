import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ProtokollController } from './protokoll.controller.js';
import { ProtokollFilter } from './protokoll.filter.js';
import { ProtokollInterceptor } from './protokoll.interceptor.js';
import { Protokoll } from './protokoll.js';

@Global()
@Module({
  controllers: [ProtokollController],
  providers: [
    { provide: Protokoll, useFactory: () => new Protokoll(process.env['PROTOKOLL_VERZEICHNIS'] || 'logs') },
    { provide: APP_INTERCEPTOR, useClass: ProtokollInterceptor },
    { provide: APP_FILTER, useClass: ProtokollFilter },
  ],
  exports: [Protokoll],
})
export class ProtokollModule {}
