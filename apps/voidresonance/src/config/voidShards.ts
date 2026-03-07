import type { VoidShardUpgradeDef } from '../game/types';

export const VOID_SHARD_UPGRADES: VoidShardUpgradeDef[] = [
  {
    id: 'vs_memory',
    name: 'Void Memory',
    description: 'Start each echo run with +500×level flux.',
    cost: 1,
    maxLevel: 10,
    effect: { type: 'startingFlux', value: 500 },
  },
  {
    id: 'vs_echogain',
    name: 'Echo Amplifier',
    description: '×1.8 echo gain per level.',
    cost: 2,
    maxLevel: 5,
    effect: { type: 'echoMultiplier', value: 1.8 },
  },
  {
    id: 'vs_research',
    name: 'Accelerated Research',
    description: 'All research 25% faster per level.',
    cost: 2,
    maxLevel: 5,
    effect: { type: 'researchSpeed', value: 0.25 },
  },
  {
    id: 'vs_startgens',
    name: 'Generator Legacy',
    description: 'Start runs with 3×level of each Tier 1 generator.',
    cost: 3,
    maxLevel: 3,
    effect: { type: 'startingGenerators', value: 3 },
  },
  {
    id: 'vs_production',
    name: 'Void Insight',
    description: '+25% all production per level.',
    cost: 3,
    maxLevel: 5,
    effect: { type: 'productionMultiplier', value: 0.25 },
  },
  {
    id: 'vs_rift',
    name: 'Rift Mastery',
    description: '+20% rift frequency per level.',
    cost: 4,
    maxLevel: 3,
    effect: { type: 'riftFrequency', value: 0.2 },
  },
  {
    id: 'vs_shardgain',
    name: 'Shard Resonance',
    description: '+15% shard gain per level.',
    cost: 5,
    maxLevel: 10,
    effect: { type: 'shardGainBonus', value: 0.15 },
  },
  {
    id: 'vs_autoecho',
    name: 'Reality Glimpse',
    description: 'Unlock auto-prestige at echo thresholds.',
    cost: 10,
    maxLevel: 1,
    effect: { type: 'unlockFeature', value: 1 },
  },
  {
    id: 'vs_keepresearch',
    name: 'Dimensional Anchor',
    description: 'Keep one research node through prestige.',
    cost: 15,
    maxLevel: 1,
    effect: { type: 'unlockFeature', value: 2 },
  },
  {
    id: 'vs_keepupgrade',
    name: 'Eternal Echo',
    description: 'Keep one echo upgrade through void collapse.',
    cost: 20,
    maxLevel: 1,
    effect: { type: 'unlockFeature', value: 3 },
  },
];

/** Minimum total echoes to unlock void collapse */
export const VOID_COLLAPSE_ECHO_THRESHOLD = 500;

/** Total echoes at which hint appears */
export const VOID_COLLAPSE_TEASE_THRESHOLD = 250;
