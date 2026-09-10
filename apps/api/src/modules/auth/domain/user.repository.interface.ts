import { User } from './user.entity';

export const IUserRepository = Symbol('IUserRepository');

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
}
