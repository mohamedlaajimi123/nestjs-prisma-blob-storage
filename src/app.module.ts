import { Global, Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { StorageModule } from './storage/storage.module';
import { AssetsModule } from './assets/assets.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { PrismaModule } from './prisma/prisma.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule, 
    StorageModule, 
    AssetsModule, PrismaModule,
  ],
  controllers: [], // Clear this out!
  providers: [PrismaService],
  exports: [PrismaService], // Add this so other modules can use it!
})
export class AppModule {}