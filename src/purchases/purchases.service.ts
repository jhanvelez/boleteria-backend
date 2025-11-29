import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Purchase } from './entities/purchase.entity';
import { Point } from '../points/entities/point.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Establishment } from '../establishments/entities/establishment.entity';
import { Raffle } from '../raffles/entities/raffle.entity';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@Injectable()
export class PurchasesService {
  constructor(
    @InjectRepository(Purchase)
    private readonly purchaseRepo: Repository<Purchase>,
    @InjectRepository(Point)
    private readonly pointRepo: Repository<Point>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Establishment)
    private readonly establishmentRepo: Repository<Establishment>,
    @InjectRepository(Raffle)
    private readonly raffleRepo: Repository<Raffle>,
  ) {}

  // Generar número de factura único
  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const lastInvoice = await this.purchaseRepo.findOne({
      where: { invoiceNumber: Like(`${year}%`) },
      order: { createdAt: 'DESC' },
    });

    let sequence = 1;
    if (lastInvoice?.invoiceNumber) {
      const lastSequence = parseInt(lastInvoice.invoiceNumber.split('-')[1]);
      sequence = lastSequence + 1;
    }

    return `${year}-${sequence.toString().padStart(6, '0')}`;
  }

  // Calcular puntos basado en el monto
  private calculatePoints(amount: number): number {
    // 1 punto por cada $1,000 COP
    return Math.floor(amount / 1000);
  }

  async create(dto: CreatePurchaseDto): Promise<Purchase> {
    // Validar que existan las entidades relacionadas
    const [customer, establishment, raffle] = await Promise.all([
      this.customerRepo.findOne({ where: { id: dto.customerId } }),
      this.establishmentRepo.findOne({ where: { id: dto.establishmentId } }),
      this.raffleRepo.findOne({ where: { id: dto.raffleId } }),
    ]);

    if (!customer) throw new NotFoundException('Cliente no encontrado');
    if (!establishment)
      throw new NotFoundException('Establecimiento no encontrado');
    if (!raffle) throw new NotFoundException('Sorteo no encontrado');
    if (!establishment.isActive)
      throw new ConflictException('Establecimiento inactivo');
    if (raffle.status !== 'active')
      throw new ConflictException('Sorteo no activo');

    // Calcular puntos
    const points = this.calculatePoints(dto.amount);
    const invoiceNumber = await this.generateInvoiceNumber();

    // Crear la compra
    const purchase = this.purchaseRepo.create({
      customer,
      establishment,
      raffle,
      amount: dto.amount,
      points,
      description: dto.description,
      invoiceNumber,
      status: 'completed',
      purchaseDate: new Date(),
    });

    const savedPurchase = await this.purchaseRepo.save(purchase);

    const point = this.pointRepo.create({
      purchaseAmount: dto.amount,
      points: points,
      customer: customer,
    });

    await this.pointRepo.save(point);

    return savedPurchase;
  }

  async findAll(query: PaginationQueryDto): Promise<{
    data: Purchase[];
    total: number;
    currentPage: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      search,
      customerId,
      establishmentId,
      raffleId,
    } = query;
    const skip = (page - 1) * limit;

    const qb = this.purchaseRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.customer', 'customer')
      .leftJoinAndSelect('p.establishment', 'establishment')
      .leftJoinAndSelect('p.raffle', 'raffle');

    // Búsqueda
    if (search) {
      qb.where(
        `(p.invoiceNumber ILIKE :search OR 
          customer.name ILIKE :search OR 
          establishment.name ILIKE :search OR 
          p.description ILIKE :search)`,
        { search: `%${search}%` },
      );
    }

    // Filtros
    if (customerId) {
      qb.andWhere('p.customerId = :customerId', { customerId });
    }

    if (establishmentId) {
      qb.andWhere('p.establishmentId = :establishmentId', { establishmentId });
    }

    if (raffleId) {
      qb.andWhere('p.raffleId = :raffleId', { raffleId });
    }

    const [data, total] = await qb
      .skip(skip)
      .take(limit)
      .orderBy('p.createdAt', 'DESC')
      .getManyAndCount();

    return {
      data,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Purchase> {
    const purchase = await this.purchaseRepo.findOne({
      where: { id },
      relations: ['customer', 'establishment', 'raffle'],
    });

    if (!purchase) {
      throw new NotFoundException('Compra no encontrada');
    }

    return purchase;
  }

  async findByInvoiceNumber(invoiceNumber: string): Promise<Purchase> {
    const purchase = await this.purchaseRepo.findOne({
      where: { invoiceNumber },
      relations: ['customer', 'establishment', 'raffle'],
    });

    if (!purchase) {
      throw new NotFoundException('Factura no encontrada');
    }

    return purchase;
  }

  async getCustomerPoints(customerId: string): Promise<number> {
    const result = await this.pointRepo
      .createQueryBuilder('point')
      .select('SUM(point.points)', 'totalPoints')
      .where('point.customerId = :customerId', { customerId })
      .getRawOne();

    return parseInt(result.totalPoints) || 0;
  }

  async getPurchaseStats() {
    const [totalPurchases, totalAmount, totalPoints] = await Promise.all([
      this.purchaseRepo.count(),
      this.purchaseRepo
        .createQueryBuilder('p')
        .select('SUM(p.amount)', 'total')
        .getRawOne(),
      this.pointRepo
        .createQueryBuilder('point')
        .select('SUM(point.points)', 'total')
        .getRawOne(),
    ]);

    return {
      totalPurchases,
      totalAmount: parseFloat(totalAmount.total) || 0,
      totalPoints: parseInt(totalPoints.total) || 0,
      averagePurchase:
        totalPurchases > 0 ? parseFloat(totalAmount.total) / totalPurchases : 0,
    };
  }
}
