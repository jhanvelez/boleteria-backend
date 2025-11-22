import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Establishment } from './entities/establishment.entity';
import { CreateEstablishmentDto } from './dto/create-establishment.dto';
import { UpdateEstablishmentDto } from './dto/update-establishment.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@Injectable()
export class EstablishmentsService {
  constructor(
    @InjectRepository(Establishment)
    private readonly repo: Repository<Establishment>,
  ) {}

  async create(dto: CreateEstablishmentDto): Promise<Establishment> {
    const newEstablishment = this.repo.create(dto);
    return this.repo.save(newEstablishment);
  }

  async findAll(query: PaginationQueryDto): Promise<{
    data: Establishment[];
    total: number;
    currentPage: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('establishments');

    if (search) {
      qb.where(
        'establishments.serialNumber ILIKE :search OR meter.model ILIKE :search',
        {
          search: `%${search}%`,
        },
      );
    }

    const [data, total] = await qb
      .skip(skip)
      .take(limit)
      .orderBy('establishments.createdAt', 'DESC')
      .getManyAndCount();

    return {
      data,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Establishment> {
    const establishment = await this.repo.findOne({ where: { id } });
    if (!establishment) throw new NotFoundException('Establishment not found');
    return establishment;
  }

  async update(
    id: string,
    dto: UpdateEstablishmentDto,
  ): Promise<Establishment> {
    const establishment = await this.findOne(id);
    Object.assign(establishment, dto);
    return this.repo.save(establishment);
  }

  async remove(id: string): Promise<void> {
    const establishment = await this.findOne(id);
    await this.repo.remove(establishment);
  }
}
