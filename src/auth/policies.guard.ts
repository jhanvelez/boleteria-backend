// policies.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CaslAbilityFactory } from './casl/ability.factory';
import { CHECK_POLICIES_KEY } from './policy.decorator';
import { PolicyHandler } from './types';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policyHandlers =
      this.reflector.get<PolicyHandler[]>(
        CHECK_POLICIES_KEY,
        context.getHandler(),
      ) || [];

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const ability = this.caslAbilityFactory.createForUser(user);

    return policyHandlers.every((handler) =>
      typeof handler === 'function'
        ? handler(ability)
        : handler.handle(ability),
    );
  }
}
