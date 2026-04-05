'use strict';

const path = require('path');
const fs = require('fs/promises');

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: jest.fn() },
  }));
});

const Anthropic = require('@anthropic-ai/sdk');
const { runMemory } = require('../agents/memory');
const { createBus } = require('../context/bus');

const PERFORMANCE_PATH = path.join(__dirname, '../memory/performance.json');
const INSIGHTS_PATH = path.join(__dirname, '../memory/insights.md');

async function resetPerformance(data = []) {
  await fs.writeFile(PERFORMANCE_PATH, JSON.stringify(data, null, 2), 'utf8');
}

async function deleteInsights() {
  try { await fs.unlink(INSIGHTS_PATH); } catch (_) {}
}

describe('runMemory', () => {
  let bus;

  beforeEach(async () => {
    bus = createBus({ runId: `mem-${Date.now()}`, weekOf: '2026-04-04', goal: 'memory test' });
    bus.criticScores = { linkedin: 8, newsletter: 7, tweet_thread: 8 };
    bus.research = {
      topDeals: [{ title: 'Apollo $5B LBO' }],
      marketMoves: [{ move: 'HY spread compression' }],
      careerAngle: { topic: 'PE headhunters' },
      trends: [],
    };
    bus.approved = ['linkedin', 'newsletter', 'tweet_thread'];
    await resetPerformance([]);
    await deleteInsights();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await resetPerformance([]);
    await deleteInsights();
  });

  test('appends one record to performance.json', async () => {
    Anthropic.mockImplementation(() => ({ messages: { create: jest.fn() } }));
    await runMemory(bus);

    const raw = await fs.readFile(PERFORMANCE_PATH, 'utf8');
    const data = JSON.parse(raw);
    expect(data).toHaveLength(1);
    expect(data[0].runId).toBe(bus.runId);
    expect(data[0].weekOf).toBe('2026-04-04');
    expect(data[0].goal).toBe('memory test');
    expect(data[0].criticScores).toEqual(bus.criticScores);
  });

  test('record includes topResearchAngles and notes fields', async () => {
    Anthropic.mockImplementation(() => ({ messages: { create: jest.fn() } }));
    await runMemory(bus);

    const raw = await fs.readFile(PERFORMANCE_PATH, 'utf8');
    const data = JSON.parse(raw);
    expect(Array.isArray(data[0].topResearchAngles)).toBe(true);
    expect(typeof data[0].notes).toBe('string');
  });

  test('appends to existing records, does not overwrite', async () => {
    const existing = [{ runId: 'old-001', weekOf: '2026-03-28', goal: 'prior run', topResearchAngles: [], criticScores: {}, notes: '' }];
    await resetPerformance(existing);
    Anthropic.mockImplementation(() => ({ messages: { create: jest.fn() } }));

    await runMemory(bus);

    const raw = await fs.readFile(PERFORMANCE_PATH, 'utf8');
    const data = JSON.parse(raw);
    expect(data).toHaveLength(2);
    expect(data[0].runId).toBe('old-001');
    expect(data[1].runId).toBe(bus.runId);
  });

  test('generates insights.md after 3+ total runs', async () => {
    const twoRuns = [
      { runId: 'r1', weekOf: '2026-03-21', goal: 'run 1', topResearchAngles: [], criticScores: { linkedin: 7, newsletter: 8, tweet_thread: 7 }, notes: 'good week' },
      { runId: 'r2', weekOf: '2026-03-28', goal: 'run 2', topResearchAngles: [], criticScores: { linkedin: 8, newsletter: 7, tweet_thread: 9 }, notes: 'tweets did well' },
    ];
    await resetPerformance(twoRuns);

    const mockFn = jest.fn().mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: '# Insights\n\nLinkedIn consistently scores 7-8.' }],
    });
    Anthropic.mockImplementation(() => ({ messages: { create: mockFn } }));

    await runMemory(bus); // makes total 3 runs

    expect(mockFn).toHaveBeenCalledTimes(1);
    const insightsContent = await fs.readFile(INSIGHTS_PATH, 'utf8');
    expect(insightsContent).toContain('Insights');
  });

  test('does not call Claude for insights with only 2 total runs', async () => {
    const oneRun = [{ runId: 'r1', weekOf: '2026-03-21', goal: 'run 1', topResearchAngles: [], criticScores: {}, notes: '' }];
    await resetPerformance(oneRun);

    const mockFn = jest.fn().mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: '# Insights' }],
    });
    Anthropic.mockImplementation(() => ({ messages: { create: mockFn } }));

    await runMemory(bus); // total = 2 runs

    expect(mockFn).not.toHaveBeenCalled();
  });
});
