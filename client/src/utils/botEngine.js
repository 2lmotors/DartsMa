// Bot AI Simulator for Darts with Amateur, Pro, and Master levels
import { CHECKOUT_SUGGESTIONS } from './dartCalculations';

export const BOT_LEVELS = {
  amateur: {
    name: 'Bot Amateur',
    badge: 'Amateur (Moy. ~40)',
    color: 'emerald',
    targetAccuracy: 0.40,
    doubleAccuracy: 0.25,
    delayMs: 1400
  },
  pro: {
    name: 'Bot Pro',
    badge: 'Pro (Moy. ~75)',
    color: 'amber',
    targetAccuracy: 0.70,
    doubleAccuracy: 0.55,
    delayMs: 1200
  },
  master: {
    name: 'Bot Master',
    badge: 'Master (Moy. ~105)',
    color: 'rose',
    targetAccuracy: 0.90,
    doubleAccuracy: 0.85,
    delayMs: 1000
  }
};

const ADJACENT_SECTORS = {
  20: [1, 5],
  1: [20, 18],
  18: [1, 4],
  4: [18, 13],
  13: [4, 6],
  6: [13, 10],
  10: [6, 15],
  15: [10, 2],
  2: [15, 17],
  17: [2, 3],
  3: [17, 19],
  19: [3, 7],
  7: [19, 16],
  16: [7, 8],
  8: [16, 11],
  11: [8, 14],
  14: [11, 9],
  9: [14, 12],
  12: [9, 5],
  5: [12, 20]
};

/**
 * Calculates next dart for the bot
 */
export function calculateBotDart(remainingScore, levelKey = 'pro') {
  const level = BOT_LEVELS[levelKey] || BOT_LEVELS.pro;

  // Checkout scenario: remaining score <= 40 and even -> Aim for double!
  if (remainingScore <= 40 && remainingScore % 2 === 0 && remainingScore >= 2) {
    const targetDouble = remainingScore / 2;
    const isDoubleHit = Math.random() < level.doubleAccuracy;
    if (isDoubleHit) {
      return {
        score: targetDouble,
        multiplier: 2,
        label: `D${targetDouble}`,
        ring: 'DOUBLE',
        points: remainingScore
      };
    } else {
      // Missed double: either hit single or miss
      const hitSingle = Math.random() < 0.6;
      if (hitSingle) {
        return {
          score: targetDouble,
          multiplier: 1,
          label: `${targetDouble}`,
          ring: 'SINGLE',
          points: targetDouble
        };
      }
      return { score: 0, multiplier: 0, label: 'MISS', ring: 'MISS', points: 0 };
    }
  }

  // Intermediate setup score (e.g. 41 to 170)
  if (remainingScore <= 170 && remainingScore > 40) {
    // If remainingScore is 50, aim Bull
    if (remainingScore === 50) {
      const hitBull = Math.random() < level.doubleAccuracy;
      if (hitBull) {
        return { score: 50, multiplier: 1, label: 'BULL (50)', ring: 'DOUBLE_BULL', points: 50 };
      }
      return { score: 25, multiplier: 1, label: '25', ring: 'SINGLE_BULL', points: 25 };
    }
  }

  // Standard scoring throw: Aim T20 (or T19 if score requires)
  const targetSector = (remainingScore >= 60 && remainingScore <= 70) ? 19 : 20;
  const rand = Math.random();

  if (rand < level.targetAccuracy) {
    // Hits Triple!
    return {
      score: targetSector,
      multiplier: 3,
      label: `T${targetSector}`,
      ring: 'TRIPLE',
      points: targetSector * 3
    };
  } else if (rand < level.targetAccuracy + 0.35) {
    // Hits Single 20
    return {
      score: targetSector,
      multiplier: 1,
      label: `${targetSector}`,
      ring: 'SINGLE',
      points: targetSector
    };
  } else {
    // Slips to adjacent sector (1 or 5 for 20)
    const adjs = ADJACENT_SECTORS[targetSector] || [1, 5];
    const pickedAdj = adjs[Math.floor(Math.random() * adjs.length)];
    return {
      score: pickedAdj,
      multiplier: 1,
      label: `${pickedAdj}`,
      ring: 'SINGLE',
      points: pickedAdj
    };
  }
}

