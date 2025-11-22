import { Controller, Post, Body, Get, Req, UseGuards } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { Request } from 'express';
import { Query } from '@nestjs/common';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('')
  async findAll(@Query() paginationQuery: PaginationQueryDto) {
    const users = await this.usersService.findAll(paginationQuery);
    return users;
  }

  @Post('register')
  async register(@Body() userData: CreateUserDto) {
    return this.usersService.create(userData);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user')
  async getProfile(@Req() req: Request) {
    const user = await this.usersService.findById(req.user['userId']);
    return { data: user };
  }
}
