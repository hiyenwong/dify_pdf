import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { TextSegmentationService } from './text-segmentation.service';

describe('TextSegmentationService', () => {
  let service: TextSegmentationService;

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TextSegmentationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-value'),
          },
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<TextSegmentationService>(TextSegmentationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('segmentText', () => {
    it('should segment text by fixed size strategy', async () => {
      const text = 'This is a test text for segmentation. It should be split into chunks.';
      const options = {
        chunkSize: 20,
        overlapSize: 5,
        strategy: 'fixed' as const,
      };
      
      const segments = await service.segmentText(text, options);
      
      expect(segments).toBeDefined();
      expect(segments.length).toBeGreaterThan(1);
      expect(segments[0].content.length).toBeLessThanOrEqual(20);
    });

    it('should segment text by paragraph strategy', async () => {
      const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
      const options = {
        chunkSize: 1000,
        overlapSize: 0,
        strategy: 'paragraph' as const,
      };
      
      const segments = await service.segmentText(text, options);
      
      expect(segments).toBeDefined();
      expect(segments.length).toBeGreaterThan(0);
    });

    it('should segment text by semantic strategy', async () => {
      const text = 'Introduction: This is the first section. Methods: This describes the methodology. Results: Here are the findings.';
      const options = {
        chunkSize: 50,
        overlapSize: 10,
        strategy: 'semantic' as const,
      };
      
      const segments = await service.segmentText(text, options);
      
      expect(segments).toBeDefined();
      expect(segments.length).toBeGreaterThan(0);
    });

    it('should handle empty text', async () => {
      const text = '';
      const options = {
        chunkSize: 100,
        overlapSize: 10,
        strategy: 'fixed' as const,
      };
      
      const segments = await service.segmentText(text, options);
      
      expect(segments).toEqual([]);
    });

    it('should include metadata in segments', async () => {
      const text = 'Test content for metadata validation.';
      const options = {
        chunkSize: 100,
        overlapSize: 5,
        strategy: 'fixed' as const,
      };
      
      const segments = await service.segmentText(text, options);
      
      expect(segments[0].metadata).toBeDefined();
      expect(segments[0].metadata.strategy).toBe('fixed');
    });
  });
});