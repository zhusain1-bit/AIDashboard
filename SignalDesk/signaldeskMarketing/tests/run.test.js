'use strict';

jest.mock('../agents/orchestrator', () => ({
  runPipeline: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('dotenv', () => ({ config: jest.fn() }));

const { runPipeline } = require('../agents/orchestrator');

describe('run.js entry point behavior', () => {
  let originalArgv;
  let originalExit;
  let originalEnv;

  beforeEach(() => {
    originalArgv = process.argv;
    originalExit = process.exit;
    originalEnv = process.env.ANTHROPIC_API_KEY;
    process.exit = jest.fn();
    console.error = jest.fn();
    console.log = jest.fn();
    // Set a fake API key so the key check passes
    process.env.ANTHROPIC_API_KEY = 'sk-test-fake-key';
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.exit = originalExit;
    process.env.ANTHROPIC_API_KEY = originalEnv;
  });

  test('exits with code 1 and helpful message when no goal argument provided', () => {
    process.argv = ['node', 'run.js'];
    require('../run.js');
    return new Promise((resolve) => setImmediate(() => {
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('goal'));
      resolve();
    }));
  });

  test('calls runPipeline with a bus when goal is provided', async () => {
    process.argv = ['node', 'run.js', 'focus on PE deal flow this week'];
    jest.isolateModules(() => {
      require('../run.js');
    });
    // Wait for the async main() to execute and call runPipeline
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(runPipeline).toHaveBeenCalledTimes(1);
    const busArg = runPipeline.mock.calls[0][0];
    expect(busArg.goal).toBe('focus on PE deal flow this week');
    expect(busArg.runId).toBeDefined();
    expect(busArg.weekOf).toBeDefined();
  }, 10000);

  test('runId is a numeric timestamp string', async () => {
    process.argv = ['node', 'run.js', 'test goal'];
    jest.isolateModules(() => {
      require('../run.js');
    });
    // Wait for the async main() to execute and call runPipeline
    await new Promise((resolve) => setTimeout(resolve, 100));
    const busArg = runPipeline.mock.calls[0][0];
    expect(Number(busArg.runId)).toBeGreaterThan(0);
  }, 10000);
});
