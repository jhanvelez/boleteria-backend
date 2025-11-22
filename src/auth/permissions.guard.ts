import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CaslAbilityFactory } from './casl/ability.factory';
import { CHECK_POLICIES_KEY } from './policy.decorator';
import { PolicyHandler } from './types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const policyHandlers =
      this.reflector.get<PolicyHandler[]>(
        CHECK_POLICIES_KEY,
        context.getHandler(),
      ) || [];

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const ability = this.caslAbilityFactory.createForUser(user);

    const hasPermission = policyHandlers.every((handler) =>
      typeof handler === 'function'
        ? handler(ability)
        : handler.handle(ability),
    );

    if (!hasPermission) {
      throw new ForbiddenException('No tienes permisos suficientes.');
    }
    return true;
  }
}
