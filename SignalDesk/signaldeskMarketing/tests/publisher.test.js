'use strict';

const path = require('path');
const fs = require('fs/promises');
const { runPublisher } = require('../agents/publisher');
const { createBus } = require('../context/bus');

const OUTPUTS_DIR = path.join(__dirname, '../outputs');

async function cleanOutputs(runId) {
  const files = [`linkedin_${runId}.txt`, `newsletter_${runId}.txt`, `tweets_${runId}.txt`, `summary_${runId}.json`];
  for (const f of files) {
    try { await fs.unlink(path.join(OUTPUTS_DIR, f)); } catch (_) {}
  }
}

describe('runPublisher', () => {
  const RUN_ID = 'pub-test-001';
  let bus;

  beforeEach(() => {
    bus = createBus({ runId: RUN_ID, weekOf: '2026-04-04', goal: 'publisher test' });
    bus.drafts.linkedin = 'Final LinkedIn post content here.';
    bus.drafts.newsletter = 'Final newsletter intro content.';
    bus.drafts.tweet_thread = 'Tweet 1: hook\n---\nTweet 2: breakdown\n---\nTweet 3: breakdown\n---\nTweet 4: breakdown\n---\nTweet 5: career angle';
    bus.criticScores = { linkedin: 8, newsletter: 7, tweet_thread: 8 };
    bus.approved = ['linkedin', 'newsletter', 'tweet_thread'];
    bus.research = {
      trends: ['M&A recovery'],
      topDeals: [{ title: 'Apollo $5B LBO', summary: 'Big deal', whyItMatters: 'PE is back' }],
      marketMoves: [{ move: 'HY spread compression' }],
      careerAngle: { topic: 'PE headhunters', insight: 'Cycles starting', actionableAdvice: 'Polish deal sheet' },
    };
  });

  afterEach(() => cleanOutputs(RUN_ID));

  test('writes linkedin_{runId}.txt with correct content', async () => {
    await runPublisher(bus);
    const content = await fs.readFile(path.join(OUTPUTS_DIR, `linkedin_${RUN_ID}.txt`), 'utf8');
    expect(content).toBe(bus.drafts.linkedin);
  });

  test('writes newsletter_{runId}.txt with correct content', async () => {
    await runPublisher(bus);
    const content = await fs.readFile(path.join(OUTPUTS_DIR, `newsletter_${RUN_ID}.txt`), 'utf8');
    expect(content).toBe(bus.drafts.newsletter);
  });

  test('writes tweets_{runId}.txt with correct content', async () => {
    await runPublisher(bus);
    const content = await fs.readFile(path.join(OUTPUTS_DIR, `tweets_${RUN_ID}.txt`), 'utf8');
    expect(content).toBe(bus.drafts.tweet_thread);
  });

  test('writes summary_{runId}.json with correct fields', async () => {
    await runPublisher(bus);
    const raw = await fs.readFile(path.join(OUTPUTS_DIR, `summary_${RUN_ID}.json`), 'utf8');
    const summary = JSON.parse(raw);
    expect(summary.runId).toBe(RUN_ID);
    expect(summary.weekOf).toBe('2026-04-04');
    expect(summary.goal).toBe('publisher test');
    expect(summary.criticScores).toEqual(bus.criticScores);
    expect(summary.approved).toEqual(bus.approved);
    expect(summary.keyFindings).toBeDefined();
    expect(summary.status).toBe('success');
  });

  test('logs warning if a piece is not in bus.approved', async () => {
    bus.approved = ['linkedin'];
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await runPublisher(bus);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('newsletter'));
    consoleSpy.mockRestore();
  });

  test('creates outputs directory if it does not exist', async () => {
    await runPublisher(bus);
    const stat = await fs.stat(OUTPUTS_DIR);
    expect(stat.isDirectory()).toBe(true);
  });
});
