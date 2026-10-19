import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permission } from '../../common/decorators/permission.decorator';
import { Rol } from '@goldcontinent/shared/constants/enums';
import { BulkPricingDto, PricingQueryDto, PricingCategoriesQueryDto } from './pricing.dto';
import { PricingService } from './pricing.service';
@Controller('precios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PricingController {
    constructor(private readonly service: PricingService) { }
    @Get()
    @Permission('consulta_precios')
    list(
    @Query()
    q: PricingQueryDto) { return this.service.list(q); }
    @Get('categorias')
    @Permission('consulta_precios')
    categories(
    @Query()
    q: PricingCategoriesQueryDto) { return this.service.categories(q); }
    @Post('ajustes-masivos')
    @Permission('productos', 'edicion')
    @Roles(Rol.admin, Rol.gerente)
    bulk(
    @Body()
    dto: BulkPricingDto, 
    @Req()
    req: {
        user: {
            id_usuario: number;
        };
    }) { return this.service.bulk(dto, req.user.id_usuario); }
}
