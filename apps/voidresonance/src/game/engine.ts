import type { GameState, GeneratorDef, UpgradeDef, ResearchNodeDef, ExpeditionReward, ExpeditionResult } from './types';
import { GENERATORS } from '../config/generators';
import { UPGRADES } from '../config/upgrades';
import { RESEARCH_NODES } from '../config/research';
import { PRESTIGE_UPGRADES } from '../config/prestige';
import { VOID_SHARD_UPGRADES } from '../config/voidShards';
import { ASCENDANCY_PATHS } from '../config/ascendancy';
import { SINGULARITY_UPGRADES } from '../config/singularity';
import { SINGULARITY_MASTERY_THRESHOLD, SINGULARITY_COLLAPSE_THRESHOLD } from '../config/singularity';
import { getMasteryTier, MAX_OFFLINE_EFFICIENCY } from '../config/constants';
import { EXPEDITION_ZONES, EXPEDITION_ARTIFACTS, EXPEDITION_LORE } from '../config/expeditions';
import { getMilestoneMultiplier } from '../config/milestones';
import { entityStore } from '../components/reactor/entityStore';

// ─── Pre-built Lookup Maps (O(1) instead of O(n) .find()) ───

const GENERATOR_MAP = new Map(GENERATORS.map(g => [g.id, g]));
const ZONE_MAP = new Map(EXPEDITION_ZONES.map(z => [z.id, z]));
const PATH_MAP = new Map(ASCENDANCY_PATHS.map(p => [p.id, p]));

// Cache the cost-reduce prestige def (looked up every getGeneratorCost call)
const COST_REDUCE_DEF = PRESTIGE_UPGRADES.find(p => p.id === 'p_costreduce')!;

// Pre-filter config arrays by effect type to avoid scanning full arrays
const UPGRADES_GEN_MULT = UPGRADES.filter(u => u.effect.type === 'generatorMultiplier');
const UPGRADES_GLOBAL_MULT = UPGRADES.filter(u => u.effect.type === 'globalMultiplier');
const UPGRADES_CLICK_FLAT = UPGRADES.filter(u => u.effect.type === 'clickFlat');
const UPGRADES_CLICK_MULT = UPGRADES.filter(u => u.effect.type === 'clickMultiplier');
const UPGRADES_CLICK_PCT = UPGRADES.filter(u => u.effect.type === 'clickPercent');
const UPGRADES_RESEARCH_SPEED = UPGRADES.filter(u => u.effect.type === 'researchSpeed');
const UPGRADES_OFFLINE = UPGRADES.filter(u => u.effect.type === 'offlineEfficiency');
const RESEARCH_GEN_MULT = RESEARCH_NODES.filter(r => r.effect.type === 'generatorMultiplier');
const RESEARCH_GLOBAL_MULT = RESEARCH_NODES.filter(r => r.effect.type === 'globalMultiplier');
const RESEARCH_DATA_RATE = RESEARCH_NODES.filter(r => r.effect.type === 'dataRate');
const RESEARCH_CLICK_MULT = RESEARCH_NODES.filter(r => r.effect.type === 'clickMultiplier');
const RESEARCH_PRESTIGE_BONUS = RESEARCH_NODES.filter(r => r.effect.type === 'prestigeBonus');
const PRESTIGE_PROD_MULT = PRESTIGE_UPGRADES.filter(p => p.effect.type === 'productionMultiplier');
const PRESTIGE_CLICK_POWER = PRESTIGE_UPGRADES.filter(p => p.effect.type === 'clickPower');
const PRESTIGE_DATA_RATE = PRESTIGE_UPGRADES.filter(p => p.effect.type === 'dataRateBonus');
const PRESTIGE_RESEARCH_SPEED = PRESTIGE_UPGRADES.filter(p => p.effect.type === 'researchSpeedBonus');
const PRESTIGE_ECHO_GAIN = PRESTIGE_UPGRADES.filter(p => p.effect.type === 'echoGainBonus');
const PRESTIGE_OFFLINE = PRESTIGE_UPGRADES.filter(p => p.effect.type === 'offlineBonus');
const VS_PROD_MULT = VOID_SHARD_UPGRADES.filter(v => v.effect.type === 'productionMultiplier');
const VS_ECHO_MULT = VOID_SHARD_UPGRADES.filter(v => v.effect.type === 'echoMultiplier');
const VS_SHARD_GAIN = VOID_SHARD_UPGRADES.filter(v => v.effect.type === 'shardGainBonus');
const VS_RESEARCH_SPEED = VOID_SHARD_UPGRADES.filter(v => v.effect.type === 'researchSpeed');
const SG_PROD_MULT = SINGULARITY_UPGRADES.filter(s => s.effect.type === 'productionMultiplier');
const SG_ECHO_MULT = SINGULARITY_UPGRADES.filter(s => s.effect.type === 'echoMultiplier');
const SG_SHARD_MULT = SINGULARITY_UPGRADES.filter(s => s.effect.type === 'shardMultiplier');
const SG_TICK_SPEED = SINGULARITY_UPGRADES.filter(s => s.effect.type === 'tickSpeed');
const SG_OFFLINE = SINGULARITY_UPGRADES.filter(s => s.effect.type === 'offlineBonus');
const SG_FRAGMENT_GAIN = SINGULARITY_UPGRADES.filter(s => s.effect.type === 'fragmentGainBonus');

