import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../user/entities/user.entity';

export default async function seedUsers(dataSource: DataSource) {
  const repo = dataSource.getRepository(User);

  const hashedPassword = await bcrypt.hash('admin', 10);

  const data = [
    {
      firstName: 'Juan',
      lastName: 'Pérez',
      documentType: 'CC',
      documentId: '1234567890',
      email: 'admin@example.com',
      password: hashedPassword, // hash de "password123"
      isEmailConfirmed: true,
    },
    {
      firstName: 'María',
      lastName: 'Gómez',
      documentType: 'CC',
      documentId: '9876543210',
      email: 'maria.gomez@example.com',
      password: hashedPassword, // hash de "password123"
      isEmailConfirmed: false,
    },
  ];

  for (const dept of data) {
    await repo.save(dept);
  }

  console.log('✅ [Seeder] Users creados con éxito.');
}
