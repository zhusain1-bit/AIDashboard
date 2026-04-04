'use strict';

const BRAND = {
  voice: [
    'Sharp, direct, no fluff.',
    'Students are smart — do not over-explain.',
    'Say "deal breakdown" not "transaction analysis".',
    'Always embed: here\'s what it means for your career.',
    'Competitors are too academic (WSJ) or too bro-y (FinanceTok). We are neither.',
  ].join(' '),

  bannedWords: [
    'paradigm shift',
    'leverage synergies',
    'robust',
    'game-changer',
    'holistic',
    'synergy',
    'best-in-class',
  ],

  audiencePainPoints: [
    'breaking into finance',
    'understanding markets before interviews',
    'not wanting to sound dumb on the desk',
  ],

  contentPillars: [
    'Deal of the Week',
    'Concept Explained',
    'Career Move',
    'Market Pulse',
  ],

  preferredPhrases: {
    'transaction analysis': 'deal breakdown',
    'utilize': 'use',
    'innovative solution': 'direct answer',
  },
};

/**
 * Returns a formatted voice guidelines string suitable for injection into
 * Claude system/user prompts.
 */
function getVoicePrompt() {
  return `
BRAND VOICE RULES (follow strictly):
- Voice: ${BRAND.voice}
- Preferred language: say "deal breakdown" not "transaction analysis". Always embed "here's what it means for your career" somewhere in the content.
- NEVER use these words or phrases: ${BRAND.bannedWords.join(', ')}.
- Audience pain points: ${BRAND.audiencePainPoints.join('; ')}.
- Content pillars: ${BRAND.contentPillars.join(', ')}.
- Competitors are too academic (WSJ) or too bro-y (FinanceTok). We are neither. Find the middle: sharp, grounded, career-first.
`.trim();
}

module.exports = { BRAND, getVoicePrompt };
