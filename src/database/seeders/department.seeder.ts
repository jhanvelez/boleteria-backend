import { DataSource } from 'typeorm';
import { Department } from '../../locations/entities/department.entity';

export default async function seedDepartments(dataSource: DataSource) {
  const repo = dataSource.getRepository(Department);

  const data = [
    { name: 'Amazonas', code: '00' },
    { name: 'Antioquia', code: '01' },
    { name: 'Arauca', code: '02' },
    { name: 'Atlántico', code: '03' },
    { name: 'Bolívar', code: '04' },
    { name: 'Boyacá', code: '05' },
    { name: 'Caldas', code: '06' },
    { name: 'Caquetá', code: '07' },
    { name: 'Casanare', code: '08' },
    { name: 'Cauca', code: '09' },
    { name: 'Cesar', code: '10' },
    { name: 'Chocó', code: '11' },
    { name: 'Córdoba', code: '12' },
    { name: 'Cundinamarca', code: '13' },
    { name: 'Guainía', code: '14' },
    { name: 'Guaviare', code: '15' },
    { name: 'Huila', code: '16' },
    { name: 'La Guajira', code: '17' },
    { name: 'Magdalena', code: '18' },
    { name: 'Meta', code: '19' },
    { name: 'Nariño', code: '20' },
    { name: 'Norte de Santander', code: '21' },
    { name: 'Putumayo', code: '22' },
    { name: 'Quindío', code: '23' },
    { name: 'Risaralda', code: '24' },
    { name: 'San Andrés y Providencia', code: '25' },
    { name: 'Santander', code: '26' },
    { name: 'Sucre', code: '27' },
    { name: 'Tolima', code: '28' },
    { name: 'Valle del Cauca', code: '29' },
    { name: 'Vaupés', code: '30' },
    { name: 'Vichada', code: '31' },
  ];

  for (const dept of data) {
    await repo.save(dept);
  }

  console.log('✅ [Seeder] Departamentos creados con éxito.');
}
