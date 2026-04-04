'use strict';

const fs = require('fs/promises');
const path = require('path');

const STATE_PATH = path.join(__dirname, 'state.json');

/**
 * Factory that returns the shared context bus for a single pipeline run.
 * bus.flush() serializes state to context/state.json (excludes the flush fn itself).
 *
 * @param {{ runId: string, weekOf: string, goal: string }} init
 * @returns {object} bus
 */
function createBus({ runId, weekOf, goal }) {
  const bus = {
    runId: String(runId),
    weekOf: String(weekOf),
    goal: String(goal),
    research: {
      trends: [],
      topDeals: [],
      marketMoves: [],
      careerAngle: {},
    },
    contentIdeas: [],
    drafts: {
      linkedin: '',
      newsletter: '',
      tweet_thread: '',
    },
    criticScores: {
      linkedin: 0,
      newsletter: 0,
      tweet_thread: 0,
    },
    approved: [],
    performanceFeedback: {},

    async flush() {
      const { flush: _flush, ...state } = bus;
      await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
    },
  };

  return bus;
}

module.exports = { createBus, STATE_PATH };