// ─── Random Event Helpers ───

function getRandomEventSurgeMultiplier(genId: string): number {
  let mult = 1;
  for (const evt of entityStore.randomEvents) {
    if (evt.type === 'surge' && evt.targetGenId === genId) {
      mult *= evt.multiplier;
    }
  }
  return mult;
}

function getRandomEventClickMultiplier(): number {
  let mult = 1;
  for (const evt of entityStore.randomEvents) {
    if (evt.type === 'clickFrenzy') {
      mult *= evt.multiplier;
    }
  }
  return mult;
}

function getRandomEventDataMultiplier(): number {
  let mult = 1;
  for (const evt of entityStore.randomEvents) {
    if (evt.type === 'dataStorm') {
      mult *= evt.multiplier;
    }
  }
  return mult;
}

// ─── Cost Formulas ───

export function getGeneratorCost(def: GeneratorDef, owned: number, state: GameState): number {
  let cost = def.baseCost * Math.pow(def.costGrowth, owned);
  const costRedLevel = state.prestigeUpgrades['p_costreduce'] ?? 0;
  if (costRedLevel > 0) {
    cost *= Math.pow(1 - COST_REDUCE_DEF.effect.value, costRedLevel);
  }
  // Ascendancy path cost modifier
  const pathMod = getAscendancyModifier('generatorCostMult', state);
  if (pathMod !== 1) {
    cost *= pathMod;
  }
  // Quantum Stabilizer artifact: -10% generator cost
  if (state.expeditions.artifacts.includes('quantum_stabilizer')) {
    cost *= 0.9;
  }
  return Math.ceil(cost);
}

export function getBulkCost(def: GeneratorDef, owned: number, count: number, state: GameState): number {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += getGeneratorCost(def, owned + i, state);
  }
  return total;
}

export function getMaxBuyable(def: GeneratorDef, owned: number, budget: number, state: GameState): number {
  let count = 0;
  let totalCost = 0;
  while (true) {
    const nextCost = getGeneratorCost(def, owned + count, state);
    if (totalCost + nextCost > budget) break;
    totalCost += nextCost;
    count++;
    if (count > 10000) break;
  }
  return count;
}

export function getUpgradeCost(def: UpgradeDef, currentLevel: number): number {
  return Math.ceil(def.cost * Math.pow(3, currentLevel));
}

// ─── Production Formulas ───

export function getGeneratorMultiplier(genId: string, state: GameState): number {
  let mult = 1;

  for (const upDef of UPGRADES_GEN_MULT) {
    const upState = state.upgrades[upDef.id];
    if (!upState || upState.level === 0) continue;
    if (upDef.effect.targetId === genId) {
      mult *= Math.pow(upDef.effect.value, upState.level);
    }
  }

  for (const rDef of RESEARCH_GEN_MULT) {
    const rState = state.research[rDef.id];
    if (!rState || !rState.completed) continue;
    if (rDef.effect.targetId === genId) {
      mult *= rDef.effect.value;
    }
  }

  return mult;
}

