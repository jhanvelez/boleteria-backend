// src/establishments/establishments.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Establishment } from './entities/establishment.entity';
import { CreateEstablishmentDto } from './dto/create-establishment.dto';
import { UpdateEstablishmentDto } from './dto/update-establishment.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { Premise } from 'src/premise/entities/premise.entity';

@Injectable()
export class EstablishmentsService {
  constructor(
    @InjectRepository(Establishment)
    private readonly repo: Repository<Establishment>,
    @InjectRepository(Premise)
    private readonly premiseRepo: Repository<Premise>,
  ) {}

  async create(dto: CreateEstablishmentDto): Promise<Establishment> {
    const premise = await this.premiseRepo.findOne({
      where: { id: dto.premiseId },
    });

    if (!premise) {
      throw new NotFoundException(`Premise with ID ${dto.premiseId} not found`);
    }

    const existing = await this.repo.findOne({
      where: {
        nombreComercial: dto.nombreComercial,
        premiseId: dto.premiseId,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Ya existe un establecimiento con este nombre comercial en el mismo local',
      );
    }

    const newEstablishment = this.repo.create({
      ...dto,
      premise,
    });

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

    const qb = this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.premise', 'premise');

    if (search) {
      qb.where(
        `(p.numero_local ILIKE :search OR p.clase_local ILIKE :search OR p.destinacion ILIKE :search)`,
        {
          search: `%${search}%`,
        },
      );
    }

    const [data, total] = await qb
      .skip(skip)
      .take(limit)
      .orderBy('p.nombreComercial', 'ASC')
      .getManyAndCount();

    return {
      data,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Establishment> {
    const establishment = await this.repo.findOne({
      where: { id },
      relations: ['premise'],
    });

    if (!establishment) {
      throw new NotFoundException('Establecimiento no encontrado');
    }

    return establishment;
  }

  async findByPremise(premiseId: number): Promise<Establishment[]> {
    return this.repo.find({
      where: { premiseId },
      relations: ['premise'],
      order: { nombreComercial: 'ASC' },
    });
  }

  async findByStatus(activo: boolean): Promise<Establishment[]> {
    return this.repo.find({
      where: { activoInactivo: activo },
      relations: ['premise'],
      order: { nombreComercial: 'ASC' },
    });
  }

  async update(
    id: string,
    dto: UpdateEstablishmentDto,
  ): Promise<Establishment> {
    const establishment = await this.findOne(id);

    if (dto.premiseId && dto.premiseId !== establishment.premiseId) {
      const premise = await this.premiseRepo.findOne({
        where: { id: dto.premiseId },
      });

      if (!premise) {
        throw new NotFoundException(
          `Premise with ID ${dto.premiseId} not found`,
        );
      }

      establishment.premise = premise;
      establishment.premiseId = dto.premiseId;
    }

    if (
      dto.nombreComercial &&
      dto.nombreComercial !== establishment.nombreComercial
    ) {
      const existing = await this.repo.findOne({
        where: {
          nombreComercial: dto.nombreComercial,
          premiseId: dto.premiseId || establishment.premiseId,
        },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(
          'Ya existe un establecimiento con este nombre comercial en el mismo local',
        );
      }
    }

    Object.keys(dto).forEach((key) => {
      if (key !== 'premiseId' && dto[key] !== undefined) {
        establishment[key] = dto[key];
      }
    });

    return this.repo.save(establishment);
  }

  async remove(id: string): Promise<void> {
    const establishment = await this.findOne(id);
    await this.repo.remove(establishment);
  }

  async toggleStatus(id: string): Promise<Establishment> {
    const establishment = await this.findOne(id);
    establishment.activoInactivo = !establishment.activoInactivo;
    return this.repo.save(establishment);
  }

  async getStats() {
    const [total, active] = await Promise.all([
      this.repo.count(),
      this.repo.count({ where: { activoInactivo: true } }),
    ]);

    const categories = await this.repo
      .createQueryBuilder('e')
      .select('e.categoria, COUNT(*) as count')
      .where('e.categoria IS NOT NULL')
      .groupBy('e.categoria')
      .getRawMany();

    return {
      total,
      active,
      inactive: total - active,
      categories,
    };
  }

  async getCategories(): Promise<string[]> {
    const result = await this.repo
      .createQueryBuilder('e')
      .select('DISTINCT e.categoria', 'categoria')
      .where('e.categoria IS NOT NULL')
      .orderBy('categoria', 'ASC')
      .getRawMany();

    return result.map((item) => item.categoria);
  }

  async search(search: string): Promise<Establishment[]> {
    return this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.premise', 'premise')
      .where(
        `(e.nombreComercial ILIKE :search OR 
          e.categoria ILIKE :search OR 
          e.telefono1 ILIKE :search OR 
          e.telefono2 ILIKE :search OR
          e.telefono3 ILIKE :search OR
          premise.numero_local ILIKE :search)`,
        { search: `%${search}%` },
      )
      .orderBy('e.nombreComercial', 'ASC')
      .getMany();
  }
}
