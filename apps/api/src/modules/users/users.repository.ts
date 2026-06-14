import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { User, Prisma } from '@prisma/client';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findBySuiAddress(suiAddress: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { suiAddress } });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async upsertBySuiAddress(suiAddress: string): Promise<User> {
    return this.prisma.user.upsert({
      where: { suiAddress },
      update: {},
      create: { 
        suiAddress,
        email: `${suiAddress}@sui-auth.local`, // Dummy email since it is required by schema
      },
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async delete(id: string): Promise<User> {
    return this.prisma.user.delete({ where: { id } });
  }
}
