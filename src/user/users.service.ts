import {
  Injectable,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { PaginationQueryDto } from './dto/pagination-query.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(query: PaginationQueryDto): Promise<{
    data: User[];
    total: number;
    currentPage: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const qb = this.usersRepository.createQueryBuilder('user');

    if (search) {
      qb.where('user.name ILIKE :search OR user.email ILIKE :search', {
        search: `%${search}%`,
      });
    }

    const [data, total] = await qb
      .skip(skip)
      .take(limit)
      .orderBy('user.createdAt', 'DESC')
      .getManyAndCount();

    return {
      data,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(userData: Partial<User>): Promise<User> {
    if (!userData.password) {
      throw new BadRequestException('Password is required');
    }
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = this.usersRepository.create({
        ...userData,
        password: hashedPassword,
      });
      return await this.usersRepository.save(user);
    } catch (error) {
      // Error de duplicidad (Postgres)
      if (error.code === '23505') {
        throw new ConflictException('Email or documentId already exists');
      }
      throw new InternalServerErrorException('Unexpected error');
    }
  }

  findByEmail(email: string) {
    return this.usersRepository.findOne({ where: { email } });
  }

  findById(id: number) {
    return this.usersRepository.findOne({ where: { id } });
  }
}
