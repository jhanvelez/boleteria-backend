import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { EstablishmentsService } from './establishments.service';
import { CreateEstablishmentDto } from './dto/create-establishment.dto';
import { UpdateEstablishmentDto } from './dto/update-establishment.dto';
import { Establishment } from './entities/establishment.entity';

@Controller('establishments')
export class EstablishmentsController {
  constructor(private readonly establishmentsService: EstablishmentsService) {}

  @Post()
  create(
    @Body() createEstablishmentDto: CreateEstablishmentDto,
  ): Promise<Establishment> {
    return this.establishmentsService.create(createEstablishmentDto);
  }

  @Get()
  findAll(): Promise<Establishment[]> {
    return this.establishmentsService.findAll();
  }

  @Get('search')
  search(@Query('q') search: string): Promise<Establishment[]> {
    return this.establishmentsService.search(search);
  }

  @Get('premise/:premiseId')
  findByPremise(
    @Param('premiseId', ParseIntPipe) premiseId: number,
  ): Promise<Establishment[]> {
    return this.establishmentsService.findByPremise(premiseId);
  }

  @Get('status/:activo')
  findByStatus(@Param('activo') activo: string): Promise<Establishment[]> {
    const isActive = activo.toLowerCase() === 'true';
    return this.establishmentsService.findByStatus(isActive);
  }

  @Get('stats')
  getStats() {
    return this.establishmentsService.getStats();
  }

  @Get('categories')
  getCategories(): Promise<string[]> {
    return this.establishmentsService.getCategories();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Establishment> {
    return this.establishmentsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEstablishmentDto: UpdateEstablishmentDto,
  ): Promise<Establishment> {
    return this.establishmentsService.update(id, updateEstablishmentDto);
  }

  @Patch(':id/toggle-status')
  toggleStatus(@Param('id') id: string): Promise<Establishment> {
    return this.establishmentsService.toggleStatus(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.establishmentsService.remove(id);
  }
}
