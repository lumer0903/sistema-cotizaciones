import { describe,it,expect } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { csvText,movementWhere,startOfLimaDay } from './inventory-query.util';
import { MovementsQueryDto,ProductsQueryDto } from '../dto/inventory-query.dto';
describe('consultas de inventario',()=>{
  it('incluye el fin del día de Lima usando límite exclusivo',()=>{
    const w=movementWhere({fecha_inicio:'2026-10-10',fecha_fin:'2026-10-10'});
    expect(w.created_at).toEqual({gte:new Date('2026-10-10T05:00:00Z'),lt:new Date('2026-10-11T05:00:00Z')});
  });
  it('rechaza fechas imposibles y rangos invertidos',()=>{
    expect(()=>startOfLimaDay('2026-02-30')).toThrow();
    expect(()=>movementWhere({fecha_inicio:'2026-10-11',fecha_fin:'2026-10-10'})).toThrow();
  });
  it('filtra transferencias por origen, porque las contrapartes son entrada/salida',()=>{
    expect(movementWhere({tipo:'transferencia'})).toEqual({id_producto:undefined,id_almacen:undefined,origen:'transferencia'});
  });
  it('rechaza fracciones, NaN, enum desconocido y filtros ignorados',async()=>{
    for(const query of [{page:'1.5'},{id_almacen:'NaN'},{tipo:'bad'},{stock_estado:'bajo'}]){
      expect((await validate(plainToInstance(MovementsQueryDto,query),{whitelist:true,forbidNonWhitelisted:true})).length).toBeGreaterThan(0);
    }
  });
  it('rechaza filtros de transferencia contradictorios',()=>{
    expect(()=>movementWhere({tipo:'transferencia',origen:'compra'})).toThrow('incompatibles');
  });
  it('false se interpreta como boolean false y no como true',async()=>{
    const dto=plainToInstance(ProductsQueryDto,{activo:'false'});
    expect(dto.activo).toBe(false);expect(await validate(dto)).toEqual([]);
    expect((await validate(plainToInstance(ProductsQueryDto,{activo:'anything'}))).length).toBeGreaterThan(0);
  });
  it('escapa delimitadores y neutraliza fórmulas de CSV',()=>{
    expect(csvText('a,"b"\nc')).toBe('"a,""b""\nc"');
    expect(csvText('  =HYPERLINK("x")')).toBe('"\'  =HYPERLINK(""x"")"');
  });
});
