import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CustomersService } from '../customers/customers.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const service = app.get(CustomersService);
    const result = await service.syncFromLeadConnector(50);

    console.log('Sync ejecutado correctamente:', result);
  } catch (err) {
    console.error('Error ejecutando sync:', err);
  } finally {
    await app.close();
  }
}

bootstrap();
