import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { RafflesService } from './raffles.service';
import { CreateRaffleDto } from './dto/create-raffle.dto';
import { UpdateRaffleDto } from './dto/update-raffle.dto';

@Controller('raffles')
export class RafflesController {
  constructor(private readonly rafflesService: RafflesService) {}

  @Post()
  create(@Body() dto: CreateRaffleDto) {
    return this.rafflesService.create(dto);
  }

  @Get()
  findAll() {
    return this.rafflesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rafflesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRaffleDto) {
    return this.rafflesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rafflesService.remove(id);
  }
}
