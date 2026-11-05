export type RolUsuario = string;

export interface Usuario {
  id_usuario: number;
  nombre: string;
  email: string;
  rol: RolUsuario;
  avatar_url?: string | null;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}
