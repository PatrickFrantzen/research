import { Module } from '@nestjs/common';
import { StandortController } from './standort.controller.js';

@Module({
  controllers: [StandortController],
})
export class StandortModule {}
