'use strict';

const fs = require('fs/promises');
const path = require('path');

const OUTPUTS_DIR = path.join(__dirname, '../outputs');

async function runPublisher(bus) {
  await fs.mkdir(OUTPUTS_DIR, { recursive: true });

  const { runId, weekOf, goal, drafts, criticScores, approved, research } = bus;

  await fs.writeFile(path.join(OUTPUTS_DIR, `linkedin_${runId}.txt`), drafts.linkedin, 'utf8');
  await fs.writeFile(path.join(OUTPUTS_DIR, `newsletter_${runId}.txt`), drafts.newsletter, 'utf8');
  await fs.writeFile(path.join(OUTPUTS_DIR, `tweets_${runId}.txt`), drafts.tweet_thread, 'utf8');

  const allPieces = ['linkedin', 'newsletter', 'tweet_thread'];
  for (const piece of allPieces) {
    if (!approved.includes(piece)) {
      console.warn(`[WARN] Publisher: ${piece} was not approved by the critic — publishing anyway`);
    }
  }

  const keyFindings = {
    topDeals: (research.topDeals || []).map((d) => d.title),
    marketMove: (research.marketMoves || [])[0]?.move || null,
    careerAngle: research.careerAngle?.topic || null,
    trends: research.trends || [],
  };

  const summary = {
    runId, weekOf, goal,
    status: 'success',
    criticScores,
    approved,
    keyFindings,
    files: {
      linkedin: `outputs/linkedin_${runId}.txt`,
      newsletter: `outputs/newsletter_${runId}.txt`,
      tweets: `outputs/tweets_${runId}.txt`,
    },
  };

  await fs.writeFile(path.join(OUTPUTS_DIR, `summary_${runId}.json`), JSON.stringify(summary, null, 2), 'utf8');
}

module.exports = { runPublisher };
