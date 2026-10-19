import 'reflect-metadata';
import {afterAll,beforeAll,describe,it,expect,vi} from 'vitest';
import {Controller,Get,Post,UseGuards,INestApplication} from '@nestjs/common';
import {Test} from '@nestjs/testing';
import {Reflector} from '@nestjs/core';
import jwt from 'jsonwebtoken';
import {JWT_CONFIG} from '@goldcontinent/shared/auth/jwt';
import {Permission} from '../../../common/decorators/permission.decorator';
import {JwtAuthGuard} from './jwt-auth.guard';
import {JwtStrategy} from './jwt.strategy';
@Controller('probe')
@UseGuards(JwtAuthGuard)
@Permission('productos')
class ProbeController {
 @Get() read(){return {ok:true};}
 @Post() write(){return {ok:true};}
}
let app:INestApplication,base:string;
const account={id_usuario:1,rol:'vendedor',email:'test@test.invalid',activo:true,deleted_at:null,session_version:0};
const db:any={usuario:{findUnique:vi.fn(async()=>account)},rol:{findUnique:vi.fn(async()=>({id_rol:1,activo:true}))},usuarioPermiso:{findMany:vi.fn(async()=>[{modulo:'productos',nivel:'lectura'}])},rolPermiso:{findMany:vi.fn(async()=>[])}};
beforeAll(async()=>{
 const module=await Test.createTestingModule({controllers:[ProbeController],providers:[{provide:JwtStrategy,useFactory:()=>new JwtStrategy(db)},{provide:JwtAuthGuard,inject:[Reflector],useFactory:(reflector:Reflector)=>new JwtAuthGuard(reflector)}]}).compile();
 app=module.createNestApplication();await app.listen(0,'127.0.0.1');base=await app.getUrl();
});
afterAll(async()=>{await app?.close();});
describe('autorización HTTP real',()=>{
 it('permite leer, deniega escribir y revoca inmediatamente una cuenta desactivada',async()=>{
  const token=jwt.sign({id_usuario:1,session_version:0},JWT_CONFIG.ACCESS_TOKEN_SECRET,{expiresIn:'1m'});
  const headers={Authorization:'Bearer '+token};
  expect((await fetch(base+'/probe',{headers})).status).toBe(200);
  expect((await fetch(base+'/probe',{headers,method:'POST'})).status).toBe(403);
  account.activo=false;
  expect((await fetch(base+'/probe',{headers})).status).toBe(401);
 });
});
