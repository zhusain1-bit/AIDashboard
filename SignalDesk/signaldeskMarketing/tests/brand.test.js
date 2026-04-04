'use strict';

const brand = require('../foundation/brand');

describe('brand foundation', () => {
  test('exports a BRAND object', () => {
    expect(brand.BRAND).toBeDefined();
    expect(typeof brand.BRAND).toBe('object');
  });

  test('BRAND has voice rules', () => {
    expect(brand.BRAND.voice).toBeDefined();
    expect(typeof brand.BRAND.voice).toBe('string');
    expect(brand.BRAND.voice.length).toBeGreaterThan(20);
  });

  test('BRAND has bannedWords array', () => {
    expect(Array.isArray(brand.BRAND.bannedWords)).toBe(true);
    expect(brand.BRAND.bannedWords).toContain('paradigm shift');
    expect(brand.BRAND.bannedWords).toContain('leverage synergies');
    expect(brand.BRAND.bannedWords).toContain('robust');
  });

  test('BRAND has content pillars', () => {
    expect(Array.isArray(brand.BRAND.contentPillars)).toBe(true);
    expect(brand.BRAND.contentPillars).toContain('Deal of the Week');
    expect(brand.BRAND.contentPillars).toContain('Market Pulse');
  });

  test('BRAND has audiencePainPoints', () => {
    expect(Array.isArray(brand.BRAND.audiencePainPoints)).toBe(true);
    expect(brand.BRAND.audiencePainPoints.length).toBeGreaterThanOrEqual(3);
  });

  test('getVoicePrompt returns a string with key rules', () => {
    const prompt = brand.getVoicePrompt();
    expect(typeof prompt).toBe('string');
    expect(prompt).toContain('deal breakdown');
    expect(prompt).toContain('paradigm shift');
    expect(prompt).toContain('career');
  });
});
