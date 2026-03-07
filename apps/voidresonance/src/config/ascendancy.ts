import type { AscendancyPathDef } from '../game/types';

export const ASCENDANCY_PATHS: AscendancyPathDef[] = [
  {
    id: 'architect',
    name: 'The Architect',
    title: "Builder's Mastery",
    philosophy: 'Build more, produce more. Quantity is power.',
    color: { primary: '#4a9eff', secondary: '#c0d8ff' },
    modifiers: {
      productionMult: 1.2,
      generatorCostMult: 0.5,
      dataRateMult: 1.0,
      researchSpeedMult: 1.0,
      clickMult: 1.0,
      offlineEfficiency: 0,
    },
  },
  {
    id: 'channeler',
    name: 'The Channeler',
    title: 'Active Power',
    philosophy: 'Harness the void through direct interaction. Your will shapes reality.',
    color: { primary: '#b44aff', secondary: '#e0c0ff' },
    modifiers: {
      productionMult: 1.0,
      generatorCostMult: 1.0,
      dataRateMult: 1.0,
      researchSpeedMult: 1.0,
      clickMult: 5.0,
      offlineEfficiency: 0,
    },
  },
  {
    id: 'observer',
    name: 'The Observer',
    title: 'Passive Omniscience',
    philosophy: 'True power comes from patience. Let the void work for you.',
    color: { primary: '#4aff9e', secondary: '#c0ffe0' },
    modifiers: {
      productionMult: 3.0,
      generatorCostMult: 1.0,
      dataRateMult: 2.0,
      researchSpeedMult: 1.5,
      clickMult: 0.1,
      offlineEfficiency: 0.75,
    },
  },
];
