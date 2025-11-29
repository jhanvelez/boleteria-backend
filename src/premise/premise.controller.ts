import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { PremiseService } from './premise.service';
import { CreatePremiseDto } from './dto/create-premise.dto';
import { UpdatePremiseDto } from './dto/update-premise.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { Premise } from './entities/premise.entity';

@Controller('premises')
export class PremiseController {
  constructor(private readonly premiseService: PremiseService) {}

  @Post()
  create(@Body() createPremiseDto: CreatePremiseDto): Promise<Premise> {
    return this.premiseService.create(createPremiseDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.premiseService.findAll(query);
  }

  @Get('with-establishments')
  findWithEstablishments(): Promise<Premise[]> {
    return this.premiseService.findWithEstablishments();
  }

  @Get('estado/:estado')
  findByEstado(@Param('estado') estado: string): Promise<Premise[]> {
    return this.premiseService.findByEstado(estado);
  }

  @Get('numero-local/:numeroLocal')
  findByNumeroLocal(
    @Param('numeroLocal') numeroLocal: string,
  ): Promise<Premise> {
    return this.premiseService.findByNumeroLocal(numeroLocal);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Premise> {
    return this.premiseService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePremiseDto: UpdatePremiseDto,
  ): Promise<Premise> {
    return this.premiseService.update(id, updatePremiseDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.premiseService.remove(id);
  }
}
