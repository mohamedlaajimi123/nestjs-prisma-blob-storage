import { Module, Global } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Global() // This makes Prisma available everywhere without re-importing it!
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}