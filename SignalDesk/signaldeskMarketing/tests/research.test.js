'use strict';

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: jest.fn() },
  }));
});

const Anthropic = require('@anthropic-ai/sdk');
const { runResearch } = require('../agents/research');
const { createBus } = require('../context/bus');

const MOCK_RESEARCH_RESULT = {
  trends: ['Rising M&A activity in tech sector', 'Fed rate hold extended'],
  topDeals: [
    { title: 'Apollo $5B LBO', summary: 'Apollo acquires TechCo', whyItMatters: 'Largest LBO of 2026' },
    { title: 'Goldman Sachs advisory win', summary: 'GS lands mega-deal mandate', whyItMatters: 'Signals M&A recovery' },
    { title: 'Blackstone real estate fund', summary: '$10B RE fund closes', whyItMatters: 'Fundraising improving' },
  ],
  marketMoves: [{ move: 'Credit spreads tightening', explanation: 'HY spreads at 18-month low' }],
  careerAngle: {
    topic: 'PE headhunter cycles starting',
    insight: 'Headhunters reaching out for on-cycle 2027 roles',
    actionableAdvice: 'Polish your deal sheet now',
  },
};

function buildEndTurnResponse(jsonContent) {
  return { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(jsonContent) }] };
}

function buildToolUseResponse(toolUseId, name, input) {
  return { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: toolUseId, name, input }] };
}

describe('runResearch', () => {
  let bus;

  beforeEach(() => {
    bus = createBus({ runId: 'r001', weekOf: '2026-04-04', goal: 'test research' });
    jest.clearAllMocks();
  });

  test('writes to bus.research on success', async () => {
    Anthropic.mockImplementation(() => ({
      messages: { create: jest.fn().mockResolvedValue(buildEndTurnResponse(MOCK_RESEARCH_RESULT)) },
    }));
    await runResearch(bus);
    expect(bus.research.topDeals).toHaveLength(3);
    expect(bus.research.marketMoves).toHaveLength(1);
    expect(bus.research.careerAngle.topic).toBe('PE headhunter cycles starting');
    expect(bus.research.trends).toHaveLength(2);
  });

  test('handles agentic loop: tool_use then end_turn', async () => {
    const mockCreate = jest.fn()
      .mockResolvedValueOnce(buildToolUseResponse('tu_001', 'web_search', { query: 'finance news' }))
      .mockResolvedValueOnce(buildEndTurnResponse(MOCK_RESEARCH_RESULT));
    Anthropic.mockImplementation(() => ({ messages: { create: mockCreate } }));
    await runResearch(bus);
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(bus.research.topDeals).toHaveLength(3);
  });

  test('throws on malformed JSON from Claude', async () => {
    Anthropic.mockImplementation(() => ({
      messages: { create: jest.fn().mockResolvedValue({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'not json' }] }) },
    }));
    await expect(runResearch(bus)).rejects.toThrow();
  });

  test('uses web_search tool in API call', async () => {
    const mockCreate = jest.fn().mockResolvedValue(buildEndTurnResponse(MOCK_RESEARCH_RESULT));
    Anthropic.mockImplementation(() => ({ messages: { create: mockCreate } }));
    await runResearch(bus);
    const firstCall = mockCreate.mock.calls[0][0];
    expect(firstCall.tools).toBeDefined();
    expect(firstCall.tools.some((t) => t.type === 'web_search_20250305')).toBe(true);
  });

  test('uses correct model', async () => {
    const mockCreate = jest.fn().mockResolvedValue(buildEndTurnResponse(MOCK_RESEARCH_RESULT));
    Anthropic.mockImplementation(() => ({ messages: { create: mockCreate } }));
    await runResearch(bus);
    expect(mockCreate.mock.calls[0][0].model).toBe('claude-sonnet-4-20250514');
  });
});
