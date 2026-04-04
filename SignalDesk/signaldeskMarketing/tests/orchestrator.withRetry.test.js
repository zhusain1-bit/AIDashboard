'use strict';

const { withRetry } = require('../agents/orchestrator');

jest.useFakeTimers();

describe('withRetry', () => {
  test('resolves immediately when fn succeeds on first attempt', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const promise = withRetry(fn, 3);
    await jest.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('retries on failure and eventually resolves', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success');
    const promise = withRetry(fn, 3);
    await jest.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test('throws after maxAttempts exhausted', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('always fail'));
    const promise = withRetry(fn, 3);
    promise.catch(() => {}); // suppress unhandled rejection warning
    await jest.runAllTimersAsync();
    await expect(promise).rejects.toThrow('always fail');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test('uses exponential backoff: 1000ms then 2000ms', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('done');
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const promise = withRetry(fn, 3);
    await jest.runAllTimersAsync();
    await promise;
    const timerCalls = setTimeoutSpy.mock.calls.map((call) => call[1]);
    expect(timerCalls).toContain(1000);
    expect(timerCalls).toContain(2000);
    setTimeoutSpy.mockRestore();
  });
});
