import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  async findAll(): Promise<Ticket[]> {
    return this.ticketRepository.find({
      relations: ['customer', 'raffle', 'purchase'],
    });
  }

  async findOne(id: string): Promise<Ticket> {
    return this.ticketRepository.findOne({
      where: { id },
      relations: ['customer', 'raffle', 'purchase'],
    });
  }

  async findByCustomer(customerId: string): Promise<Ticket[]> {
    return this.ticketRepository.find({
      where: { customerId },
      relations: ['raffle', 'purchase'],
      order: { createdAt: 'DESC' },
    });
  }
}
