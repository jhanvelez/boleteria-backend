import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { PurchaseReportDto } from './dto/purchase-report.dto';
import { InvoiceReportDto } from './dto/invoice-report.dto';

@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  async create(@Body() createPurchaseDto: CreatePurchaseDto) {
    const purchase = await this.purchasesService.create(createPurchaseDto);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Compra registrada exitosamente',
      data: purchase,
    };
  }

  @Get()
  async findAll(@Query() paginationQueryDto: PaginationQueryDto) {
    return await this.purchasesService.findAll(paginationQueryDto);
  }

  @Get('stats')
  async getStats() {
    const stats = await this.purchasesService.getPurchaseStats();
    return {
      statusCode: HttpStatus.OK,
      message: 'Estadísticas obtenidas exitosamente',
      data: stats,
    };
  }

  @Get('invoice/:invoiceNumber')
  async findByInvoiceNumber(@Param('invoiceNumber') invoiceNumber: string) {
    const purchase =
      await this.purchasesService.findByInvoiceNumber(invoiceNumber);
    return {
      statusCode: HttpStatus.OK,
      message: 'Factura obtenida exitosamente',
      data: purchase,
    };
  }

  @Get('customer/:customerId/points')
  async getCustomerPoints(@Param('customerId') customerId: string) {
    const points = await this.purchasesService.getCustomerPoints(customerId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Puntos del cliente obtenidos exitosamente',
      data: { points },
    };
  }

  @Get('customer/:customerId/tickets')
  async getCustomerTickets(
    @Param('customerId') customerId: string,
    @Query('raffleId') raffleId?: string,
  ) {
    const tickets = await this.purchasesService.getCustomerTickets(
      customerId,
      raffleId,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Boletas del cliente obtenidas exitosamente',
      data: tickets,
    };
  }

  @Get('raffle/:raffleId/ticket-stats')
  async getTicketStats(@Param('raffleId') raffleId: string) {
    const stats = await this.purchasesService.getTicketStats(raffleId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Estadísticas de boletas obtenidas exitosamente',
      data: stats,
    };
  }

  @Get('customer/:customerId/history')
  async getCustomerPurchaseHistory(
    @Param('customerId') customerId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ) {
    const history = await this.purchasesService.getCustomerPurchaseHistory(
      customerId,
      page,
      limit,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Historial de compras obtenido exitosamente',
      data: history,
    };
  }

  @Post('report')
  async getPurchaseReport(@Body() purchaseReportDto: PurchaseReportDto) {
    const report = await this.purchasesService.getPurchaseReport(
      purchaseReportDto.identification,
      purchaseReportDto.startDate,
      purchaseReportDto.endDate,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Reporte de compras generado exitosamente',
      data: report,
    };
  }

  @Get('invoices-report')
  async getInvoicesReport(@Query() invoiceReportDto: InvoiceReportDto) {
    const report =
      await this.purchasesService.getInvoicesReport(invoiceReportDto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Reporte de facturas generado exitosamente',
      data: report,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const purchase = await this.purchasesService.findOne(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Compra obtenida exitosamente',
      data: purchase,
    };
  }
}
