import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './common/prisma/prisma.module';
import { StorageModule } from './common/storage/storage.module';
import { MinioModule } from './common/storage/minio.module';
import { AuthModule } from './modules/auth/infrastructure/auth.module';
import { CotizacionesModule } from './modules/cotizaciones/cotizaciones.module';
import { AiModule } from './modules/ai/infrastructure/ai.module';
import { ProductosModule } from './modules/productos/productos.module';
import { VentasModule } from './modules/ventas/ventas.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { CobranzaModule } from './modules/cobranza/cobranza.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { CategoriasModule } from './modules/categorias/categorias.module';
import { HistorialPreciosModule } from './modules/historial-precios/historial-precios.module';
import { AlmacenesModule } from './modules/almacenes/almacenes.module';
import { InventarioModule } from './modules/inventario/inventario.module';
import { RecomendacionesModule } from './modules/cotizaciones/recomendaciones/recomendaciones.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ConfiguracionModule } from './modules/configuracion/configuracion.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    StorageModule,
    MinioModule,
    AuthModule,
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
        },
      }),
    }),
    CotizacionesModule,
    AiModule,
    ProductosModule,
    VentasModule,
    UsuariosModule,
    CobranzaModule,
    ClientesModule,
    CategoriasModule,
    HistorialPreciosModule,
    AlmacenesModule,
    InventarioModule,
    RecomendacionesModule,
    DashboardModule,
    ConfiguracionModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
