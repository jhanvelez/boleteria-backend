import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Raffle } from './entities/raffle.entity';
import { CreateRaffleDto } from './dto/create-raffle.dto';
import { UpdateRaffleDto } from './dto/update-raffle.dto';

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

  async findAll(): Promise<Raffle[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Raffle> {
    const raffle = await this.repo.findOne({ where: { id } });
    if (!raffle) throw new NotFoundException('Raffle not found');
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
}
