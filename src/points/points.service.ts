import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Point } from './entities/point.entity';
import { CreatePointDto } from './dto/create-point.dto';
import { UpdatePointDto } from './dto/update-point.dto';
import { Customer } from 'src/customers/entities/customer.entity';

@Injectable()
export class PointsService {
  constructor(
    @InjectRepository(Point)
    private readonly pointRepo: Repository<Point>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  private calculatePoints(amount: number): number {
    // Ejemplo: 1 punto por cada 1000 pesos gastados
    return Math.floor(amount / 1000);
  }

  async create(dto: CreatePointDto) {
    const customer = await this.customerRepo.findOne({
      where: { id: dto.customerId },
    });

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const points = this.calculatePoints(dto.purchaseAmount);

    const record = this.pointRepo.create({
      purchaseAmount: dto.purchaseAmount,
      points,
      customer,
    });

    return await this.pointRepo.save(record);
  }

  findAll() {
    return this.pointRepo.find({ relations: ['customer'] });
  }

  findOne(id: string) {
    return this.pointRepo.findOne({ where: { id }, relations: ['customer'] });
  }

  async update(id: string, dto: UpdatePointDto) {
    const point = await this.pointRepo.findOne({ where: { id } });
    if (!point) throw new NotFoundException('Registro no encontrado');

    Object.assign(point, dto);
    return this.pointRepo.save(point);
  }

  async remove(id: string) {
    const result = await this.pointRepo.delete(id);
    if (result.affected === 0)
      throw new NotFoundException('Registro no encontrado');
    return { deleted: true };
  }

  async getTotalPoints(customerId: string) {
    const total = await this.pointRepo
      .createQueryBuilder('point')
      .select('SUM(point.points)', 'totalPoints')
      .where('point.customerId = :customerId', { customerId })
      .getRawOne();

    return { customerId, totalPoints: Number(total.totalPoints) || 0 };
  }
}
