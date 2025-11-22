import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  HttpCode,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async findAll(@Query() paginationQuery: PaginationQueryDto) {
    return this.customersService.findAll(paginationQuery);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto as any);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto as any);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.customersService.remove(id);
  }

  @Post('sync')
  async sync(@Query('limit') limit = '50') {
    const res = await this.customersService.syncFromLeadConnector(
      Number(limit),
    );
    return res;
  }
}
