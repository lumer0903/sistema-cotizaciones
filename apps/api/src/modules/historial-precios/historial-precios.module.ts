import { Module } from '@nestjs/common';
import { HistorialPreciosController } from './historial-precios.controller';
import { HistorialPreciosService } from './historial-precios.service';

@Module({
  controllers: [HistorialPreciosController],
  providers: [HistorialPreciosService],
  exports: [HistorialPreciosService],
})
export class HistorialPreciosModule {}