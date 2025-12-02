import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
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
   * Genera un número de factura único
   */
  private async generateInvoiceNumber(): Promise<string> {
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

      return `${year}-${sequence.toString().padStart(6, '0')}`;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        'Error generando número de factura',
      );
    }
  }

  /**
   * Calcula puntos basado en el monto (1 punto por cada $1,000 COP)
   */
  private calculatePoints(amount: number): number {
    return Math.floor(amount / 1000);
  }

  /**
   * Calcula boletas y saldo basado en el monto y saldo anterior
   */
  private calculateTicketsAndBalance(
    amount: number,
    currentBalance: number = 0,
  ): {
    tickets: number;
    remainingBalance: number;
    totalAmount: number;
  } {
    const totalAmount = amount + currentBalance;
    const tickets = Math.floor(totalAmount / this.PRICE_PER_TICKET);
    const remainingBalance = totalAmount % this.PRICE_PER_TICKET;

    return { tickets, remainingBalance, totalAmount };
  }

  /**
   * Crea una o múltiples compras con sistema de boletas y puntos
   */
  async create(dto: CreatePurchaseDto | CreatePurchaseDto[]) {
    const isArray = Array.isArray(dto);
    const purchasesData = isArray ? dto : [dto];

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      /** ============================================================
       * 1. Cargar clientes – establecimientos – sorteos EN BLOQUE
       * ============================================================ */
      const customerIds = [...new Set(purchasesData.map(p => p.customerId))];
      const establishmentIds = [...new Set(purchasesData.map(p => p.establishmentId))];
      const raffleIds = [...new Set(purchasesData.map(p => p.raffleId))];

      const [customers, establishments, raffles] = await Promise.all([
        this.customerRepository.findBy({ id: In(customerIds) }),
        this.establishmentRepository.findBy({ id: In(establishmentIds) }),
        this.raffleRepository.findBy({ id: In(raffleIds) }),
      ]);

      const customersMap = new Map(customers.map(c => [c.id, c]));
      const establishmentsMap = new Map(establishments.map(e => [e.id, e]));
      const rafflesMap = new Map(raffles.map(r => [r.id, r]));

      /** ============================================================
       * 2. Validar facturas duplicadas EN BLOQUE
       * ============================================================ */
      const invoicePairs = purchasesData.map(p => ({
        establishmentId: p.establishmentId,
        establishmentInvoiceNumber: p.establishmentInvoiceNumber,
      }));

      const existing = await this.purchaseRepository.find({
        where: {
          establishmentInvoiceNumber: In(invoicePairs.map(i => i.establishmentInvoiceNumber)),
          establishment: { id: In(establishmentIds) },
        },
        relations: ['establishment'],
      });

      if (existing.length > 0) {
        throw new ConflictException(
          `Factura duplicada: ${existing[0].establishmentInvoiceNumber} en ${existing[0].establishment.nombreComercial}`
        );
      }

      /** ============================================================
       * 3. Generar números de factura usando SECUENCIA SQL
       * ============================================================ */
      const invoiceNumbers = [];
      for (let i = 0; i < purchasesData.length; i++) {
        const seq = await queryRunner.manager.query(`SELECT nextval('invoice_seq')`);
        const num = String(seq[0].nextval).padStart(6, '0');
        invoiceNumbers.push(`${new Date().getFullYear()}-${num}`);
      }

      /** ============================================================
       * 4. Preparar inserts masivos
       * ============================================================ */
      const purchasesToInsert = [];
      const pointsToInsert = [];
      const ticketsToInsert = [];

      // precargar último ticket
      const lastTicket = await this.ticketRepository
        .createQueryBuilder('t')
        .orderBy(`CAST(SPLIT_PART(t.ticketNumber, '-', 2) AS INTEGER)`, 'DESC')
        .getOne();

      let nextTicketNumber = lastTicket
        ? parseInt(lastTicket.ticketNumber.split('-')[1], 10)
        : 12720;

      for (let i = 0; i < purchasesData.length; i++) {
        const p = purchasesData[i];

        const customer = customersMap.get(p.customerId);
        const establishment = establishmentsMap.get(p.establishmentId);
        const raffle = rafflesMap.get(p.raffleId);

        if (!customer || !establishment || !raffle) {
          throw new NotFoundException('Entidad relacionada no encontrada');
        }

        const prevBalance = customer.currentBalance || 0;
        const total = p.amount + prevBalance;

        const tickets = Math.floor(total / this.PRICE_PER_TICKET);
        const newBalance = total % this.PRICE_PER_TICKET;
        const points = Math.floor(p.amount / 1000);

        // crear purchase para insert masivo
        purchasesToInsert.push({
          customerId: customer.id,
          establishmentId: establishment.id,
          raffleId: raffle.id,
          amount: p.amount,
          points,
          invoiceNumber: invoiceNumbers[i],
          establishmentInvoiceNumber: p.establishmentInvoiceNumber,
          ticketsGenerated: tickets,
          previousBalance: prevBalance,
          newBalance,
          purchaseDate: new Date(),
          status: 'completed',
        });

        // registrar puntos
        pointsToInsert.push({
          customerId: customer.id,
          purchaseId: undefined,
          points,
          purchaseAmount: p.amount,
        });

        // preparar tickets masivos
        if (tickets > 0) {
          for (let j = 0; j < tickets; j++) {
            nextTicketNumber++;

            ticketsToInsert.push({
              customerId: customer.id,
              raffleId: raffle.id,
              ticketNumber: `${raffle.ticketPrefix || 'BOL'}-${String(nextTicketNumber).padStart(6, '0')}`,
              amountUsed: this.PRICE_PER_TICKET,
              status: 'active',
            });
          }
        }

        // actualizar balance en memoria
        customer.currentBalance = newBalance;
      }

      /** ============================================================
       * 5. INSERT masivo (1 query por tabla)
       * ============================================================ */
      const purchasedInsertResult = await queryRunner.manager.insert(Purchase, purchasesToInsert);

      // mapear IDs retornados a los puntos
      purchasedInsertResult.identifiers.forEach((row, idx) => {
        pointsToInsert[idx].purchaseId = row.id;
      });

      await queryRunner.manager.insert(Point, pointsToInsert);

      if (ticketsToInsert.length > 0) {
        await queryRunner.manager.insert(Ticket, ticketsToInsert);
      }

      // guardar balances
      await queryRunner.manager.save(Customer, Array.from(customersMap.values()));

      await queryRunner.commitTransaction();

      return isArray ? purchasesToInsert : purchasesToInsert[0];
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
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
