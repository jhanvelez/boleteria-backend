import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { Repository } from 'typeorm';
import { Permission } from '../../permissions/entities/permission.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const permissionRepo = app.get<Repository<Permission>>(
    getRepositoryToken(Permission),
  );

  const permissions = [
    // Users
    { action: 'create', subject: 'user' },
    { action: 'read', subject: 'user' },
    { action: 'update', subject: 'user' },
    { action: 'delete', subject: 'user' },

    // Roles
    { action: 'create', subject: 'role' },
    { action: 'read', subject: 'role' },
    { action: 'update', subject: 'role' },
    { action: 'delete', subject: 'role' },

    // Permissions
    { action: 'create', subject: 'permission' },
    { action: 'read', subject: 'permission' },
    { action: 'update', subject: 'permission' },
    { action: 'delete', subject: 'permission' },

    // Area Council
    { action: 'create', subject: 'areaCouncil' },
    { action: 'read', subject: 'areaCouncil' },
    { action: 'update', subject: 'areaCouncil' },
    { action: 'delete', subject: 'areaCouncil' },

    // News Management
    { action: 'create', subject: 'news' },
    { action: 'read', subject: 'news' },
    { action: 'update', subject: 'news' },
    { action: 'delete', subject: 'news' },

    // Cultural Directory
    { action: 'create', subject: 'culturalDirectory' },
    { action: 'read', subject: 'culturalDirectory' },
    { action: 'update', subject: 'culturalDirectory' },
    { action: 'delete', subject: 'culturalDirectory' },

    // Patrimonial Goods
    { action: 'create', subject: 'patrimonialGood' },
    { action: 'read', subject: 'patrimonialGood' },
    { action: 'update', subject: 'patrimonialGood' },
    { action: 'delete', subject: 'patrimonialGood' },

    // Parties Celebrations
    { action: 'create', subject: 'partyCelebration' },
    { action: 'read', subject: 'partyCelebration' },
    { action: 'update', subject: 'partyCelebration' },
    { action: 'delete', subject: 'partyCelebration' },

    // Economic Management
    { action: 'create', subject: 'economicReport' },
    { action: 'read', subject: 'economicReport' },
    { action: 'update', subject: 'economicReport' },
    { action: 'delete', subject: 'economicReport' },

    // Event Management
    { action: 'create', subject: 'event' },
    { action: 'read', subject: 'event' },
    { action: 'update', subject: 'event' },
    { action: 'delete', subject: 'event' },

    // Convocations
    { action: 'create', subject: 'convocation' },
    { action: 'read', subject: 'convocation' },
    { action: 'update', subject: 'convocation' },
    { action: 'delete', subject: 'convocation' },

    // Items
    { action: 'create', subject: 'item' },
    { action: 'read', subject: 'item' },
    { action: 'update', subject: 'item' },
    { action: 'delete', subject: 'item' },

    // Academic Management
    { action: 'create', subject: 'academicManagement' },
    { action: 'read', subject: 'academicManagement' },
    { action: 'update', subject: 'academicManagement' },
    { action: 'delete', subject: 'academicManagement' },

    // Calls
    { action: 'create', subject: 'call' },
    { action: 'read', subject: 'call' },
    { action: 'update', subject: 'call' },
    { action: 'delete', subject: 'call' },

    // Cultural Management
    { action: 'create', subject: 'culturalManagement' },
    { action: 'read', subject: 'culturalManagement' },
    { action: 'update', subject: 'culturalManagement' },
    { action: 'delete', subject: 'culturalManagement' },
  ];

  for (const perm of permissions) {
    const exists = await permissionRepo.findOne({ where: perm });
    if (!exists) {
      await permissionRepo.save(permissionRepo.create(perm));
    }
  }

  await app.close();
  console.log('Permisos cargados');
}

seed();
