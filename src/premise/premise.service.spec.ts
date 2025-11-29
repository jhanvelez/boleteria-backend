import { Test, TestingModule } from '@nestjs/testing';
import { PremiseService } from './premise.service';

describe('PremiseService', () => {
  let service: PremiseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PremiseService],
    }).compile();

    service = module.get<PremiseService>(PremiseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
