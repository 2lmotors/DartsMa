// Standard dartboard sectors in clockwise order starting from the top 20
export const SECTORS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

// Normalized radii (from center 0 to outer wire 1.0)
// Official BDO/PDC dimensions:
// Bull: 12.7mm dia (r ~ 6.35)
// 25: 31.8mm dia (r ~ 15.9)
// Treble inner: 97mm (r ~ 97)
// Treble outer: 107mm (r ~ 107)
// Double inner: 160mm (r ~ 160)
// Double outer: 170mm (r ~ 170) -> normalized to 1.0
export const RADII = {
  DOUBLE_BULL: 6.35 / 170, // ~0.037
  SINGLE_BULL: 15.9 / 170, // ~0.093
  TRIPLE_INNER: 97.0 / 170, // ~0.570
  TRIPLE_OUTER: 107.0 / 170, // ~0.629
  DOUBLE_INNER: 160.0 / 170, // ~0.941
  DOUBLE_OUTER: 1.0,
};

/**
 * Converts polar coordinates (distance r normalized to double wire = 1.0, angle theta in rad)
 * into dart score object: { score, multiplier, ring, label, points }
 */
export function getScoreFromPolar(r, angleRad) {
  // Center is Bullseye
  if (r <= RADII.DOUBLE_BULL) {
    return { score: 50, multiplier: 1, ring: 'DOUBLE_BULL', label: 'BULL (50)', points: 50 };
  }
  if (r <= RADII.SINGLE_BULL) {
    return { score: 25, multiplier: 1, ring: 'SINGLE_BULL', label: '25', points: 25 };
  }
  if (r > RADII.DOUBLE_OUTER) {
    return { score: 0, multiplier: 0, ring: 'MISS', label: 'MISS', points: 0 };
  }

  // Angle: 0 rad is at (1, 0) [3 o'clock].
  // Top 20 is at -90 degrees (or 270 degrees).
  // Convert angle to degrees [0, 360) where 0 is at top (12 o'clock)
  let deg = (angleRad * (180 / Math.PI)) + 90;
  if (deg < 0) deg += 360;
  deg = deg % 360;

  // Each sector is 18 degrees. Sector 20 is centered at 0 deg (from 351 to 9)
  // Shift by +9 so sector 20 is [0, 18)
  const sectorIndex = Math.floor(((deg + 9) % 360) / 18);
  const baseScore = SECTORS[sectorIndex];

  if (r >= RADII.TRIPLE_INNER && r <= RADII.TRIPLE_OUTER) {
    return { score: baseScore, multiplier: 3, ring: 'TRIPLE', label: `T${baseScore}`, points: baseScore * 3 };
  }
  if (r >= RADII.DOUBLE_INNER && r <= RADII.DOUBLE_OUTER) {
    return { score: baseScore, multiplier: 2, ring: 'DOUBLE', label: `D${baseScore}`, points: baseScore * 2 };
  }
  return { score: baseScore, multiplier: 1, ring: 'SINGLE', label: `${baseScore}`, points: baseScore };
}

/**
 * Common checkout table helper
 */
export const CHECKOUT_SUGGESTIONS = {
  170: 'T20 T20 Bull',
  167: 'T20 T19 Bull',
  164: 'T20 T18 Bull',
  161: 'T20 T17 Bull',
  160: 'T20 T20 D20',
  100: 'T20 D20',
  80: 'T20 D10',
  60: 'S20 D20',
  50: 'Bull',
  40: 'D20',
  36: 'D18',
  32: 'D16',
  24: 'D12',
  20: 'D10',
  16: 'D8',
  8: 'D4',
  4: 'D2',
  2: 'D1'
};

