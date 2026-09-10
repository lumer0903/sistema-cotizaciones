export class User {
  id_usuario!: number;
  email!: string;
  password_hash!: string;
  rol!: string;
  nombre!: string;
  activo?: boolean;
}
