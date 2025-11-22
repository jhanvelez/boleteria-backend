// types.ts
import { AppAbility } from './casl/ability.factory';

export interface IPolicyHandler {
  handle(ability: AppAbility): boolean;
}

export type PolicyHandlerCallback = (ability: AppAbility) => boolean;
export type PolicyHandler = IPolicyHandler | PolicyHandlerCallback;
