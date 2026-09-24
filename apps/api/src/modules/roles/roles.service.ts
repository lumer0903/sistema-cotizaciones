import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PermisoModulo, NivelPermiso } from '@goldcontinent/shared/constants/enums';
import {
  DEFAULT_ROLE_PERMISSIONS,
  esMatrizBloqueada,
  matrizSiempreEdicion,
  MapaPermisos,
} from '@goldcontinent/shared/auth/rbac';

const ROLE_SELECT = {
  id_rol: true,
  nombre: true,
  codigo: true,
  es_sistema: true,
  orden: true,
  activo: true,
  created_at: true,
} as const;

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const roles = await this.prisma.rol.findMany({
      select: {
        ...ROLE_SELECT,
        _count: { select: { permisos: true } },
      },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    });

    const usuariosPorRol = await this.prisma.usuario.groupBy({
      by: ['rol'],
      where: { deleted_at: null },
      _count: { _all: true },
    });
    const countMap = new Map(usuariosPorRol.map((u) => [u.rol, u._count._all]));

    return roles.map((r) => ({
      id_rol: r.id_rol,
      nombre: r.nombre,
      codigo: r.codigo,
      es_sistema: r.es_sistema,
      orden: r.orden,
      activo: r.activo,
      created_at: r.created_at,
      total_usuarios: countMap.get(r.codigo) ?? 0,
      total_permisos: r._count.permisos,
    }));
  }

  async findById(id: number) {
    const rol = await this.prisma.rol.findUnique({
      where: { id_rol: id },
      select: ROLE_SELECT,
    });
    if (!rol) throw new NotFoundException('Rol no encontrado');
    const total_usuarios = await this.prisma.usuario.count({
      where: { rol: rol.codigo, deleted_at: null },
    });
    return {
      ...rol,
      total_usuarios,
    };
  }

  async getPermisos(id: number): Promise<MapaPermisos> {
    const rol = await this.prisma.rol.findUnique({ where: { id_rol: id } });
    if (!rol) throw new NotFoundException('Rol no encontrado');

    if (esMatrizBloqueada(rol.codigo)) {
      return matrizSiempreEdicion();
    }

    const rows = await this.prisma.rolPermiso.findMany({ where: { id_rol: id } });
    const mapa = {} as MapaPermisos;
    const defaults = DEFAULT_ROLE_PERMISSIONS[rol.codigo as keyof typeof DEFAULT_ROLE_PERMISSIONS];

    for (const modulo of Object.values(PermisoModulo)) {
      const row = rows.find((r) => r.modulo === modulo);
      mapa[modulo] = (row?.nivel as NivelPermiso) ?? defaults?.[modulo] ?? 'sin_acceso';
    }
    return mapa;
  }

  async setPermisos(id: number, permisos: Partial<Record<PermisoModulo, NivelPermiso>>): Promise<MapaPermisos> {
    const rol = await this.prisma.rol.findUnique({ where: { id_rol: id } });
    if (!rol) throw new NotFoundException('Rol no encontrado');

    if (esMatrizBloqueada(rol.codigo)) {
      throw new BadRequestException('La matriz del rol Administrador está bloqueada y siempre es de edición');
    }

    const validos = new Set(Object.values(PermisoModulo));
    const nivelesValidos = new Set(Object.values(NivelPermiso));
    const limpio: Partial<Record<PermisoModulo, NivelPermiso>> = {};

    for (const modulo of validos) {
      const nivel = permisos[modulo];
      if (nivel && nivelesValidos.has(nivel)) {
        limpio[modulo] = nivel;
      }
    }

    if (Object.keys(limpio).length !== validos.size) {
      throw new BadRequestException('La matriz debe incluir los 12 módulos con un nivel válido');
    }

    await this.prisma.$transaction([
      this.prisma.rolPermiso.deleteMany({ where: { id_rol: id } }),
      this.prisma.rolPermiso.createMany({
        data: Object.entries(limpio).map(([modulo, nivel]) => ({
          id_rol: id,
          modulo: modulo as PermisoModulo,
          nivel: nivel as NivelPermiso,
        })),
      }),
    ]);

    return limpio as MapaPermisos;
  }

  async create(data: { nombre: string; codigo: string }) {
    const codigo = data.codigo.trim().toLowerCase();
    const nombre = data.nombre.trim();

    const existe = await this.prisma.rol.findFirst({
      where: { OR: [{ codigo }, { nombre }] },
    });
    if (existe) {
      throw new ConflictException('Ya existe un rol con ese nombre o código');
    }

    const maxOrden = await this.prisma.rol.aggregate({ _max: { orden: true } });
    const rol = await this.prisma.rol.create({
      data: {
        nombre,
        codigo,
        es_sistema: false,
        orden: (maxOrden._max.orden ?? 0) + 1,
      },
      select: ROLE_SELECT,
    });

    const base = DEFAULT_ROLE_PERMISSIONS.vendedor;
    await this.prisma.rolPermiso.createMany({
      data: Object.entries(base).map(([modulo, nivel]) => ({
        id_rol: rol.id_rol,
        modulo: modulo as PermisoModulo,
        nivel: nivel as NivelPermiso,
      })),
    });

    return rol;
  }

  async update(id: number, data: { nombre?: string; activo?: boolean; orden?: number }) {
    const rol = await this.prisma.rol.findUnique({ where: { id_rol: id } });
    if (!rol) throw new NotFoundException('Rol no encontrado');
    if (rol.es_sistema && data.activo === false) {
      const otros = await this.prisma.rol.count({
        where: { codigo: 'admin', activo: true },
      });
      if (rol.codigo === 'admin' && otros > 0) {
        throw new BadRequestException('No se puede desactivar el rol Administrador del sistema');
      }
    }

    if (data.nombre) {
      const nombre = data.nombre.trim();
      const duplicado = await this.prisma.rol.findFirst({
        where: { nombre, id_rol: { not: id } },
      });
      if (duplicado) throw new ConflictException('Ya existe un rol con ese nombre');
    }

    return this.prisma.rol.update({
      where: { id_rol: id },
      data: {
        ...(data.nombre !== undefined ? { nombre: data.nombre.trim() } : {}),
        ...(data.activo !== undefined ? { activo: data.activo } : {}),
        ...(data.orden !== undefined ? { orden: data.orden } : {}),
      },
      select: ROLE_SELECT,
    });
  }

  async remove(id: number): Promise<void> {
    const rol = await this.prisma.rol.findUnique({
      where: { id_rol: id },
      select: { id_rol: true, codigo: true, es_sistema: true },
    });
    if (!rol) throw new NotFoundException('Rol no encontrado');
    if (rol.es_sistema) {
      throw new BadRequestException('No se pueden eliminar roles del sistema');
    }
    const usuarios = await this.prisma.usuario.count({
      where: { rol: rol.codigo, deleted_at: null },
    });
    if (usuarios > 0) {
      throw new BadRequestException('No se puede eliminar un rol con usuarios asignados');
    }
    await this.prisma.rol.delete({ where: { id_rol: id } });
  }
}
