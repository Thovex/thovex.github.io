/** Mastery tier definitions — shared between engine and UI */
export interface MasteryTier {
  name: string;
  threshold: number;
  bonus: number; // fractional, e.g. 0.25 = +25%
}

export const MASTERY_TIERS: MasteryTier[] = [
  { name: 'Grandmaster', threshold: 15, bonus: 1.0 },
  { name: 'Master', threshold: 7, bonus: 0.5 },
  { name: 'Adept', threshold: 3, bonus: 0.25 },
  { name: 'Novice', threshold: 1, bonus: 0 },
];

/** Get the mastery tier for a given use count */
export function getMasteryTier(uses: number): MasteryTier {
  for (const tier of MASTERY_TIERS) {
    if (uses >= tier.threshold) return tier;
  }
  return { name: 'Unstarted', threshold: 0, bonus: 0 };
}

/** Maximum offline efficiency multiplier (300% with singularity) */
export const MAX_OFFLINE_EFFICIENCY = 3;
