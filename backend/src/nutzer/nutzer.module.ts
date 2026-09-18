import { Module } from '@nestjs/common';
import { NutzerController } from './nutzer.controller.js';
import { NutzerService } from './nutzer.service.js';

@Module({
  controllers: [NutzerController],
  providers: [NutzerService],
})
export class NutzerModule {}
