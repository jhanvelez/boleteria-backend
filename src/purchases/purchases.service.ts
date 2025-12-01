import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, DataSource } from 'typeorm';
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
   * Crea una nueva compra con sistema de boletas y puntos
   */
  async create(createPurchaseDto: CreatePurchaseDto): Promise<Purchase> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const [customer, establishment, raffle] = await Promise.all([
        this.customerRepository.findOne({
          where: { id: createPurchaseDto.customerId },
        }),
        this.establishmentRepository.findOne({
          where: { id: createPurchaseDto.establishmentId },
        }),
        this.raffleRepository.findOne({
          where: { id: createPurchaseDto.raffleId },
        }),
      ]);

      if (!customer) {
        throw new NotFoundException('Cliente no encontrado');
      }
      if (!establishment) {
        throw new NotFoundException('Establecimiento no encontrado');
      }
      if (!raffle) {
        throw new NotFoundException('Sorteo no encontrado');
      }
      if (!establishment.isActive) {
        throw new ConflictException('Establecimiento inactivo');
      }
      if (raffle.status !== 'active') {
        throw new ConflictException('Sorteo no activo');
      }

      // VALIDACIÓN 1: Verificar que el número de factura no exista en el establecimiento
      const existingInvoice = await this.purchaseRepository.findOne({
        where: {
          establishment: { id: establishment.id },
          establishmentInvoiceNumber:
            createPurchaseDto.establishmentInvoiceNumber,
        },
      });

      if (existingInvoice) {
        throw new ConflictException(
          `El número de factura ${createPurchaseDto.establishmentInvoiceNumber} ya existe para el establecimiento ${establishment.nombreComercial}`,
        );
      }

      const currentBalance = customer.currentBalance || 0;
      const { tickets, remainingBalance } = this.calculateTicketsAndBalance(
        createPurchaseDto.amount,
        currentBalance,
      );

      const points = this.calculatePoints(createPurchaseDto.amount);
      const invoiceNumber = await this.generateInvoiceNumber();

      // 1. Registrar o actualizar el contador de facturas del establecimiento
      let counter = await this.invoiceCounterRepository.findOne({
        where: { establishmentId: establishment.id },
      });

      if (!counter) {
        counter = this.invoiceCounterRepository.create({
          establishment,
          establishmentId: establishment.id,
          lastInvoiceNumber: 0,
          prefix: 'FACT',
        });
        counter = await this.invoiceCounterRepository.save(counter);
      }

      const providedNumber = parseInt(
        createPurchaseDto.establishmentInvoiceNumber.replace(/\D/g, ''),
        10,
      );

      const purchase = this.purchaseRepository.create({
        customer,
        establishment,
        raffle,
        amount: createPurchaseDto.amount,
        points,
        description: createPurchaseDto.description,
        invoiceNumber,
        establishmentInvoiceNumber:
          createPurchaseDto.establishmentInvoiceNumber,
        status: 'completed',
        purchaseDate: new Date(),
        ticketsGenerated: tickets,
        previousBalance: currentBalance,
        newBalance: remainingBalance,
      });

      const savedPurchase = await queryRunner.manager.save(purchase);

      if (
        !isNaN(providedNumber) &&
        providedNumber > counter.lastInvoiceNumber
      ) {
        counter.lastInvoiceNumber = providedNumber;
        await queryRunner.manager.save(counter);
      }

      // Crear registro de puntos
      const point = this.pointRepository.create({
        purchaseAmount: createPurchaseDto.amount,
        points,
        customer,
        purchase: savedPurchase,
      });

      await queryRunner.manager.save(point);

      // =============================================
      // =========== FIX SECUENCIA DE TICKETS =========
      // =============================================

      if (tickets > 0) {
        // Obtener último ticket **ordenado por el número real**
        const lastTicket = await this.ticketRepository
          .createQueryBuilder('ticket')
          .where('ticket.raffleId = :raffleId', { raffleId: raffle.id })
          .orderBy(
            `CAST(SPLIT_PART(ticket.ticketNumber, '-', 2) AS INTEGER)`,
            'DESC',
          )
          .getOne();

        let nextTicketNumber = 12720;

        if (lastTicket?.ticketNumber) {
          const parts = lastTicket.ticketNumber.split('-');
          if (parts.length > 1) {
            const lastNum = parseInt(parts[1], 10);
            if (!isNaN(lastNum) && lastNum >= 12720) {
              nextTicketNumber = lastNum + 1;
            }
          }
        }

        const ticketPromises = [];

        for (let i = 0; i < tickets; i++) {
          const ticketNumber = `${raffle.ticketPrefix || 'BOL'}-${(
            nextTicketNumber + i
          )
            .toString()
            .padStart(6, '0')}`;

          const ticket = this.ticketRepository.create({
            ticketNumber,
            customer,
            raffle,
            purchase: savedPurchase,
            amountUsed: this.PRICE_PER_TICKET,
            status: 'active',
          });

          ticketPromises.push(queryRunner.manager.save(ticket));
        }

        await Promise.all(ticketPromises);
      }

      await queryRunner.manager.update(Customer, customer.id, {
        currentBalance: remainingBalance,
        updatedAt: new Date(),
      });

      await queryRunner.commitTransaction();
      return savedPurchase;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.log(error);
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error creando la compra');
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
