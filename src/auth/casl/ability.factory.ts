import {
  AbilityBuilder,
  AbilityClass,
  ExtractSubjectType,
  InferSubjects,
  PureAbility,
} from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { User } from '../../user/entities/user.entity';
import { Role } from '../../roles/entities/role.entity';
import { Permission } from '../../permissions/entities/permission.entity';

export type Actions = 'create' | 'read' | 'update' | 'delete';
export type Subjects = InferSubjects<any> | 'all';

export type AppAbility = PureAbility<[Actions, Subjects]>;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: User): AppAbility {
    const { can, build } = new AbilityBuilder<PureAbility<[Actions, Subjects]>>(
      PureAbility as AbilityClass<AppAbility>,
    );

    user.roles?.forEach((role: Role) => {
      role.permissions.forEach((perm: Permission) => {
        can(perm.action as Actions, perm.subject);
      });
    });

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
