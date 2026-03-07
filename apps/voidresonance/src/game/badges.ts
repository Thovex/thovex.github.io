import type { GameState } from './types';
import { GENERATORS } from '../config/generators';
import { UPGRADES } from '../config/upgrades';
import { RESEARCH_NODES } from '../config/research';
import { PRESTIGE_UPGRADES } from '../config/prestige';
import { VOID_SHARD_UPGRADES } from '../config/voidShards';
import { SINGULARITY_UPGRADES } from '../config/singularity';
import { getBulkCost, getMaxBuyable, getUpgradeCost, getPrestigeUpgradeCost, canStartResearch, isPrestigeUnlocked } from './engine';

export interface BadgeCounts {
  generators: number;
  upgrades: number;
  research: number;
  prestige: number;
  voidshards: number;
  singularity: number;
  [key: string]: number;
}

export function getAffordableCounts(state: GameState): BadgeCounts {
  // Generators: how many distinct generator types the player can buy ≥1 of
  let genCount = 0;
  for (const def of GENERATORS) {
    if (state.totalFluxEarned < def.unlockAt && (state.generators[def.id]?.owned ?? 0) === 0) continue;
    const owned = state.generators[def.id]?.owned ?? 0;
    if (state.buyMode === -1) {
      if (getMaxBuyable(def, owned, state.flux, state) > 0) genCount++;
    } else {
      const cost = getBulkCost(def, owned, state.buyMode, state);
      if (state.flux >= cost) genCount++;
    }
  }

  // Upgrades: how many available (not maxed, visible) upgrades the player can afford
  let upgCount = 0;
  for (const def of UPGRADES) {
    if (state.totalFluxEarned < def.unlockAt) continue;
    const level = state.upgrades[def.id]?.level ?? 0;
    if (level >= def.maxLevel) continue;
    const cost = getUpgradeCost(def, level);
    const resource = def.costResource === 'data' ? state.data : state.flux;
    if (resource >= cost) upgCount++;
  }

  // Research: how many nodes can be started right now
  let resCount = 0;
  if (!state.activeResearchId) {
    for (const def of RESEARCH_NODES) {
      if (state.totalFluxEarned < def.unlockAt) continue;
      if (canStartResearch(def, state)) resCount++;
    }
  }

  // Prestige upgrades: how many can be bought with current echoes
  let prestCount = 0;
  if (isPrestigeUnlocked(state)) {
    for (const def of PRESTIGE_UPGRADES) {
      const level = state.prestigeUpgrades[def.id] ?? 0;
      if (level >= def.maxLevel) continue;
      const cost = getPrestigeUpgradeCost(def.cost, level);
      if (state.echoes >= cost) prestCount++;
    }
  }

  // Void Shard upgrades
  let vsCount = 0;
  for (const def of VOID_SHARD_UPGRADES) {
    const level = state.voidShardUpgrades[def.id] ?? 0;
    if (level >= def.maxLevel) continue;
    if (state.voidShards >= def.cost) vsCount++;
  }

  // Singularity upgrades
  let sgCount = 0;
  for (const def of SINGULARITY_UPGRADES) {
    const level = state.singularityUpgrades[def.id] ?? 0;
    if (level >= def.maxLevel) continue;
    if (state.realityFragments >= def.cost) sgCount++;
  }

  return {
    generators: genCount,
    upgrades: upgCount,
    research: resCount,
    prestige: prestCount,
    voidshards: vsCount,
    singularity: sgCount,
  };
}
