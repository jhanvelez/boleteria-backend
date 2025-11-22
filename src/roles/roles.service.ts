import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionsRepository: Repository<Permission>,
  ) {}

  async create(dto: CreateRoleDto): Promise<Role> {
    const permissions = await this.permissionsRepository.findByIds(
      dto.permissionIds,
    );
    if (permissions.length !== dto.permissionIds.length) {
      throw new NotFoundException('Some permissions not found');
    }
    const role = this.rolesRepository.create({ name: dto.name, permissions });
    return this.rolesRepository.save(role);
  }

  findOne(id: number) {
    return this.rolesRepository.findOne({ where: { id } });
  }

  findAll() {
    return this.rolesRepository.find();
  }
}
