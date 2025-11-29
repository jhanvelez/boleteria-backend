import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { RafflesService } from './raffles.service';
import { CreateRaffleDto } from './dto/create-raffle.dto';
import { UpdateRaffleDto } from './dto/update-raffle.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@Controller('raffles')
export class RafflesController {
  constructor(private readonly service: RafflesService) {}

  @Post()
  create(@Body() dto: CreateRaffleDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.service.findAll(query);
  }

  @Get('stats')
  getStats() {
    return this.service.getStats();
  }

  @Get('active')
  findActive() {
    return this.service.findActive();
  }

  @Get('status/:status')
  findByStatus(@Param('status') status: string) {
    return this.service.findByStatus(status);
  }

  @Get('currently-active')
  getCurrentlyActive() {
    return this.service.getCurrentlyActive();
  }

  @Get('update-expired')
  updateExpiredRaffles() {
    return this.service.updateExpiredRaffles();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRaffleDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/toggle-status')
  toggleStatus(@Param('id') id: string) {
    return this.service.toggleStatus(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
