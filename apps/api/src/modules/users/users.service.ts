import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository.js';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async findBySuiAddress(suiAddress: string): Promise<User | null> {
    return this.usersRepository.findBySuiAddress(suiAddress);
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.usersRepository.create(data);
  }

  async upsertBySuiAddress(suiAddress: string): Promise<User> {
    return this.usersRepository.upsertBySuiAddress(suiAddress);
  }

  async updateProfile(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.usersRepository.update(id, data);
  }

  async deleteUser(id: string): Promise<User> {
    return this.usersRepository.delete(id);
  }
}
