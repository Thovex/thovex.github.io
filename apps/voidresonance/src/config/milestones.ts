// ─── Generator Milestone System ───
// When you own 16, 32, 64, 128, 256, 512+ of a generator, 
// special entities are spawned that provide unique bonuses.

export interface MilestoneDef {
  threshold: number;
  label: string;
  icon: string;
  effectDesc: string;
  /** Multiplier bonus applied to that generator's production */
  productionMultiplier: number;
}

export const MILESTONES: MilestoneDef[] = [
  {
    threshold: 16,
    label: '16',
    icon: '◆',
    effectDesc: 'Entity Awakens — x1.5 production',
    productionMultiplier: 1.5,
  },
  {
    threshold: 32,
    label: '32',
    icon: '◇',
    effectDesc: 'Entity Resonates — x2 production',
    productionMultiplier: 2,
  },
  {
    threshold: 64,
    label: '64',
    icon: '◈',
    effectDesc: 'Entity Harmonizes — x3 production',
    productionMultiplier: 3,
  },
  {
    threshold: 128,
    label: '128',
    icon: '⬡',
    effectDesc: 'Entity Transcends — x5 production',
    productionMultiplier: 5,
  },
  {
    threshold: 256,
    label: '256',
    icon: '⬢',
    effectDesc: 'Entity Ascends — x8 production',
    productionMultiplier: 8,
  },
  {
    threshold: 512,
    label: '512',
    icon: '✦',
    effectDesc: 'Entity Apotheosis — x15 production',
    productionMultiplier: 15,
  },
];

/** Get the total milestone multiplier for a generator based on how many are owned */
export function getMilestoneMultiplier(owned: number): number {
  let mult = 1;
  for (const m of MILESTONES) {
    if (owned >= m.threshold) {
      mult *= m.productionMultiplier;
    } else {
      break;
    }
  }
  return mult;
}

/** Get the highest reached milestone index (-1 if none) */
export function getHighestMilestone(owned: number): number {
  let highest = -1;
  for (let i = 0; i < MILESTONES.length; i++) {
    if (owned >= MILESTONES[i].threshold) {
      highest = i;
    }
  }
  return highest;
}

/** Get the next milestone threshold (or null if all reached) */
export function getNextMilestone(owned: number): MilestoneDef | null {
  for (const m of MILESTONES) {
    if (owned < m.threshold) return m;
  }
  return null;
}

