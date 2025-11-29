import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Raffle } from './entities/raffle.entity';
import { CreateRaffleDto } from './dto/create-raffle.dto';
import { UpdateRaffleDto } from './dto/update-raffle.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@Injectable()
export class RafflesService {
  constructor(
    @InjectRepository(Raffle)
    private readonly repo: Repository<Raffle>,
  ) {}

  async create(dto: CreateRaffleDto): Promise<Raffle> {
    const newRaffle = this.repo.create(dto);
    return this.repo.save(newRaffle);
  }

  async findAll(query: PaginationQueryDto): Promise<{
    data: Raffle[];
    total: number;
    currentPage: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('r');

    // Búsqueda por nombre o descripción
    if (search) {
      qb.where(`(r.name ILIKE :search OR r.description ILIKE :search)`, {
        search: `%${search}%`,
      });
    }

    const [data, total] = await qb
      .skip(skip)
      .take(limit)
      .orderBy('r.createdAt', 'DESC')
      .getManyAndCount();

    return {
      data,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Raffle> {
    const raffle = await this.repo.findOne({
      where: { id },
    });

    if (!raffle) {
      throw new NotFoundException('Sorteo no encontrado');
    }

    return raffle;
  }

  async update(id: string, dto: UpdateRaffleDto): Promise<Raffle> {
    const raffle = await this.findOne(id);
    Object.assign(raffle, dto);
    return this.repo.save(raffle);
  }

  async remove(id: string): Promise<void> {
    const raffle = await this.findOne(id);
    await this.repo.remove(raffle);
  }

  async findByStatus(status: string = 'active'): Promise<Raffle[]> {
    return this.repo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findActive(): Promise<Raffle[]> {
    return this.repo.find({
      where: { status: 'active' },
      order: { createdAt: 'DESC' },
    });
  }

  async toggleStatus(id: string): Promise<Raffle> {
    const raffle = await this.findOne(id);

    // Lógica para cambiar estado basado en el estado actual
    if (raffle.status === 'pending') {
      raffle.status = 'active';
    } else if (raffle.status === 'active') {
      raffle.status = 'finished';
    } else {
      raffle.status = 'pending';
    }

    return this.repo.save(raffle);
  }

  // Métodos útiles para estadísticas
  async getStats() {
    const [total, active, pending, finished] = await Promise.all([
      this.repo.count(),
      this.repo.count({ where: { status: 'active' } }),
      this.repo.count({ where: { status: 'pending' } }),
      this.repo.count({ where: { status: 'finished' } }),
    ]);

    return {
      total,
      active,
      pending,
      finished,
      activePercentage: total > 0 ? Math.round((active / total) * 100) : 0,
    };
  }

  async getStatusCounts() {
    const result = await this.repo
      .createQueryBuilder('r')
      .select('r.status, COUNT(*) as count')
      .groupBy('r.status')
      .getRawMany();

    return result.reduce((acc, item) => {
      acc[item.status] = parseInt(item.count);
      return acc;
    }, {});
  }

  // Método para obtener sorteos que están actualmente activos (basado en fechas)
  async getCurrentlyActive(): Promise<Raffle[]> {
    const now = new Date();

    return this.repo
      .createQueryBuilder('r')
      .where('r.status = :status', { status: 'active' })
      .andWhere('r.startDate <= :now', { now })
      .andWhere('r.endDate >= :now', { now })
      .orderBy('r.endDate', 'ASC')
      .getMany();
  }

  // Método para actualizar estados automáticamente basado en fechas
  async updateExpiredRaffles(): Promise<number> {
    const now = new Date();

    const result = await this.repo
      .createQueryBuilder('r')
      .update()
      .set({ status: 'finished' })
      .where('r.status = :status', { status: 'active' })
      .andWhere('r.endDate < :now', { now })
      .execute();

    return result.affected || 0;
  }
}
