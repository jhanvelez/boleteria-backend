import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Premise } from './entities/premise.entity';
import { CreatePremiseDto } from './dto/create-premise.dto';
import { UpdatePremiseDto } from './dto/update-premise.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@Injectable()
export class PremiseService {
  constructor(
    @InjectRepository(Premise)
    private premisesRepository: Repository<Premise>,
  ) {}

  async create(createPremiseDto: CreatePremiseDto): Promise<Premise> {
    const premise = this.premisesRepository.create(createPremiseDto);
    return await this.premisesRepository.save(premise);
  }

  async findAll(query: PaginationQueryDto): Promise<{
    data: Premise[];
    total: number;
    currentPage: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const qb = this.premisesRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.establishments', 'establishments');

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
      .orderBy('p.numero_local', 'ASC')
      .getManyAndCount();

    return {
      data,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<Premise> {
    const premise = await this.premisesRepository.findOne({
      where: { id },
      relations: ['establishments'],
    });
    if (!premise) {
      throw new NotFoundException(`Premise with ID ${id} not found`);
    }
    return premise;
  }

  async update(
    id: number,
    updatePremiseDto: UpdatePremiseDto,
  ): Promise<Premise> {
    const premise = await this.findOne(id);
    Object.assign(premise, updatePremiseDto);
    premise.updated_at = new Date();
    return await this.premisesRepository.save(premise);
  }

  async remove(id: number): Promise<void> {
    const premise = await this.findOne(id);
    await this.premisesRepository.remove(premise);
  }

  async findByNumeroLocal(numeroLocal: string): Promise<Premise> {
    return await this.premisesRepository.findOne({
      where: { numero_local: numeroLocal },
      relations: ['establishments'],
    });
  }

  async findByEstado(estado: string): Promise<Premise[]> {
    return await this.premisesRepository.find({
      where: { estado_local: estado },
      relations: ['establishments'],
      order: { numero_local: 'ASC' },
    });
  }

  async findWithEstablishments(): Promise<Premise[]> {
    return await this.premisesRepository.find({
      relations: ['establishments'],
      order: { numero_local: 'ASC' },
    });
  }
}
