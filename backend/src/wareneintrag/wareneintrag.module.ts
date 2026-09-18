import { Module } from '@nestjs/common';
import { ObjectStorageModule } from '../object-storage/object-storage.module.js';
import { WareneintragController } from './wareneintrag.controller.js';
import { WareneintragService } from './wareneintrag.service.js';

@Module({
  imports: [ObjectStorageModule],
  controllers: [WareneintragController],
  providers: [WareneintragService],
})
export class WareneintragModule {}
