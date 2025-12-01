import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Purchase } from './entities/purchase.entity';
import { Point } from '../points/entities/point.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Establishment } from '../establishments/entities/establishment.entity';
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
   * Genera un número de boleta único
   */
  private async generateTicketNumber(raffleId: string): Promise<string> {
    try {
      const raffle = await this.raffleRepository.findOne({
        where: { id: raffleId },
      });
      const prefix = raffle?.ticketPrefix || 'TK';

      const lastTicket = await this.ticketRepository.findOne({
        where: { raffleId },
        order: { createdAt: 'DESC' },
      });

      let sequence = 1;
      if (lastTicket?.ticketNumber) {
        const ticketParts = lastTicket.ticketNumber.split('-');
        const lastSequence =
          ticketParts.length > 1 ? parseInt(ticketParts[1], 10) : 0;
        sequence = isNaN(lastSequence) ? 1 : lastSequence + 1;
      }

      return `${prefix}-${sequence.toString().padStart(6, '0')}`;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        'Error generando número de boleta',
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

      const currentBalance = customer.currentBalance || 0;
      const { tickets, remainingBalance } = this.calculateTicketsAndBalance(
        createPurchaseDto.amount,
        currentBalance,
      );

      const points = this.calculatePoints(createPurchaseDto.amount);
      const invoiceNumber = await this.generateInvoiceNumber();

      // Crear la compra
      const purchase = this.purchaseRepository.create({
        customer,
        establishment,
        raffle,
        amount: createPurchaseDto.amount,
        points,
        description: createPurchaseDto.description,
        invoiceNumber,
        status: 'completed',
        purchaseDate: new Date(),
        ticketsGenerated: tickets,
        previousBalance: currentBalance,
        newBalance: remainingBalance,
      });

      const savedPurchase = await this.purchaseRepository.save(purchase);

      // Crear registro de puntos
      const point = this.pointRepository.create({
        purchaseAmount: createPurchaseDto.amount,
        points,
        customer,
        purchase: savedPurchase,
      });

      await this.pointRepository.save(point);

      // Crear boletas si las hay
      if (tickets > 0) {
        const ticketPromises = [];
        for (let i = 0; i < tickets; i++) {
          const ticketNumber = await this.generateTicketNumber(raffle.id);
          const ticket = this.ticketRepository.create({
            ticketNumber,
            customer,
            raffle,
            purchase: savedPurchase,
            amountUsed: this.PRICE_PER_TICKET,
            status: 'active',
          });
          ticketPromises.push(this.ticketRepository.save(ticket));
        }
        await Promise.all(ticketPromises);
      }

      // Actualizar saldo del cliente
      await this.customerRepository.update(customer.id, {
        currentBalance: remainingBalance,
        updatedAt: new Date(),
      });

      return savedPurchase;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error creando la compra');
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
