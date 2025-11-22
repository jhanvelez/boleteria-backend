import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { PermissionsGuard } from './auth/permissions.guard';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @UseGuards(PermissionsGuard)
  @Get('protected')
  getProtectedEndpoint(): string {
    return 'This is a protected route, but you have access.';
  }
}
