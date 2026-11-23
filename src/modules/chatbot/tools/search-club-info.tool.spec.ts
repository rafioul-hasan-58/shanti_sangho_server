import { Test, TestingModule } from '@nestjs/testing';
import { ClubInfoService } from '../../../infrastructure/club-info/club-info.service';
import { SearchClubInfoTool } from './search-club-info.tool';

describe('SearchClubInfoTool', () => {
  let tool: SearchClubInfoTool;
  let clubInfoService: {
    search: jest.Mock;
  };

  const mockClubInfoResults = [
    {
      id: '64a1b2c3d4e5f67890123456',
      category: 'fees',
      title: 'Club Fees',
      content: 'General fee is 500 BDT.',
      tags: ['fees', 'dues'],
      internalAuditNote: 'should-not-leak',
    },
  ];

  beforeEach(async () => {
    clubInfoService = {
      search: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchClubInfoTool,
        {
          provide: ClubInfoService,
          useValue: clubInfoService,
        },
      ],
    }).compile();

    tool = module.get<SearchClubInfoTool>(SearchClubInfoTool);
  });

  it('should be defined', () => {
    expect(tool).toBeDefined();
    expect(tool.name).toBe('search_club_info');
    expect(tool.requiresAuth).toBe(false);
  });

  it('should search club info and return whitelisted fields only', async () => {
    clubInfoService.search.mockResolvedValueOnce(mockClubInfoResults);

    const result = await tool.execute({ query: 'fees' }, { user: null });

    expect(clubInfoService.search).toHaveBeenCalledWith('fees');
    expect(result).toHaveProperty('results');
    const items = result.results as Record<string, unknown>[];
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      category: 'fees',
      title: 'Club Fees',
      content: 'General fee is 500 BDT.',
      tags: ['fees', 'dues'],
    });
    // Ensure sensitive/internal fields are whitelisted out
    expect(items[0]).not.toHaveProperty('internalAuditNote');
  });

  it('should return helpful message when no search results match', async () => {
    clubInfoService.search.mockResolvedValueOnce([]);

    const result = await tool.execute(
      { query: 'nonexistent-topic' },
      { user: null },
    );

    expect(result).toEqual({
      results: [],
      message:
        'No verified club information found matching your query. Please ask a club staff member.',
    });
  });

  it('should return error for invalid arguments', async () => {
    const result = await tool.execute({ query: '' }, { user: null });

    expect(result).toEqual({
      error: 'invalid_arguments',
      message: 'The query must be a valid non-empty string.',
    });
    expect(clubInfoService.search).not.toHaveBeenCalled();
  });

  it('should catch errors from service and return friendly error object', async () => {
    clubInfoService.search.mockRejectedValueOnce(
      new Error('DB connection drop'),
    );

    const result = await tool.execute({ query: 'rules' }, { user: null });

    expect(result).toEqual({
      error: 'search_failed',
      message: 'Could not search club information at this time.',
    });
  });
});
