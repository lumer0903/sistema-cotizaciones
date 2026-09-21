import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { CotizacionesController } from './cotizaciones.controller';
import { CotizacionesService } from './cotizaciones.service';
import { RecomendacionesModule } from './recomendaciones/recomendaciones.module';

@Module({
    imports: [PrismaModule, RecomendacionesModule],
    controllers: [CotizacionesController],
    providers: [CotizacionesService],
    exports: [CotizacionesService],
})
export class CotizacionesModule { }