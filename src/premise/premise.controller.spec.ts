import { Test, TestingModule } from '@nestjs/testing';
import { PremiseController } from './premise.controller';
import { PremiseService } from './premise.service';

describe('PremiseController', () => {
  let controller: PremiseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PremiseController],
      providers: [PremiseService],
    }).compile();

    controller = module.get<PremiseController>(PremiseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
