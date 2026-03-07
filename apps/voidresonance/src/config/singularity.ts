import type { SingularityUpgradeDef } from '../game/types';

export const SINGULARITY_UPGRADES: SingularityUpgradeDef[] = [
  // ─── Branch A: Temporal Mastery ───
  {
    id: 'sg_tickspeed',
    name: 'Time Compression',
    description: 'Game tick speed +10% per level (production runs faster).',
    cost: 1,
    maxLevel: 10,
    branch: 'temporal',
    effect: { type: 'tickSpeed', value: 0.1 },
  },
  {
    id: 'sg_timeloop',
    name: 'Time Loop',
    description: 'Auto-prestige echo runs at configurable thresholds.',
    cost: 15,
    maxLevel: 1,
    branch: 'temporal',
    effect: { type: 'unlockFeature', value: 1 },
  },
  {
    id: 'sg_chronomastery',
    name: 'Chrono Mastery',
    description: 'Auto-void-collapse at configurable shard thresholds.',
    cost: 30,
    maxLevel: 1,
    branch: 'temporal',
    effect: { type: 'unlockFeature', value: 2 },
  },
  {
    id: 'sg_eternityengine',
    name: 'Eternity Engine',
    description: 'Offline progress at 200% efficiency.',
    cost: 50,
    maxLevel: 1,
    branch: 'temporal',
    effect: { type: 'offlineBonus', value: 2.0 },
  },

  // ─── Branch B: Dimensional Expansion ───
  {
    id: 'sg_dimensionalprod',
    name: 'Dimensional Flux',
    description: 'All production ×1.5 per level.',
    cost: 2,
    maxLevel: 10,
    branch: 'dimensional',
    effect: { type: 'productionMultiplier', value: 1.5 },
  },
  {
    id: 'sg_echomult',
    name: 'Echo Dimension',
    description: 'Echo gain ×1.5 per level.',
    cost: 3,
    maxLevel: 5,
    branch: 'dimensional',
    effect: { type: 'echoMultiplier', value: 1.5 },
  },
  {
    id: 'sg_shardmult',
    name: 'Shard Dimension',
    description: 'Void Shard gain ×1.5 per level.',
    cost: 5,
    maxLevel: 5,
    branch: 'dimensional',
    effect: { type: 'shardMultiplier', value: 1.5 },
  },
  {
    id: 'sg_omegaengine',
    name: 'The Omega Engine',
    description: 'All production ×10.',
    cost: 100,
    maxLevel: 1,
    branch: 'dimensional',
    effect: { type: 'productionMultiplier', value: 10 },
  },

  // ─── Branch C: Meta-Progression ───
  {
    id: 'sg_fragmentgain',
    name: 'Fragment Resonance',
    description: '+10% Reality Fragment gain per level.',
    cost: 3,
    maxLevel: 10,
    branch: 'meta',
    effect: { type: 'fragmentGainBonus', value: 0.1 },
  },
  {
    id: 'sg_universalautomator',
    name: 'Universal Automator',
    description: 'Automate generators, upgrades, and research.',
    cost: 15,
    maxLevel: 1,
    branch: 'meta',
    effect: { type: 'unlockFeature', value: 3 },
  },
  {
    id: 'sg_infiniteresearch',
    name: 'Infinite Research',
    description: 'Research nodes become repeatable with diminishing returns.',
    cost: 50,
    maxLevel: 1,
    branch: 'meta',
    effect: { type: 'unlockFeature', value: 4 },
  },
];

/** Minimum void collapses to unlock singularity */
export const SINGULARITY_COLLAPSE_THRESHOLD = 5;

/** Minimum path mastery level to unlock singularity */
export const SINGULARITY_MASTERY_THRESHOLD = 3;
