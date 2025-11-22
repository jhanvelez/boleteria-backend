import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.rolesService.findOne(id);
  }

  @Get()
  findAll() {
    return this.rolesService.findAll();
  }
}
