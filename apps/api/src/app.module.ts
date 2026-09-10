import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './common/prisma/prisma.module';
import { StorageModule } from './common/storage/storage.module';
import { AuthModule } from './modules/auth/infrastructure/auth.module';
import { QuotesModule } from './modules/quotes/infrastructure/quotes.module';
import { AiModule } from './modules/ai/infrastructure/ai.module';
import { ProductosModule } from './modules/productos/productos.module';
import { VentasModule } from './modules/ventas/ventas.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { CobranzaModule } from './modules/cobranza/cobranza.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { CategoriasModule } from './modules/categorias/categorias.module';
import { HistorialPreciosModule } from './modules/historial-precios/historial-precios.module';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    AuthModule,
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
        },
      }),
    }),
    QuotesModule,
    AiModule,
    ProductosModule,
    VentasModule,
    UsuariosModule,
    CobranzaModule,
    ClientesModule,
    CategoriasModule,
    HistorialPreciosModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