export function getGlobalMultiplier(state: GameState): number {
  let mult = 1;

  for (const upDef of UPGRADES_GLOBAL_MULT) {
    const upState = state.upgrades[upDef.id];
    if (!upState || upState.level === 0) continue;
    mult *= Math.pow(upDef.effect.value, upState.level);
  }

  for (const rDef of RESEARCH_GLOBAL_MULT) {
    const rState = state.research[rDef.id];
    if (!rState || !rState.completed) continue;
    mult *= rDef.effect.value;
  }

  for (const pDef of PRESTIGE_PROD_MULT) {
    const level = state.prestigeUpgrades[pDef.id] ?? 0;
    if (level === 0) continue;
    if (pDef.id === 'p_premium_bonus' && !state.isPremium) continue;
    mult *= Math.pow(pDef.effect.value, level);
  }

  if (state.isPremium) {
    mult *= 1.05;
  }

  // Void Shard production bonus
  for (const vsDef of VS_PROD_MULT) {
    const level = state.voidShardUpgrades[vsDef.id] ?? 0;
    if (level === 0) continue;
    mult *= 1 + vsDef.effect.value * level;
  }

  // Ascendancy path production modifier
  const pathProdMod = getAscendancyModifier('productionMult', state);
  mult *= pathProdMod;

  // Singularity production bonuses
  for (const sgDef of SG_PROD_MULT) {
    const level = state.singularityUpgrades[sgDef.id] ?? 0;
    if (level === 0) continue;
    mult *= Math.pow(sgDef.effect.value, level);
  }

  return mult;
}

export function getFluxPerSecond(state: GameState): number {
  let total = 0;
  const globalMult = getGlobalMultiplier(state);

  for (const def of GENERATORS) {
    const gState = state.generators[def.id];
    if (!gState || gState.owned === 0) continue;
    const available = getAvailableGenerators(def.id, state);
    if (available <= 0) continue;
    const genMult = getGeneratorMultiplier(def.id, state);
    const milestoneMult = getMilestoneMultiplier(gState.owned);
    const surgeMult = getRandomEventSurgeMultiplier(def.id);
    total += def.baseProduction * available * genMult * milestoneMult * surgeMult;
  }

  // Apply expedition permanent bonus
  const permBonus = state.expeditions.permanentBonus;
  if (permBonus > 0) {
    total *= 1 + permBonus / 100;
  }
  // Void Heart artifact: +1% production per expedition completed
  if (state.expeditions.artifacts.includes('void_heart') && state.expeditions.completedCount > 0) {
    total *= 1 + state.expeditions.completedCount * 0.01;
  }

  // Apply temp boost (stored as boolean-like check against 0)
  if (state.expeditions.tempBoostEnd > 0) {
    total *= 2;
  }

  return total * globalMult;
}

export function getGeneratorFluxPerSecond(genId: string, state: GameState): number {
  const def = GENERATOR_MAP.get(genId);
  if (!def) return 0;
  const gState = state.generators[def.id];
  if (!gState || gState.owned === 0) return 0;
  const available = getAvailableGenerators(def.id, state);
  if (available <= 0) return 0;
  const genMult = getGeneratorMultiplier(def.id, state);
  const globalMult = getGlobalMultiplier(state);
  const milestoneMult = getMilestoneMultiplier(gState.owned);
  const surgeMult = getRandomEventSurgeMultiplier(def.id);
  return def.baseProduction * available * genMult * milestoneMult * globalMult * surgeMult;
}

