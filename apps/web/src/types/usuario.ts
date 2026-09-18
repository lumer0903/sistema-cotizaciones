export type RolUsuario = 'ADMIN' | 'VENDEDOR' | 'ALMACENERO';

export interface Usuario {
  id_usuario: number;
  nombre: string;
  email: string;
  rol: RolUsuario;
  activo: boolean;
  ultimo_acceso?: string;
}