import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { CotizacionesController } from './cotizaciones.controller';
import { CotizacionesService } from './cotizaciones.service';
import { CotizacionesPdfService } from './pdf/cotizaciones-pdf.service';
import { RecomendacionesModule } from './recomendaciones/recomendaciones.module';

@Module({
    imports: [PrismaModule, RecomendacionesModule],
    controllers: [CotizacionesController],
    providers: [CotizacionesService, CotizacionesPdfService],
    exports: [CotizacionesService, CotizacionesPdfService],
})
export class CotizacionesModule { }