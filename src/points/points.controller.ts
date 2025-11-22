import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
} from '@nestjs/common';
import { PointsService } from './points.service';
import { CreatePointDto } from './dto/create-point.dto';
import { UpdatePointDto } from './dto/update-point.dto';

@Controller('points')
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Post()
  create(@Body() dto: CreatePointDto) {
    return this.pointsService.create(dto);
  }

  @Get()
  findAll() {
    return this.pointsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pointsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePointDto) {
    return this.pointsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pointsService.remove(id);
  }

  @Get('/total/:customerId')
  getTotal(@Param('customerId') customerId: string) {
    return this.pointsService.getTotalPoints(customerId);
  }
}