export function getClickValue(state: GameState): number {
  let flat = 1;
  let mult = 1;
  let fpsPercent = 0.05; // Base: each click = 5% of flux/sec

  for (const upDef of UPGRADES_CLICK_FLAT) {
    const upState = state.upgrades[upDef.id];
    if (!upState || upState.level === 0) continue;
    flat += upDef.effect.value * upState.level;
  }

  for (const upDef of UPGRADES_CLICK_MULT) {
    const upState = state.upgrades[upDef.id];
    if (!upState || upState.level === 0) continue;
    mult *= Math.pow(upDef.effect.value, upState.level);
  }

  for (const upDef of UPGRADES_CLICK_PCT) {
    const upState = state.upgrades[upDef.id];
    if (!upState || upState.level === 0) continue;
    fpsPercent += upDef.effect.value * upState.level;
  }

  for (const rDef of RESEARCH_CLICK_MULT) {
    const rState = state.research[rDef.id];
    if (!rState || !rState.completed) continue;
    mult *= rDef.effect.value;
  }

  for (const pDef of PRESTIGE_CLICK_POWER) {
    const level = state.prestigeUpgrades[pDef.id] ?? 0;
    if (level === 0) continue;
    mult *= Math.pow(pDef.effect.value, level);
  }

  // Click value = flat bonuses × multiplier, PLUS a % of passive flux/sec
  const fps = getFluxPerSecond(state);
  const fpsBonus = fps * fpsPercent;
  const clickEventMult = getRandomEventClickMultiplier();

  // Ascendancy path click modifier
  const pathClickMod = getAscendancyModifier('clickMult', state);

  return (flat + fpsBonus) * mult * clickEventMult * pathClickMod;
}

// ─── Data Generation ───

export function getDataPerSecond(state: GameState): number {
  const fps = getFluxPerSecond(state);
  if (fps <= 0) return 0;

  const baseRate = Math.log10(Math.max(1, fps)) * 0.5;
  let rateMult = 1;

  for (const rDef of RESEARCH_DATA_RATE) {
    const rState = state.research[rDef.id];
    if (!rState || !rState.completed) continue;
    rateMult += rDef.effect.value;
  }

  if (state.isPremium) {
    rateMult += 0.1;
  }

  // Prestige data rate bonus
  for (const pDef of PRESTIGE_DATA_RATE) {
    const level = state.prestigeUpgrades[pDef.id] ?? 0;
    if (level === 0) continue;
    rateMult += pDef.effect.value * level;
  }

  // Ascendancy path data rate modifier
  const pathDataMod = getAscendancyModifier('dataRateMult', state);
  rateMult *= pathDataMod;

  return baseRate * rateMult * getRandomEventDataMultiplier();
}

// ─── Research ───

export function getResearchSpeed(state: GameState): number {
  let speed = 1;

  for (const upDef of UPGRADES_RESEARCH_SPEED) {
    const upState = state.upgrades[upDef.id];
    if (!upState || upState.level === 0) continue;
    speed += upDef.effect.value * upState.level;
  }

  // Prestige research speed bonus
  for (const pDef of PRESTIGE_RESEARCH_SPEED) {
    const level = state.prestigeUpgrades[pDef.id] ?? 0;
    if (level === 0) continue;
    speed += pDef.effect.value * level;
  }

  // Void Shard research speed bonus
  for (const vsDef of VS_RESEARCH_SPEED) {
    const level = state.voidShardUpgrades[vsDef.id] ?? 0;
    if (level === 0) continue;
    speed += vsDef.effect.value * level;
  }

  // Ascendancy path research speed modifier
  const pathResMod = getAscendancyModifier('researchSpeedMult', state);
  speed *= pathResMod;

  return speed;
}

export function canStartResearch(def: ResearchNodeDef, state: GameState): boolean {
  const rState = state.research[def.id];
  if (rState?.completed) return false;

  if (def.requires) {
    for (const reqId of def.requires) {
      const reqState = state.research[reqId];
      if (!reqState?.completed) return false;
    }
  }

  const resource = def.costResource === 'data' ? state.data : state.flux;
  return resource >= def.cost;
}

// ─── Prestige ───

export function getEchoGain(state: GameState): number {
  if (state.totalFluxEarned < 1000000) return 0;

  let base = Math.floor(Math.pow(state.totalFluxEarned / 1000000, 0.5));

  for (const rDef of RESEARCH_PRESTIGE_BONUS) {
    const rState = state.research[rDef.id];
    if (!rState || !rState.completed) continue;
    base = Math.floor(base * (1 + rDef.effect.value));
  }

  for (const pDef of PRESTIGE_ECHO_GAIN) {
    const level = state.prestigeUpgrades[pDef.id] ?? 0;
    if (level === 0) continue;
    base = Math.floor(base * (1 + pDef.effect.value * level));
  }

  // Void Shard echo multiplier
  for (const vsDef of VS_ECHO_MULT) {
    const level = state.voidShardUpgrades[vsDef.id] ?? 0;
    if (level === 0) continue;
    base = Math.floor(base * Math.pow(vsDef.effect.value, level));
  }

  // Singularity echo multiplier
  for (const sgDef of SG_ECHO_MULT) {
    const level = state.singularityUpgrades[sgDef.id] ?? 0;
    if (level === 0) continue;
    base = Math.floor(base * Math.pow(sgDef.effect.value, level));
  }

  // Echo Resonator artifact: +10% echo gain
  if (state.expeditions.artifacts.includes('echo_resonator')) {
    base = Math.floor(base * 1.1);
  }

  return base;
}

