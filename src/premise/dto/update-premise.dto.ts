import { PartialType } from '@nestjs/mapped-types';
import { CreatePremiseDto } from './create-premise.dto';

export class UpdatePremiseDto extends PartialType(CreatePremiseDto) {}
