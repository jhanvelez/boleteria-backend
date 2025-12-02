import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, DataSource, In } from 'typeorm';
import { Purchase } from './entities/purchase.entity';
import { Point } from '../points/entities/point.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Establishment } from '../establishments/entities/establishment.entity';
import { EstablishmentInvoiceCounter } from '../establishments/entities/establishment-invoice-counter.entity';
import { Raffle } from '../raffles/entities/raffle.entity';
import { Ticket } from 'src/tickets/entities/ticket.entity';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@Injectable()
export class PurchasesService {
  private readonly PRICE_PER_TICKET = 250000;

  constructor(
    @InjectRepository(Purchase)
    private readonly purchaseRepository: Repository<Purchase>,
    @InjectRepository(Point)
    private readonly pointRepository: Repository<Point>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Establishment)
    private readonly establishmentRepository: Repository<Establishment>,
    @InjectRepository(Raffle)
    private readonly raffleRepository: Repository<Raffle>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(EstablishmentInvoiceCounter)
    private readonly invoiceCounterRepository: Repository<EstablishmentInvoiceCounter>,
    private dataSource: DataSource,
  ) {}

  /**
   * Genera números de factura consecutivos de manera masiva
   */
  private async generateInvoiceNumbers(count: number): Promise<string[]> {
    try {
      const year = new Date().getFullYear();
      const lastInvoice = await this.purchaseRepository.findOne({
        where: { invoiceNumber: Like(`${year}%`) },
        order: { createdAt: 'DESC' },
      });

      let sequence = 1;
      if (lastInvoice?.invoiceNumber) {
        const lastSequence = parseInt(
          lastInvoice.invoiceNumber.split('-')[1],
          10,
        );
        sequence = isNaN(lastSequence) ? 1 : lastSequence + 1;
      }

      return Array.from(
        { length: count },
        (_, i) => `${year}-${(sequence + i).toString().padStart(6, '0')}`,
      );
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        'Error generando números de factura',
      );
    }
  }

  /**
   * Valida y procesa compras masivas optimizado
   */
  async create(dto: CreatePurchaseDto | CreatePurchaseDto[]) {
    const purchasesData = Array.isArray(dto) ? dto : [dto];

    if (purchasesData.length === 0) {
      throw new BadRequestException('No se recibieron compras para procesar');
    }

    const customerIds = [...new Set(purchasesData.map((p) => p.customerId))];
    const establishmentIds = [
      ...new Set(purchasesData.map((p) => p.establishmentId)),
    ];
    const raffleIds = [...new Set(purchasesData.map((p) => p.raffleId))];

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const [customers, establishments, raffles] = await Promise.all([
        this.customerRepository.find({
          where: { id: In(customerIds) },
          select: ['id', 'currentBalance'],
        }),
        this.establishmentRepository.find({
          where: { id: In(establishmentIds) },
          select: ['id'],
        }),
        this.raffleRepository.find({
          where: { id: In(raffleIds) },
          select: ['id', 'ticketPrefix'],
        }),
      ]);

      const customersMap = new Map(customers.map((c) => [c.id, c]));
      const establishmentsMap = new Map(establishments.map((e) => [e.id, e]));
      const rafflesMap = new Map(raffles.map((r) => [r.id, r]));

      const missing: string[] = [];
      purchasesData.forEach((p, i) => {
        if (!customersMap.has(p.customerId))
          missing.push(`Cliente en compra #${i + 1}`);
        if (!establishmentsMap.has(p.establishmentId))
          missing.push(`Establecimiento en compra #${i + 1}`);
        if (!rafflesMap.has(p.raffleId))
          missing.push(`Sorteo en compra #${i + 1}`);
      });

      if (missing.length > 0) {
        throw new NotFoundException(
          'Entidades faltantes: ' + missing.join(', '),
        );
      }

      const existing = await this.purchaseRepository
        .createQueryBuilder('p')
        .select(['p.establishmentInvoiceNumber', 'p.establishmentId'])
        .where('p.establishmentId IN (:...eids)', { eids: establishmentIds })
        .andWhere('p.establishmentInvoiceNumber IN (:...nums)', {
          nums: purchasesData.map((p) => p.establishmentInvoiceNumber),
        })
        .getMany();

      if (existing.length > 0) {
        throw new ConflictException(
          `Factura duplicada: ${existing[0].establishmentInvoiceNumber}`,
        );
      }

      // Consecutivos internos
      const invoiceNumbers = await this.generateInvoiceNumbers(
        purchasesData.length,
      );

      // Último ticket
      const lastTicket = await this.ticketRepository
        .createQueryBuilder('t')
        .orderBy(`CAST(SPLIT_PART(t.ticketNumber, '-', 2) AS INTEGER)`, 'DESC')
        .getOne();

      let nextTicket = lastTicket
        ? parseInt(lastTicket.ticketNumber.split('-')[1])
        : 12720;

      const purchasesToInsert = [];
      const pointsToInsert = [];
      const ticketsToInsert = [];
      const customersToUpdate = [];

      purchasesData.forEach((p, idx) => {
        const customer = customersMap.get(p.customerId);
        const raffle = rafflesMap.get(p.raffleId);

        const prevBalance = customer.currentBalance || 0;
        const total = prevBalance + p.amount;

        const tickets = Math.floor(total / this.PRICE_PER_TICKET);
        const newBalance = total % this.PRICE_PER_TICKET;
        const points = Math.floor(p.amount / 1000);

        purchasesToInsert.push({
          customerId: customer.id,
          establishmentId: p.establishmentId,
          raffleId: raffle.id,
          amount: p.amount,
          points,
          invoiceNumber: invoiceNumbers[idx],
          establishmentInvoiceNumber: p.establishmentInvoiceNumber,
          ticketsGenerated: tickets,
          previousBalance: prevBalance,
          newBalance,
          purchaseDate: new Date(),
          status: 'completed',
        });

        pointsToInsert.push({
          customerId: customer.id,
          purchaseAmount: p.amount,
          points,
          createdAt: new Date(),
        });

        for (let j = 0; j < tickets; j++) {
          nextTicket++;
          ticketsToInsert.push({
            customerId: customer.id,
            raffleId: raffle.id,
            ticketNumber: `${raffle.ticketPrefix || 'BOL'}-${String(nextTicket).padStart(6, '0')}`,
            amountUsed: this.PRICE_PER_TICKET,
            status: 'active',
            createdAt: new Date(),
          });
        }

        customer.currentBalance = newBalance;
        customersToUpdate.push(customer);
      });

      const insertedPurchases = await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(Purchase)
        .values(purchasesToInsert)
        .returning(['id', 'invoiceNumber'])
        .execute();

      const customerId = purchasesData[0].customerId;

      const customer = await this.customerRepository.findOne({
        where: { id: customerId },
      });

      if (!customer) {
        throw new Error(`No se encontró el cliente con id: ${customerId}`);
      }

      customer.currentBalance = purchasesData[0].remainingBalance;

      await this.customerRepository.save(customer);

      const map = new Map(
        insertedPurchases.raw.map((r) => [r.invoiceNumber, r.id]),
      );

      pointsToInsert.forEach((pt, i) => {
        pt.purchaseId = map.get(invoiceNumbers[i]);
      });

      if (pointsToInsert.length > 0) {
        await queryRunner.manager.insert(Point, pointsToInsert);
      }

      let ticketIndex = 0;
      purchasesData.forEach((_, i) => {
        const pid = map.get(invoiceNumbers[i]);
        const ticketsCount = purchasesToInsert[i].ticketsGenerated || 0;
        for (let j = 0; j < ticketsCount; j++) {
          ticketsToInsert[ticketIndex].purchaseId = pid;
          ticketIndex++;
        }
      });

      if (ticketsToInsert.length > 0) {
        await queryRunner.manager.insert(Ticket, ticketsToInsert);
      }

      await queryRunner.manager.save(Customer, customersToUpdate);

      await queryRunner.commitTransaction();

      // Respuesta final
      if (Array.isArray(dto)) {
        return {
          message: 'Compras procesadas exitosamente',
          count: purchasesData.length,
        };
      }

      return {
        id: insertedPurchases.raw[0].id,
        invoiceNumber: insertedPurchases.raw[0].invoiceNumber,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Obtiene todas las compras con paginación y filtros
   */
  async findAll(paginationQueryDto: PaginationQueryDto): Promise<{
    data: Purchase[];
    total: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        customerId,
        establishmentId,
        raffleId,
      } = paginationQueryDto;

      const skip = (page - 1) * limit;

      const queryBuilder = this.purchaseRepository
        .createQueryBuilder('purchase')
        .leftJoinAndSelect('purchase.customer', 'customer')
        .leftJoinAndSelect('purchase.establishment', 'establishment')
        .leftJoinAndSelect('purchase.raffle', 'raffle')
        .orderBy('purchase.createdAt', 'DESC');

      // Aplicar búsqueda
      if (search) {
        queryBuilder.where(
          `(purchase.invoiceNumber ILIKE :search OR 
            customer.name ILIKE :search OR 
            establishment.nombreComercial ILIKE :search OR 
            purchase.description ILIKE :search)`,
          { search: `%${search}%` },
        );
      }

      // Aplicar filtros
      if (customerId) {
        queryBuilder.andWhere('purchase.customerId = :customerId', {
          customerId,
        });
      }

      if (establishmentId) {
        queryBuilder.andWhere('purchase.establishmentId = :establishmentId', {
          establishmentId,
        });
      }

      if (raffleId) {
        queryBuilder.andWhere('purchase.raffleId = :raffleId', { raffleId });
      }

      const [data, total] = await queryBuilder
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      return {
        data,
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Error obteniendo las compras');
    }
  }

  /**
   * Obtiene una compra por ID
   */
  async findOne(id: string): Promise<Purchase> {
    try {
      const purchase = await this.purchaseRepository.findOne({
        where: { id },
        relations: ['customer', 'establishment', 'raffle', 'tickets'],
      });

      if (!purchase) {
        throw new NotFoundException('Compra no encontrada');
      }

      return purchase;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error obteniendo la compra');
    }
  }

  /**
   * Obtiene una compra por número de factura
   */
  async findByInvoiceNumber(invoiceNumber: string): Promise<Purchase> {
    try {
      const purchase = await this.purchaseRepository.findOne({
        where: { invoiceNumber },
        relations: ['customer', 'establishment', 'raffle', 'tickets'],
      });

      if (!purchase) {
        throw new NotFoundException('Factura no encontrada');
      }

      return purchase;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error obteniendo la factura');
    }
  }

  /**
   * Obtiene estadísticas de compras procesadas
   */
  async getProcessedStats(): Promise<{
    totalProcessed: number;
    totalAmount: number;
    totalTickets: number;
    totalPoints: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const result = await this.purchaseRepository
        .createQueryBuilder('purchase')
        .select('COUNT(purchase.id)', 'totalProcessed')
        .addSelect('SUM(purchase.amount)', 'totalAmount')
        .addSelect('SUM(purchase.ticketsGenerated)', 'totalTickets')
        .addSelect('SUM(purchase.points)', 'totalPoints')
        .where('purchase.createdAt >= :today', { today })
        .getRawOne();

      return {
        totalProcessed: parseInt(result.totalProcessed, 10) || 0,
        totalAmount: parseFloat(result.totalAmount) || 0,
        totalTickets: parseInt(result.totalTickets, 10) || 0,
        totalPoints: parseInt(result.totalPoints, 10) || 0,
      };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        'Error obteniendo estadísticas de procesamiento',
      );
    }
  }

  /**
   * Obtiene los puntos totales de un cliente
   */
  async getCustomerPoints(customerId: string): Promise<number> {
    try {
      const result = await this.pointRepository
        .createQueryBuilder('point')
        .select('SUM(point.points)', 'totalPoints')
        .where('point.customerId = :customerId', { customerId })
        .getRawOne();

      return parseInt(result.totalPoints, 10) || 0;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        'Error obteniendo puntos del cliente',
      );
    }
  }

  /**
   * Obtiene estadísticas generales de compras
   */
  async getPurchaseStats(): Promise<{
    totalPurchases: number;
    totalAmount: number;
    totalPoints: number;
    averagePurchase: number;
  }> {
    try {
      const [totalPurchases, totalAmount, totalPoints] = await Promise.all([
        this.purchaseRepository.count(),
        this.purchaseRepository
          .createQueryBuilder('purchase')
          .select('SUM(purchase.amount)', 'total')
          .getRawOne(),
        this.pointRepository
          .createQueryBuilder('point')
          .select('SUM(point.points)', 'total')
          .getRawOne(),
      ]);

      return {
        totalPurchases,
        totalAmount: parseFloat(totalAmount.total) || 0,
        totalPoints: parseInt(totalPoints.total, 10) || 0,
        averagePurchase:
          totalPurchases > 0
            ? parseFloat(totalAmount.total) / totalPurchases
            : 0,
      };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Error obteniendo estadísticas');
    }
  }

  /**
   * Obtiene las boletas de un cliente
   */
  async getCustomerTickets(
    customerId: string,
    raffleId?: string,
  ): Promise<Ticket[]> {
    try {
      const where: any = {
        customerId,
        status: 'active',
      };

      if (raffleId) {
        where.raffleId = raffleId;
      }

      return await this.ticketRepository.find({
        where,
        relations: ['raffle', 'purchase'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        'Error obteniendo boletas del cliente',
      );
    }
  }

  /**
   * Obtiene estadísticas de boletas por sorteo
   */
  async getTicketStats(raffleId: string): Promise<{
    totalTickets: number;
    assignedTickets: number;
    availableTickets: number;
  }> {
    try {
      const [totalTickets, assignedTickets] = await Promise.all([
        this.ticketRepository.count({ where: { raffleId } }),
        this.ticketRepository.count({
          where: { raffleId, status: 'active' },
        }),
      ]);

      return {
        totalTickets,
        assignedTickets,
        availableTickets: totalTickets - assignedTickets,
      };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        'Error obteniendo estadísticas de boletas',
      );
    }
  }

  /**
   * Obtiene el historial de compras de un cliente
   */
  async getCustomerPurchaseHistory(
    customerId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: Purchase[];
    total: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      const [data, total] = await this.purchaseRepository
        .createQueryBuilder('purchase')
        .leftJoinAndSelect('purchase.establishment', 'establishment')
        .leftJoinAndSelect('purchase.raffle', 'raffle')
        .where('purchase.customerId = :customerId', { customerId })
        .orderBy('purchase.createdAt', 'DESC')
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      return {
        data,
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        'Error obteniendo historial de compras',
      );
    }
  }
}
