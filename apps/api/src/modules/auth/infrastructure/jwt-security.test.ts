import { describe, it, expect, vi } from 'vitest';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
function setup(changes = {}) {
 const user = { id_usuario: 1, email: 'security@test.invalid', rol: 'vendedor', activo: true, deleted_at: null, session_version: 2, ...changes };
 const db: any = { usuario: { findUnique: vi.fn().mockResolvedValue(user) }, rol: { findUnique: vi.fn().mockResolvedValue({ id_rol: 1, activo: true }) }, usuarioPermiso: { findMany: vi.fn().mockResolvedValue([{modulo:'reportes',nivel:'sin_acceso'}]) }, rolPermiso: { findMany: vi.fn().mockResolvedValue([]) } };
 return { strategy: new JwtStrategy(db), db };
}
describe('sesiones vigentes y permisos del servidor', () => {
 it.each([{activo:false}, {deleted_at:new Date()}, {session_version:3}])('rechaza cuenta revocada %j', async changes => {
   const {strategy}=setup(changes); await expect(strategy.validate({id_usuario:1,session_version:2})).rejects.toBeInstanceOf(UnauthorizedException);
 });
 it('rechaza tokens anteriores a la versión de sesiones', async () => {
   await expect(setup().strategy.validate({id_usuario:1})).rejects.toBeInstanceOf(UnauthorizedException);
 });
 it('consulta el rol y las restricciones actuales', async () => {
   const {strategy}=setup(); const user=await strategy.validate({id_usuario:1,session_version:2});
   expect(user.rol).toBe('vendedor'); expect(user.permisos.reportes).toBe('sin_acceso');
 });
 it('rechaza rol desactivado', async () => {
   const {strategy,db}=setup(); db.rol.findUnique.mockResolvedValue({activo:false});
   await expect(strategy.validate({id_usuario:1,session_version:2})).rejects.toBeInstanceOf(UnauthorizedException);
 });
 it('lectura no permite mutaciones aunque exista un JWT válido', async () => {
   const spy=vi.spyOn(AuthGuard('jwt').prototype,'canActivate').mockResolvedValue(true);
   try {
    const guard=new JwtAuthGuard({getAllAndOverride:()=>({modulo:'productos'})} as any);
    const req={method:'GET',user:{rol:'vendedor',permisos:{productos:'lectura'}}};
    const context:any={switchToHttp:()=>({getRequest:()=>req}),getHandler:()=>null,getClass:()=>null};
    expect(await guard.canActivate(context)).toBe(true);
    req.method='PATCH'; await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
   } finally {spy.mockRestore();}
 });
});
