import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  BadRequestException,
  ParseIntPipe,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/infrastructure/jwt-auth.guard';
import { ProductosService } from './productos.service';
import { MinioService } from '../../common/storage/minio.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { UpdatePreciosDto } from './dto/update-precios.dto';
import type {
  ProductoResponse,
  PaginatedProductosResponse,
  PreciosActualesResponse,
} from './productos.service';

@ApiTags('Productos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('productos')
export class ProductosController {
  constructor(
    private readonly productosService: ProductosService,
    private readonly minioService: MinioService,
  ) { }

  @Get()
  @ApiOperation({ summary: 'List all products with pagination, search, and optional relations' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'stock_status', required: false, type: String, description: 'disponible, bajo, agotado' })
  @ApiQuery({ name: 'include', required: false, type: String, description: 'Comma-separated: precios,categoria,stock' })
  async findAll(
    @Query('page') page?: string | number,
    @Query('limit') limit?: string | number,
    @Query('search') search?: string,
    @Query('stock_status') stock_status?: string,
    @Query('include') include?: string,
  ): Promise<{ success: true; data: PaginatedProductosResponse['data']; total: number; page: number; limit: number }> {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 50);

    const includePrecios = include?.includes('precios') ?? false;
    const includeCategoria = include?.includes('categoria') ?? false;
    const includeStockActual = include?.includes('stock') ?? false;

    const result = await this.productosService.findAll(
      pageNum,
      limitNum,
      search,
      stock_status,
      includePrecios,
      includeCategoria,
      includeStockActual,
    );
    return { success: true, ...result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiQuery({ name: 'include', required: false, type: String, description: 'Comma-separated: precios,categoria,stock' })
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @Query('include') include?: string,
  ): Promise<{ success: true; data: ProductoResponse | null }> {
    const includePrecios = include?.includes('precios') ?? false;
    const includeCategoria = include?.includes('categoria') ?? false;
    const includeStockActual = include?.includes('stock') ?? false;

    const producto = await this.productosService.findById(id, includePrecios, includeCategoria, includeStockActual);
    return { success: true, data: producto };
  }

  @Post()
  @ApiOperation({ summary: 'Create new product' })
  async create(@Body() body: CreateProductoDto): Promise<{ success: true; data: ProductoResponse }> {
    const producto = await this.productosService.create(body);
    return { success: true, data: producto };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update product' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProductoDto,
  ): Promise<{ success: true; data: ProductoResponse }> {
    const producto = await this.productosService.update(id, body);
    return { success: true, data: producto };
  }

  @Patch(':id/precios')
  @ApiOperation({ summary: 'Actualiza precios del producto con auditoría automática' })
  async updatePrecios(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePreciosDto,
    @Req() req: Request & { user: { id_usuario?: number | string; id?: number | string; sub?: number | string } },
  ): Promise<{ success: true; data: PreciosActualesResponse }> {
    const rawId = req.user?.id_usuario ?? req.user?.id ?? req.user?.sub;
    const userId = rawId !== undefined ? Number(rawId) : NaN;

    if (!userId || isNaN(userId)) {
      throw new BadRequestException('Usuario no identificado o ID inválido');
    }

    const precios = await this.productosService.updatePrecios(
      id,
      body,
      userId,
    );
    return { success: true, data: precios };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete product (soft delete)' })
  async delete(@Param('id', ParseIntPipe) id: number): Promise<{ success: true; message: string }> {
    await this.productosService.delete(id);
    return { success: true, message: 'Producto eliminado correctamente' };
  }

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return callback(new BadRequestException('Invalid file type. Only JPEG, PNG, and WebP are allowed.'), false);
        }
        callback(null, true);
      },
    }),
  )
  @ApiOperation({ summary: 'Upload product image to MinIO' })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const url = await this.minioService.uploadProductImage(file);
    return { url: url || '' };
  }
}
