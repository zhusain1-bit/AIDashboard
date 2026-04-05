'use strict';

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: jest.fn() },
  }));
});

const Anthropic = require('@anthropic-ai/sdk');
const { runContent } = require('../agents/content');
const { createBus } = require('../context/bus');

function makeTextResponse(text) {
  return { stop_reason: 'end_turn', content: [{ type: 'text', text }] };
}

const SAMPLE_RESEARCH = {
  trends: ['M&A recovery underway'],
  topDeals: [{ title: 'Apollo $5B LBO of TechCo', summary: 'Largest LBO of Q1 2026', whyItMatters: 'Shows PE is back' }],
  marketMoves: [{ move: 'HY spread compression', explanation: 'Spreads at 18-month low' }],
  careerAngle: { topic: 'PE headhunter cycles', insight: 'On-cycle 2027 starts in May', actionableAdvice: 'Polish your deal sheet now' },
};

describe('runContent', () => {
  let bus;

  beforeEach(() => {
    bus = createBus({ runId: 'c001', weekOf: '2026-04-04', goal: 'PE deal flow' });
    bus.research = { ...SAMPLE_RESEARCH };
    jest.clearAllMocks();
  });

  test('writes all three drafts to bus.drafts on success', async () => {
    let callCount = 0;
    const responses = [
      makeTextResponse('LinkedIn post about Apollo $5B LBO. Here is what it means for your career.'),
      makeTextResponse('Newsletter: Deal of the Week — Apollo acquires TechCo in $5B LBO.'),
      makeTextResponse('Tweet 1: Apollo just closed a $5B LBO. Thread on what it means for students.'),
    ];
    Anthropic.mockImplementation(() => ({
      messages: { create: jest.fn().mockImplementation(() => Promise.resolve(responses[callCount++] || responses[0])) },
    }));

    await runContent(bus);

    expect(bus.drafts.linkedin).toBeTruthy();
    expect(bus.drafts.newsletter).toBeTruthy();
    expect(bus.drafts.tweet_thread).toBeTruthy();
    expect(bus.drafts.linkedin).not.toBe('[DRAFT_FAILED]');
    expect(bus.drafts.newsletter).not.toBe('[DRAFT_FAILED]');
    expect(bus.drafts.tweet_thread).not.toBe('[DRAFT_FAILED]');
  });

  test('sets [DRAFT_FAILED] placeholder when a Claude call throws', async () => {
    Anthropic.mockImplementation(() => ({
      messages: {
        create: jest.fn()
          .mockResolvedValueOnce(makeTextResponse('LinkedIn content here'))
          .mockRejectedValueOnce(new Error('newsletter API error'))
          .mockResolvedValueOnce(makeTextResponse('Tweet content here')),
      },
    }));

    await runContent(bus);

    expect(bus.drafts.linkedin).toBe('LinkedIn content here');
    expect(bus.drafts.newsletter).toBe('[DRAFT_FAILED]');
    expect(bus.drafts.tweet_thread).toBe('Tweet content here');
  });

  test('makes exactly 3 Claude calls via Promise.all', async () => {
    const mockFn = jest.fn().mockResolvedValue(makeTextResponse('content'));
    Anthropic.mockImplementation(() => ({ messages: { create: mockFn } }));

    await runContent(bus);

    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  test('uses correct model in all calls', async () => {
    const mockFn = jest.fn().mockResolvedValue(makeTextResponse('content'));
    Anthropic.mockImplementation(() => ({ messages: { create: mockFn } }));

    await runContent(bus);

    mockFn.mock.calls.forEach((call) => {
      expect(call[0].model).toBe('claude-sonnet-4-20250514');
    });
  });

  test('includes brand voice in system prompts', async () => {
    const mockFn = jest.fn().mockResolvedValue(makeTextResponse('content'));
    Anthropic.mockImplementation(() => ({ messages: { create: mockFn } }));

    await runContent(bus);

    const allSystems = mockFn.mock.calls.map((call) => call[0].system || '').join(' ');
    expect(allSystems).toContain('deal breakdown');
  });
});
