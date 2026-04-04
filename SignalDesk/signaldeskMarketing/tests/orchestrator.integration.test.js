'use strict';

jest.mock('../agents/research', () => ({ runResearch: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../agents/content', () => ({ runContent: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../agents/critic', () => ({ runCritic: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../agents/publisher', () => ({ runPublisher: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../agents/memory', () => ({ runMemory: jest.fn().mockResolvedValue(undefined) }));

const { runPipeline } = require('../agents/orchestrator');
const { createBus } = require('../context/bus');
const research = require('../agents/research');
const content = require('../agents/content');
const critic = require('../agents/critic');
const publisher = require('../agents/publisher');
const memory = require('../agents/memory');

describe('runPipeline', () => {
  let bus;
  beforeEach(() => {
    bus = createBus({ runId: 'test-001', weekOf: '2026-04-04', goal: 'test goal' });
    jest.clearAllMocks();
    research.runResearch.mockResolvedValue(undefined);
    content.runContent.mockResolvedValue(undefined);
    critic.runCritic.mockResolvedValue(undefined);
    publisher.runPublisher.mockResolvedValue(undefined);
    memory.runMemory.mockResolvedValue(undefined);
  });

  test('calls all five agents in correct order', async () => {
    const callOrder = [];
    research.runResearch.mockImplementation(async () => { callOrder.push('research'); });
    content.runContent.mockImplementation(async () => { callOrder.push('content'); });
    critic.runCritic.mockImplementation(async () => { callOrder.push('critic'); });
    publisher.runPublisher.mockImplementation(async () => { callOrder.push('publisher'); });
    memory.runMemory.mockImplementation(async () => { callOrder.push('memory'); });
    await runPipeline(bus);
    expect(callOrder).toEqual(['research', 'content', 'critic', 'publisher', 'memory']);
  });

  test('memory runs even when an upstream agent throws', async () => {
    content.runContent.mockRejectedValue(new Error('content exploded'));
    await expect(runPipeline(bus)).rejects.toThrow();
    expect(memory.runMemory).toHaveBeenCalledTimes(1);
  });

  test('passes bus to every agent', async () => {
    await runPipeline(bus);
    expect(research.runResearch).toHaveBeenCalledWith(bus);
    expect(content.runContent).toHaveBeenCalledWith(bus);
    expect(critic.runCritic).toHaveBeenCalledWith(bus);
    expect(publisher.runPublisher).toHaveBeenCalledWith(bus);
    expect(memory.runMemory).toHaveBeenCalledWith(bus);
  });
});
