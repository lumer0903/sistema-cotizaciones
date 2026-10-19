import { Permission } from '../../common/decorators/permission.decorator';
import { Controller, Get, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Rol } from '@goldcontinent/shared/constants/enums';
import { HistorialPreciosService } from './historial-precios.service';
import { HistoryQueryDto } from '../precios/pricing.dto';
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.admin, Rol.gerente)
@Permission('consulta_precios')
@Controller('historial-precios')
export class HistorialPreciosController {
    constructor(private readonly service: HistorialPreciosService) { }
    @Get()
    async findAll(
    @Query()
    q: HistoryQueryDto) { return { success: true, ...await this.service.findAll(q.page, q.limit, q) }; }
    @Get(':id')
    async findById(
    @Param('id', ParseIntPipe)
    id: number) { return { success: true, data: await this.service.findById(id) }; }
}
