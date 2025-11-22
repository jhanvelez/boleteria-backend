import { DataSource } from 'typeorm';
import { Municipality } from '../../locations/entities/municipality.entity';

export default async function seedMunicipalities(dataSource: DataSource) {
  const repo = dataSource.getRepository(Municipality);
  const data = [
    { name: 'Leticia', code: '00-leticia', departmentCode: '00' },
    { name: 'Puerto Nariño', code: '00-puerto_nariño', departmentCode: '00' },
    { name: 'Apía"', code: '24-apía', departmentCode: '24' },
    { name: 'Balboa"', code: '24-balboa', departmentCode: '24' },
    {
      name: 'Belén de Umbría',
      code: '24-belen_de_umbria',
      departmentCode: '24',
    },
    { name: 'Dosquebradas', code: '24-Dosquebradas', departmentCode: '24' },
    { name: 'Guática', code: '24-gu', departmentCode: '24' },
    { name: 'La Celia', code: '24-la_celia', departmentCode: '24' },
    { name: 'La Virginia', code: '24-la_virginia', departmentCode: '24' },
    { name: 'Marsella', code: '24-marsella', departmentCode: '24' },
    { name: 'Mistrató', code: '24-mistrato', departmentCode: '24' },
    { name: 'Pereira', code: '24-pereira', departmentCode: '24' },
    { name: 'Pueblo Rico', code: '24-pueblo_rico', departmentCode: '24' },
    { name: 'Quinchía', code: '24-quinchia', departmentCode: '24' },
    {
      name: 'Santa Rosa de Cabal',
      code: 'a24-santa_rosa_de_cabal',
      departmentCode: '24',
    },
    { name: 'Santuario', code: '24-santuario', departmentCode: '24' },
  ];

  for (const mun of data) {
    await repo.save(mun);
  }

  console.log('✅ [Seeder] Municipios creados con éxito.');
}
