'use strict';

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: jest.fn() },
  }));
});

const Anthropic = require('@anthropic-ai/sdk');
const { runCritic } = require('../agents/critic');
const { createBus } = require('../context/bus');

function makeScoreResponse(scores, rewritten) {
  const payload = { scores, rewritten: rewritten || null };
  return { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(payload) }] };
}

const HIGH_SCORES = { brandVoice: 8, specificNotGeneric: 9, studentCareerAngle: 8, scrollStopping: 8 };
const LOW_SCORES  = { brandVoice: 5, specificNotGeneric: 6, studentCareerAngle: 5, scrollStopping: 6 };

describe('runCritic', () => {
  let bus;

  beforeEach(() => {
    bus = createBus({ runId: 'cr001', weekOf: '2026-04-04', goal: 'PE deal flow' });
    bus.drafts.linkedin = 'LinkedIn draft content';
    bus.drafts.newsletter = 'Newsletter draft content';
    bus.drafts.tweet_thread = 'Tweet thread draft content';
    jest.clearAllMocks();
  });

  test('writes criticScores for all three pieces', async () => {
    Anthropic.mockImplementation(() => ({
      messages: { create: jest.fn()
        .mockResolvedValueOnce(makeScoreResponse(HIGH_SCORES, null))
        .mockResolvedValueOnce(makeScoreResponse(HIGH_SCORES, null))
        .mockResolvedValueOnce(makeScoreResponse(HIGH_SCORES, null)) },
    }));

    await runCritic(bus);

    // averageScore of HIGH_SCORES = (8+9+8+8)/4 = 8.25 -> 8
    expect(bus.criticScores.linkedin).toBe(8);
    expect(bus.criticScores.newsletter).toBe(8);
    expect(bus.criticScores.tweet_thread).toBe(8);
  });

  test('adds piece to bus.approved when all criteria >= 7', async () => {
    Anthropic.mockImplementation(() => ({
      messages: { create: jest.fn()
        .mockResolvedValueOnce(makeScoreResponse(HIGH_SCORES, null))
        .mockResolvedValueOnce(makeScoreResponse(HIGH_SCORES, null))
        .mockResolvedValueOnce(makeScoreResponse(HIGH_SCORES, null)) },
    }));

    await runCritic(bus);

    expect(bus.approved).toContain('linkedin');
    expect(bus.approved).toContain('newsletter');
    expect(bus.approved).toContain('tweet_thread');
  });

  test('rewrites draft when any criterion is below 7', async () => {
    const rewrittenContent = 'Rewritten linkedin with Apollo $5B LBO breakdown.';
    Anthropic.mockImplementation(() => ({
      messages: { create: jest.fn()
        .mockResolvedValueOnce(makeScoreResponse(LOW_SCORES, rewrittenContent))
        .mockResolvedValueOnce(makeScoreResponse(HIGH_SCORES, null))
        .mockResolvedValueOnce(makeScoreResponse(HIGH_SCORES, null)) },
    }));

    await runCritic(bus);

    expect(bus.drafts.linkedin).toBe(rewrittenContent);
  });

  test('makes exactly 3 Claude calls sequentially', async () => {
    const mockFn = jest.fn()
      .mockResolvedValueOnce(makeScoreResponse(HIGH_SCORES, null))
      .mockResolvedValueOnce(makeScoreResponse(HIGH_SCORES, null))
      .mockResolvedValueOnce(makeScoreResponse(HIGH_SCORES, null));
    Anthropic.mockImplementation(() => ({ messages: { create: mockFn } }));

    await runCritic(bus);

    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  test('skips [DRAFT_FAILED] drafts without calling Claude', async () => {
    bus.drafts.linkedin = '[DRAFT_FAILED]';
    const mockFn = jest.fn()
      .mockResolvedValueOnce(makeScoreResponse(HIGH_SCORES, null))
      .mockResolvedValueOnce(makeScoreResponse(HIGH_SCORES, null));
    Anthropic.mockImplementation(() => ({ messages: { create: mockFn } }));

    await runCritic(bus);

    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(bus.approved).not.toContain('linkedin');
  });

  test('uses correct model', async () => {
    const mockFn = jest.fn().mockResolvedValue(makeScoreResponse(HIGH_SCORES, null));
    Anthropic.mockImplementation(() => ({ messages: { create: mockFn } }));

    await runCritic(bus);

    mockFn.mock.calls.forEach((call) => {
      expect(call[0].model).toBe('claude-sonnet-4-20250514');
    });
  });
});