export function isPrestigeUnlocked(state: GameState): boolean {
  // Unlocked if Echo Theory research is done OR player has already prestiged
  if (state.prestigeCount > 0 || state.echoes > 0 || state.totalEchoes > 0) return true;
  const echoTheory = state.research['r_prestige_theory'];
  return echoTheory?.completed === true;
}

// ─── Offline Progress ───

export function getOfflineEfficiency(state: GameState): number {
  let eff = 0.25;

  for (const upDef of UPGRADES_OFFLINE) {
    const upState = state.upgrades[upDef.id];
    if (!upState || upState.level === 0) continue;
    eff += upDef.effect.value * upState.level;
  }

  for (const pDef of PRESTIGE_OFFLINE) {
    const level = state.prestigeUpgrades[pDef.id] ?? 0;
    if (level === 0) continue;
    eff += pDef.effect.value * level;
  }

  // Ascendancy path offline efficiency
  const pathOff = getAscendancyModifier('offlineEfficiency', state);
  if (pathOff > 0) {
    eff += pathOff;
  }

  // Singularity offline bonus
  for (const sgDef of SG_OFFLINE) {
    const level = state.singularityUpgrades[sgDef.id] ?? 0;
    if (level === 0) continue;
    eff += sgDef.effect.value * level;
  }

  return Math.min(eff, MAX_OFFLINE_EFFICIENCY);
}

export function calculateOfflineProgress(state: GameState, elapsedSeconds: number) {
  const maxOffline = 24 * 3600;
  const capped = Math.min(elapsedSeconds, maxOffline);
  const efficiency = getOfflineEfficiency(state);

  const fluxPerSec = getFluxPerSecond(state);
  const dataPerSec = getDataPerSecond(state);

  const fluxGained = fluxPerSec * capped * efficiency;
  const dataGained = dataPerSec * capped * efficiency;

  return { fluxGained, dataGained, timeAway: capped };
}

// ─── Expeditions ───

export function getAvailableGenerators(genId: string, state: GameState): number {
  const total = state.generators[genId]?.owned ?? 0;
  const assigned = state.expeditions.activeExpedition?.assignedGenerators[genId] ?? 0;
  return total - assigned;
}

export function isExpeditionZoneUnlocked(zoneId: string, state: GameState): boolean {
  const zone = ZONE_MAP.get(zoneId);
  if (!zone) return false;
  if (zone.unlockCondition.type === 'flux') {
    return state.totalFluxEarned >= zone.unlockCondition.value;
  }
  return state.prestigeCount >= zone.unlockCondition.value;
}

export function calculateExpeditionPower(assignedGens: Record<string, number>, state: GameState): number {
  let power = 0;
  for (const def of GENERATORS) {
    const count = assignedGens[def.id] ?? 0;
    if (count <= 0) continue;
    const genMult = getGeneratorMultiplier(def.id, state);
    const owned = state.generators[def.id]?.owned ?? 0;
    const milestoneMult = getMilestoneMultiplier(owned);
    power += def.baseProduction * count * genMult * milestoneMult;
  }
  return power;
}

export function getExpeditionSuccessChance(power: number, zoneDifficulty: number): number {
  return Math.min(100, (power / zoneDifficulty) * 100);
}

export function getProductionLossPercent(assignedGens: Record<string, number>, state: GameState): number {
  const totalFlux = getFluxPerSecond({ ...state, expeditions: { ...state.expeditions, activeExpedition: null } });
  if (totalFlux <= 0) return 0;

  let lostFlux = 0;
  const globalMult = getGlobalMultiplier(state);
  for (const def of GENERATORS) {
    const count = assignedGens[def.id] ?? 0;
    if (count <= 0) continue;
    const owned = state.generators[def.id]?.owned ?? 0;
    const genMult = getGeneratorMultiplier(def.id, state);
    const milestoneMult = getMilestoneMultiplier(owned);
    lostFlux += def.baseProduction * count * genMult * milestoneMult * globalMult;
  }

  return Math.min(100, (lostFlux / totalFlux) * 100);
}

