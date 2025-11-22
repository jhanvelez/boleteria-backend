import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { Municipality } from './entities/municipality.entity';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Municipality)
    private readonly municipalityRepository: Repository<Municipality>,
  ) {}
  async findAll(): Promise<any> {
    const departments = await this.departmentRepository.find({
      relations: ['municipalities'],
      order: {
        name: 'ASC',
        municipalities: {
          name: 'ASC',
        },
      },
    });

    const data = departments.map((dept) => ({
      id: dept.id,
      name: dept.name,
      code: dept.code,
      children: dept.municipalities.map((mun) => ({
        id: mun.id,
        name: mun.name,
        code: mun.code,
      })),
    }));

    return {
      data,
      message: 'Departamentos con municipios cargados correctamente',
      success: true,
    };
  }
}
