import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Purchase } from './entities/purchase.entity';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { Customer } from 'src/customers/entities/customer.entity';
import { Establishment } from 'src/establishments/entities/establishment.entity';

@Injectable()
export class PurchasesService {
  constructor(
    @InjectRepository(Purchase)
    private readonly purchaseRepo: Repository<Purchase>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Establishment)
    private readonly establishmentRepo: Repository<Establishment>,
  ) {}

  private calculatePoints(amount: number): number {
    return Math.floor(amount / 1000); // 🎯 1 punto por cada $1000 COP
  }

  async create(dto: CreatePurchaseDto): Promise<Purchase> {
    const customer = await this.customerRepo.findOne({
      where: { id: dto.customerId },
    });
    const establishment = await this.establishmentRepo.findOne({
      where: { id: dto.establishmentId },
    });

    if (!customer) throw new NotFoundException('Customer not found');
    if (!establishment) throw new NotFoundException('Establishment not found');

    const points = this.calculatePoints(dto.amount);
    const purchase = this.purchaseRepo.create({
      amount: dto.amount,
      customer,
      establishment,
      points,
    });

    return this.purchaseRepo.save(purchase);
  }

  async findAll(): Promise<Purchase[]> {
    return this.purchaseRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findByCustomer(customerId: string): Promise<Purchase[]> {
    return this.purchaseRepo.find({
      where: { customer: { id: customerId } },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Purchase> {
    const purchase = await this.purchaseRepo.findOne({ where: { id } });
    if (!purchase) throw new NotFoundException('Purchase not found');
    return purchase;
  }

  async update(id: string, dto: UpdatePurchaseDto): Promise<Purchase> {
    const purchase = await this.findOne(id);
    Object.assign(purchase, dto);
    return this.purchaseRepo.save(purchase);
  }

  async remove(id: string): Promise<void> {
    const purchase = await this.findOne(id);
    await this.purchaseRepo.remove(purchase);
  }
}
