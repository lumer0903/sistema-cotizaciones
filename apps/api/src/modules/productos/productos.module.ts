import { PricingController } from '../precios/pricing.controller';
import { PricingService } from '../precios/pricing.service';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { MinioModule } from '../../common/storage/minio.module';
import { AiModule } from '../ai/infrastructure/ai.module';
import { ProductosController } from './productos.controller';
import { ProductosService } from './productos.service';

@Module({
  imports: [PrismaModule, MinioModule, AiModule],
  controllers: [ProductosController, PricingController],
  providers: [ProductosService, PricingService],
  exports: [ProductosService],
})
export class ProductosModule {}
