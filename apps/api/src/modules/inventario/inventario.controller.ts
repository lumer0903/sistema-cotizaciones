import { Permission } from '../../common/decorators/permission.decorator';
import { Controller, Get, Post, Patch, Query, Body, Param, UseGuards, Req, Res, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { InventarioService } from './inventario.service';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { CreateTransferenciaDto } from './dto/create-transferencia.dto';
import { AlertsQueryDto, MovementFilterDto, MovementsQueryDto, StockQueryDto } from '../../common/dto/inventory-query.dto';
type ActorRequest = Request & {user:{id_usuario:number}};
@ApiTags('Inventario') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Permission('productos')
@Controller('inventario')
export class InventarioController {
  constructor(private readonly inventarioService:InventarioService) {}
  @Post('movimientos') @ApiOperation({summary:'Entrada, salida o ajuste relativo firmado'})
  async createMovimiento(@Body() body:CreateMovimientoDto,@Req() req:ActorRequest) {
    return {success:true,data:await this.inventarioService.createMovimiento(body,req.user.id_usuario)};
  }
  @Get('movimientos') @ApiOperation({summary:'Movimientos generales paginados y filtrados'})
  async getMovimientos(@Query() q:MovementsQueryDto) {
    return {success:true,...await this.inventarioService.getMovimientos(q)};
  }
  @Post('transferencia') @ApiOperation({summary:'Transferencia atómica entre almacenes'})
  async createTransferencia(@Body() body:CreateTransferenciaDto,@Req() req:ActorRequest) {
    return {success:true,data:await this.inventarioService.createTransferencia(
      body.id_producto,body.id_almacen_origen,body.id_almacen_destino,body.cantidad,req.user.id_usuario,body.observaciones)};
  }
  @Get('kardex/:id_producto/export') @ApiOperation({summary:'CSV completo por cursor, sin truncamiento'})
  async exportKardex(@Param('id_producto',ParseIntPipe) id:number,@Query() q:MovementFilterDto,@Res() res:Response) {
    const chunks=this.inventarioService.exportKardex(id,q);
    const first=await chunks.next(); // Validar antes de enviar headers.
    res.setHeader('Content-Type','text/csv; charset=utf-8');
    res.setHeader('Content-Disposition','attachment; filename="kardex-'+id+'.csv"');
    try {
      await pipeline(Readable.from((async function*(){if(!first.done) yield first.value;yield* chunks;})()),res);
    } finally { await chunks.return(undefined); }
  }
  @Get('kardex/:id_producto') @ApiOperation({summary:'Kárdex paginado; fechas de calendario de Lima inclusivas'})
  async getKardex(@Param('id_producto',ParseIntPipe) id:number,@Query() q:MovementsQueryDto) {
    return {success:true,...await this.inventarioService.getKardex(id,q)};
  }
  @Get('stock') @ApiOperation({summary:'Stock paginado; bajo mínimo filtrado en PostgreSQL'})
  async getStockActual(@Query() q:StockQueryDto) {
    return {success:true,...await this.inventarioService.getStockActual(q)};
  }
  @Get('alertas') @ApiOperation({summary:'Alertas paginadas: abiertas, activa, reconocida, resuelta o todas'})
  async getAlertas(@Query() q:AlertsQueryDto) {
    return {success:true,...await this.inventarioService.getAlertasStock(q)};
  }
  @Patch('alertas/:id_alerta/reconocer')
  async reconocerAlerta(@Param('id_alerta',ParseIntPipe) id:number) {
    return {success:true,data:await this.inventarioService.reconocerAlerta(id)};
  }
}
