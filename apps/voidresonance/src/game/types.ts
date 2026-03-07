// ─── Core Game Types ───

export interface GeneratorDef {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  costGrowth: number;
  baseProduction: number;
  unlockAt: number;
  tier: number;
}

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  costResource: ResourceKind;
  unlockAt: number;
  effect: UpgradeEffect;
  maxLevel: number;
  flavorText?: string;
}

export type ResourceKind = 'flux' | 'data' | 'cores';

export interface UpgradeEffect {
  type: 'generatorMultiplier' | 'globalMultiplier' | 'clickMultiplier' | 'clickFlat' | 'clickPercent' | 'offlineEfficiency' | 'researchSpeed';
  targetId?: string;
  value: number;
}

export interface ResearchNodeDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  costResource: ResourceKind;
  duration: number;
  unlockAt: number;
  requires?: string[];
  effect: ResearchEffect;
  flavorText?: string;
}

export interface ResearchEffect {
  type: 'generatorMultiplier' | 'globalMultiplier' | 'unlockSystem' | 'clickMultiplier' | 'dataRate' | 'prestigeBonus' | 'unlockAnalytics';
  targetId?: string;
  value: number;
}

export interface PrestigeUpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  maxLevel: number;
  effect: PrestigeEffect;
}

export interface PrestigeEffect {
  type: 'startingFlux' | 'productionMultiplier' | 'costReduction' | 'clickPower' | 'offlineBonus' | 'echoGainBonus' | 'unlockFeature' | 'dataRateBonus' | 'researchSpeedBonus' | 'researchTapBonus' | 'riftFrequency';
  value: number;
}

// ─── Research Extensions ───

export interface ResearchNodeDefExtended extends ResearchNodeDef {
  branch?: 'production' | 'data' | 'active' | 'prestige' | 'synergy';
  mutuallyExclusive?: string;
}

// ─── Void Shard Types (Second Prestige) ───

export interface VoidShardUpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  maxLevel: number;
  effect: VoidShardEffect;
}

export interface VoidShardEffect {
  type: 'startingFlux' | 'echoMultiplier' | 'researchSpeed' | 'startingGenerators' | 'productionMultiplier' | 'riftFrequency' | 'shardGainBonus' | 'unlockFeature';
  value: number;
}

// ─── Ascendancy Types ───

export type AscendancyPathId = 'architect' | 'channeler' | 'observer';

export interface AscendancyPathDef {
  id: AscendancyPathId;
  name: string;
  title: string;
  philosophy: string;
  color: { primary: string; secondary: string };
  modifiers: {
    productionMult?: number;
    clickMult?: number;
    generatorCostMult?: number;
    offlineEfficiency?: number;
    dataRateMult?: number;
    researchSpeedMult?: number;
  };
}

export interface AscendancyState {
  activePath: AscendancyPathId | null;
  pathMastery: Record<string, number>;
}

export const DEFAULT_ASCENDANCY_STATE: AscendancyState = {
  activePath: null,
  pathMastery: {},
};

// ─── Singularity Types (Third Prestige) ───

export interface SingularityUpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  maxLevel: number;
  branch: 'temporal' | 'dimensional' | 'meta';
  effect: SingularityEffect;
}

export interface SingularityEffect {
  type: 'tickSpeed' | 'productionMultiplier' | 'offlineBonus' | 'echoMultiplier' | 'shardMultiplier' | 'fragmentGainBonus' | 'unlockFeature';
  value: number;
}

export interface EventMessage {
  id: string;
  text: string;
  unlockAt: number;
  category: 'log' | 'discovery' | 'anomaly' | 'system';
}

// ─── Expedition Types ───

export interface ExpeditionZoneDef {
  id: string;
  name: string;
  description: string;
  flavorText: string;
  difficulty: number;
  minDuration: number; // seconds
  maxDuration: number; // seconds
  unlockCondition: { type: 'flux' | 'prestige'; value: number };
  rewardTable: ExpeditionRewardDef[];
  eventPool: ExpeditionEventDef[];
}

export interface ExpeditionRewardDef {
  id: string;
  type: 'flux' | 'data' | 'echoes' | 'temp_boost' | 'permanent_bonus' | 'artifact' | 'lore';
  probability: number;
  amountRange: [number, number];
  scaling: 'flat' | 'production_based' | 'power_based';
}

export interface ExpeditionEventDef {
  id: string;
  text: string;
  effect: 'power_bonus' | 'power_penalty' | 'bonus_reward' | 'flavor';
  value: number;
  probability: number;
}

export interface ExpeditionArtifactDef {
  id: string;
  name: string;
  description: string;
  effect: string;
  zoneId: string;
  icon: string;
}