export function generateExpeditionRewards(state: GameState): ExpeditionResult {
  const exp = state.expeditions.activeExpedition;
  if (!exp) {
    return { zoneId: '', zoneName: '', success: false, rewards: [], events: [], timestamp: Date.now() };
  }

  const zone = ZONE_MAP.get(exp.zoneId);
  if (!zone) {
    return { zoneId: exp.zoneId, zoneName: 'Unknown', success: false, rewards: [], events: exp.events, timestamp: Date.now() };
  }

  const successChance = getExpeditionSuccessChance(exp.power, zone.difficulty);
  const success = Math.random() * 100 < successChance;

  if (!success) {
    return {
      zoneId: exp.zoneId,
      zoneName: zone.name,
      success: false,
      rewards: [{ type: 'flux', amount: 0, label: 'Expedition failed — generators returned safely' }],
      events: exp.events,
      timestamp: Date.now(),
    };
  }

  const rewards: ExpeditionReward[] = [];
  const rewardMult = Math.max(1, exp.power / zone.difficulty);

  // Artifact bonus from Void Compass
  const hasCompass = state.expeditions.artifacts.includes('void_compass');
  const qualityBonus = hasCompass ? 1.1 : 1;

  // Data bonus from Data Scanner
  const hasScanner = state.expeditions.artifacts.includes('data_scanner');

  const fluxPerSec = getFluxPerSecond({ ...state, expeditions: { ...state.expeditions, activeExpedition: null } });

  for (const reward of zone.rewardTable) {
    if (Math.random() > reward.probability) continue;

    let amount: number;
    const base = reward.amountRange[0] + Math.random() * (reward.amountRange[1] - reward.amountRange[0]);

    switch (reward.type) {
      case 'flux': {
        // production_based: amount in "minutes of production"
        amount = Math.floor(fluxPerSec * base * 60 * rewardMult * qualityBonus);
        rewards.push({ type: 'flux', amount, label: `${Math.round(base)} minutes of flux production` });
        break;
      }
      case 'data': {
        amount = Math.floor(base * rewardMult * qualityBonus * (hasScanner ? 1.25 : 1));
        rewards.push({ type: 'data', amount, label: `${amount} data` });
        break;
      }
      case 'echoes': {
        amount = Math.floor(base * qualityBonus);
        rewards.push({ type: 'echoes', amount, label: `${amount} echoes` });
        break;
      }
      case 'temp_boost': {
        const boostMinutes = Math.floor(base) * 15;
        rewards.push({ type: 'temp_boost', amount: boostMinutes * 60, label: `×2 production for ${boostMinutes} minutes` });
        break;
      }
      case 'permanent_bonus': {
        amount = Math.floor(base * qualityBonus);
        rewards.push({ type: 'permanent_bonus', amount, label: `+${amount}% permanent production` });
        break;
      }
      case 'artifact': {
        // Find an artifact from this zone that hasn't been discovered
        const available = EXPEDITION_ARTIFACTS.filter(a => a.zoneId === zone.id && !state.expeditions.artifacts.includes(a.id));
        if (available.length > 0) {
          const art = available[Math.floor(Math.random() * available.length)];
          rewards.push({ type: 'artifact', amount: 1, label: `${art.name} — ${art.description}`, artifactId: art.id });
        }
        break;
      }
      case 'lore': {
        const availableLore = EXPEDITION_LORE.filter(l => l.zoneId === zone.id && !state.expeditions.discoveredLore.includes(l.id));
        if (availableLore.length > 0) {
          const lore = availableLore[Math.floor(Math.random() * availableLore.length)];
          rewards.push({ type: 'lore', amount: 1, label: lore.text, loreId: lore.id });
        }
        break;
      }
    }
  }

  // Guarantee at least some flux
  if (!rewards.some(r => r.type === 'flux')) {
    const amount = Math.floor(fluxPerSec * 30 * 60);
    rewards.push({ type: 'flux', amount, label: '30 minutes of flux production' });
  }

  return {
    zoneId: exp.zoneId,
    zoneName: zone.name,
    success: true,
    rewards,
    events: exp.events,
    timestamp: Date.now(),
  };
}

