import { Injectable,OnModuleInit, OnModuleDestroy, Global } from "@nestjs/common";
import {PrismaClient} from '@prisma/client';

@Global()
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy, OnModuleInit{
    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}