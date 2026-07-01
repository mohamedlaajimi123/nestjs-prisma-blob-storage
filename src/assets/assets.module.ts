import { Module } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { StorageModule } from '../storage/storage.module'; 
import { PrismaModule } from '../prisma/prisma.module';   
@Module({
  imports: [
    StorageModule, 
    PrismaModule 
  ],
  controllers: [AssetsController],
  providers: [AssetsService],
})
export class AssetsModule {}