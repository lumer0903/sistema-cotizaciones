import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AlmacenesController } from './almacenes.controller';
import { AlmacenesService } from './almacenes.service';

@Module({
  imports: [PrismaModule],
  controllers: [AlmacenesController],
  providers: [AlmacenesService],
  exports: [AlmacenesService],
})
export class AlmacenesModule {}