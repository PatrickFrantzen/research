import { Module } from '@nestjs/common';
import { AvvController } from './avv.controller.js';

@Module({
  controllers: [AvvController],
})
export class AvvModule {}
