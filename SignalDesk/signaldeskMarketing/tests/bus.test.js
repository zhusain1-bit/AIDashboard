'use strict';

const path = require('path');
const fs = require('fs/promises');
const { createBus } = require('../context/bus');

const STATE_PATH = path.join(__dirname, '../context/state.json');

afterEach(async () => {
  try {
    await fs.unlink(STATE_PATH);
  } catch (_) {
    // fine if it does not exist
  }
});

describe('createBus', () => {
  test('returns an object with correct initial schema', () => {
    const bus = createBus({ runId: '123', weekOf: '2026-04-04', goal: 'test goal' });
    expect(bus.runId).toBe('123');
    expect(bus.weekOf).toBe('2026-04-04');
    expect(bus.goal).toBe('test goal');
    expect(Array.isArray(bus.research.trends)).toBe(true);
    expect(Array.isArray(bus.research.topDeals)).toBe(true);
    expect(Array.isArray(bus.research.marketMoves)).toBe(true);
    expect(typeof bus.research.careerAngle).toBe('object');
    expect(Array.isArray(bus.contentIdeas)).toBe(true);
    expect(bus.drafts.linkedin).toBe('');
    expect(bus.drafts.newsletter).toBe('');
    expect(bus.drafts.tweet_thread).toBe('');
    expect(bus.criticScores.linkedin).toBe(0);
    expect(bus.criticScores.newsletter).toBe(0);
    expect(bus.criticScores.tweet_thread).toBe(0);
    expect(Array.isArray(bus.approved)).toBe(true);
    expect(typeof bus.performanceFeedback).toBe('object');
  });

  test('bus has a flush() method', () => {
    const bus = createBus({ runId: '123', weekOf: '2026-04-04', goal: 'test' });
    expect(typeof bus.flush).toBe('function');
  });

  test('flush() writes state.json with correct shape', async () => {
    const bus = createBus({ runId: 'abc', weekOf: '2026-04-04', goal: 'flush test' });
    bus.drafts.linkedin = 'hello linkedin';
    await bus.flush();

    const raw = await fs.readFile(STATE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    expect(parsed.runId).toBe('abc');
    expect(parsed.drafts.linkedin).toBe('hello linkedin');
    expect(parsed.flush).toBeUndefined(); // flush fn should NOT be serialized
  });

  test('flush() does not include the flush function in JSON', async () => {
    const bus = createBus({ runId: 'test', weekOf: '2026-04-04', goal: 'no fn leak' });
    await bus.flush();
    const raw = await fs.readFile(STATE_PATH, 'utf8');
    expect(raw).not.toContain('"flush"');
  });
});