// ─── Prestige Upgrade Scaling Cost ───

/** Cost of buying the next level of a prestige upgrade (scales with level) */
export function getPrestigeUpgradeCost(baseCost: number, currentLevel: number): number {
  return baseCost * (currentLevel + 1);
}

/** Total echoes spent on a prestige upgrade at a given level */
export function getPrestigeUpgradeTotalCost(baseCost: number, level: number): number {
  // Sum of baseCost * (1 + 2 + ... + level) = baseCost * level * (level + 1) / 2
  return baseCost * level * (level + 1) / 2;
}

// ─── Ascendancy Path Helpers ───

export function getAscendancyModifier(stat: keyof NonNullable<typeof ASCENDANCY_PATHS[number]['modifiers']>, state: GameState): number {
  const pathId = state.ascendancy.activePath;
  if (!pathId) return stat === 'offlineEfficiency' ? 0 : 1;
  const path = PATH_MAP.get(pathId);
  if (!path) return stat === 'offlineEfficiency' ? 0 : 1;
  return path.modifiers[stat] ?? (stat === 'offlineEfficiency' ? 0 : 1);
}

export function getPathMasteryBonus(mastery: number): number {
  return getMasteryTier(mastery).bonus;
}

// ─── Void Shard (Second Prestige) ───

export function getVoidShardGain(state: GameState): number {
  if (state.totalEchoes < 100) return 0;
  // sqrt-based scaling: 100 echoes→1, 400→2, 900→3, 2500→5, 10000→10
  let base = Math.floor(Math.sqrt(state.totalEchoes / 100));
  if (base < 1) base = 0;

  // Shard gain bonus from void shard upgrades
  for (const vsDef of VS_SHARD_GAIN) {
    const level = state.voidShardUpgrades[vsDef.id] ?? 0;
    if (level === 0) continue;
    base = Math.floor(base * (1 + vsDef.effect.value * level));
  }

  // Singularity shard multiplier
  for (const sgDef of SG_SHARD_MULT) {
    const level = state.singularityUpgrades[sgDef.id] ?? 0;
    if (level === 0) continue;
    base = Math.floor(base * Math.pow(sgDef.effect.value, level));
  }

  return base;
}

export function isVoidCollapseUnlocked(state: GameState): boolean {
  if (state.voidCollapseCount > 0 || state.voidShards > 0 || state.totalVoidShards > 0) return true;
  const collapseTheory = state.research['r_void_collapse'];
  return collapseTheory?.completed === true;
}

// ─── Singularity (Third Prestige) ───

export function getRealityFragmentGain(state: GameState): number {
  if (state.totalVoidShards < 10) return 0;
  // sqrt-based scaling: 10 shards→1, 40→2, 90→3, 250→5
  let base = Math.floor(Math.sqrt(state.totalVoidShards / 10));
  if (base < 1) base = 0;

  // Fragment gain bonus from singularity upgrades
  for (const sgDef of SG_FRAGMENT_GAIN) {
    const level = state.singularityUpgrades[sgDef.id] ?? 0;
    if (level === 0) continue;
    base = Math.floor(base * (1 + sgDef.effect.value * level));
  }

  return base;
}

export function isSingularityUnlocked(state: GameState): boolean {
  if (state.singularityCount > 0 || state.realityFragments > 0 || state.totalRealityFragments > 0) return true;
  if (state.voidCollapseCount < SINGULARITY_COLLAPSE_THRESHOLD) return false;
  const masteryValues = Object.values(state.ascendancy.pathMastery);
  return masteryValues.some(m => m >= SINGULARITY_MASTERY_THRESHOLD);
}

// ─── Tick Speed (Singularity) ───

export function getTickSpeedMultiplier(state: GameState): number {
  let mult = 1;
  for (const sgDef of SG_TICK_SPEED) {
    const level = state.singularityUpgrades[sgDef.id] ?? 0;
    if (level === 0) continue;
    mult += sgDef.effect.value * level;
  }
  return mult;
}