export interface ExpeditionLoreDef {
  id: string;
  text: string;
  zoneId: string;
}

export interface ActiveExpedition {
  zoneId: string;
  assignedGenerators: Record<string, number>; // genId -> count assigned
  startedAt: number; // timestamp in ms
  duration: number; // seconds
  power: number;
  events: string[]; // event IDs that occurred
  nextEventCheck: number; // timestamp for next event roll
}

export interface ExpeditionReward {
  type: 'flux' | 'data' | 'echoes' | 'temp_boost' | 'permanent_bonus' | 'artifact' | 'lore';
  amount: number;
  label: string;
  artifactId?: string;
  loreId?: string;
}

export interface ExpeditionResult {
  zoneId: string;
  zoneName: string;
  success: boolean;
  rewards: ExpeditionReward[];
  events: string[];
  timestamp: number;
}

export interface ExpeditionState {
  activeExpedition: ActiveExpedition | null;
  completedCount: number;
  artifacts: string[]; // discovered artifact IDs
  discoveredLore: string[];
  pendingResult: ExpeditionResult | null;
  permanentBonus: number; // accumulated permanent production bonus
  tempBoostEnd: number; // timestamp when temp boost ends (0 = none)
}

// ─── Runtime State ───

export interface GeneratorState {
  owned: number;
}

export interface UpgradeState {
  level: number;
}

export interface ResearchState {
  completed: boolean;
  progress: number;
}

export interface GameState {
  flux: number;
  totalFluxEarned: number;
  data: number;
  totalDataEarned: number;
  cores: number;
  generators: Record<string, GeneratorState>;
  upgrades: Record<string, UpgradeState>;
  research: Record<string, ResearchState>;
  activeResearchId: string | null;
  echoes: number;
  totalEchoes: number;
  prestigeCount: number;
  prestigeUpgrades: Record<string, number>;
  seenEvents: string[];
  totalClicks: number;
  totalTimePlayed: number;
  lastSaveTimestamp: number;
  saveVersion: number;
  isPremium: boolean;
  autoBuyEnabled: boolean;
  buyMode: 1 | 10 | 100 | -1;
  activeTab: 'generators' | 'upgrades' | 'research' | 'prestige' | 'events' | 'settings';
  offlineReport: OfflineReport | null;
  // Achievements & stats
  unlockedAchievements: string[];
  unlockedStats: string[];
  maxCombo: number;
  frenzyCount: number;
  riftsClicked: number;
  // Expeditions
  expeditions: ExpeditionState;
  // Second prestige — Void Shards
  voidShards: number;
  totalVoidShards: number;
  voidCollapseCount: number;
  voidShardUpgrades: Record<string, number>;
  // Ascendancy Paths
  ascendancy: AscendancyState;
  // Third prestige — Singularity
  realityFragments: number;
  totalRealityFragments: number;
  singularityCount: number;
  singularityUpgrades: Record<string, number>;
}

export interface OfflineReport {
  timeAway: number;
  fluxGained: number;
  dataGained: number;
}

export const SAVE_VERSION = 1;

export const DEFAULT_EXPEDITION_STATE: ExpeditionState = {
  activeExpedition: null,
  completedCount: 0,
  artifacts: [],
  discoveredLore: [],
  pendingResult: null,
  permanentBonus: 0,
  tempBoostEnd: 0,
};

export const DEFAULT_STATE: GameState = {
  flux: 0,
  totalFluxEarned: 0,
  data: 0,
  totalDataEarned: 0,
  cores: 0,
  generators: {},
  upgrades: {},
  research: {},
  activeResearchId: null,
  echoes: 0,
  totalEchoes: 0,
  prestigeCount: 0,
  prestigeUpgrades: {},
  seenEvents: [],
  totalClicks: 0,
  totalTimePlayed: 0,
  lastSaveTimestamp: Date.now(),
  saveVersion: SAVE_VERSION,
  isPremium: false,
  autoBuyEnabled: false,
  buyMode: 1,
  activeTab: 'generators',
  offlineReport: null,
  unlockedAchievements: [],
  unlockedStats: [],
  maxCombo: 0,
  frenzyCount: 0,
  riftsClicked: 0,
  expeditions: { ...DEFAULT_EXPEDITION_STATE },
  // Second prestige
  voidShards: 0,
  totalVoidShards: 0,
  voidCollapseCount: 0,
  voidShardUpgrades: {},
  // Ascendancy
  ascendancy: { ...DEFAULT_ASCENDANCY_STATE },
  // Third prestige
  realityFragments: 0,
  totalRealityFragments: 0,
  singularityCount: 0,
  singularityUpgrades: {},
};
