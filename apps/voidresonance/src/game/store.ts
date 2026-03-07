import { create } from 'zustand';
import { DEFAULT_STATE, SAVE_VERSION } from './types';
import type { GameState, OfflineReport, AscendancyPathId } from './types';
import { GENERATORS } from '../config/generators';
import { UPGRADES } from '../config/upgrades';
import { RESEARCH_NODES } from '../config/research';
import { PRESTIGE_UPGRADES } from '../config/prestige';
import { VOID_SHARD_UPGRADES } from '../config/voidShards';
import { SINGULARITY_UPGRADES } from '../config/singularity';
import { EXPEDITION_ZONES } from '../config/expeditions';
import { EVENTS } from '../config/events';
import { STAT_UNLOCKS } from '../config/stats';
import { ACHIEVEMENTS } from '../config/achievements';
import type { AchievementStats } from '../config/achievements';
import { resetEntityStore } from '../components/reactor/entityStore';
import { triggerPrestigeAnimation } from '../components/prestigeAnimationTrigger';
import {
  getBulkCost,
  getMaxBuyable,
  getGeneratorCost,
  getUpgradeCost,
  getFluxPerSecond,
  getClickValue,
  getDataPerSecond,
  getResearchSpeed,
  canStartResearch,
  getEchoGain,
  isPrestigeUnlocked,
  calculateOfflineProgress,
  calculateExpeditionPower,
  generateExpeditionRewards,
  getPrestigeUpgradeCost,
  getPrestigeUpgradeTotalCost,
  getVoidShardGain,
  isVoidCollapseUnlocked,
  getRealityFragmentGain,
  isSingularityUnlocked,
  getTickSpeedMultiplier,
} from './engine';

const SAVE_KEY = 'clickerspace_save';
const AUTO_SAVE_INTERVAL = 10_000;

function checkAllGeneratorsMilestone(prevOwned: number, newGens: Record<string, { owned: number }>) {
  if (prevOwned === 0 && GENERATORS.every(g => (newGens[g.id]?.owned ?? 0) > 0)) {
    triggerPrestigeAnimation('allGenerators', {
      details: [`${GENERATORS.length} generator types acquired`, 'Maximum void coverage achieved'],
    });
  }
}

export interface GameActions {
  tick: (dt: number) => void;
  clickFlux: () => void;
  buyGenerator: (id: string) => void;
  setBuyMode: (mode: 1 | 10 | 100 | -1) => void;
  buyUpgrade: (id: string) => void;
  startResearch: (id: string) => void;
  smashResearch: () => number;
  prestige: () => void;
  buyPrestigeUpgrade: (id: string) => void;
  saveGame: () => void;
  loadGame: () => void;
  exportSave: () => void;
  importSave: (json: string) => boolean;
  resetGame: () => void;
  setActiveTab: (tab: GameState['activeTab']) => void;
  dismissOfflineReport: () => void;
  togglePremium: () => void;
  toggleAutoBuy: () => void;
  buyStatUnlock: (id: string) => void;
  checkAchievements: () => void;
  respecPrestige: () => void;
  // Expeditions
  startExpedition: (zoneId: string, assignedGens: Record<string, number>, duration: number) => void;
  checkExpeditionCompletion: () => void;
  collectExpeditionRewards: () => void;
  dismissExpeditionResult: () => void;
  // Second prestige — Void Shards
  voidCollapse: () => void;
  buyVoidShardUpgrade: (id: string) => void;
  respecVoidShards: () => void;
  // Ascendancy
  chooseAscendancyPath: (pathId: AscendancyPathId) => void;
  // Third prestige — Singularity
  singularity: () => void;
  buySingularityUpgrade: (id: string) => void;
}

export type GameStore = GameState & GameActions;

export const useGameStore = create<GameStore>((set, get) => ({
  ...DEFAULT_STATE,

  tick: (dt: number) => {
    set((state) => {
      // Apply singularity tick speed
      const tickMult = getTickSpeedMultiplier(state);
      const effectiveDt = dt * tickMult;

      const fluxPerSec = getFluxPerSecond(state);
      const dataPerSec = getDataPerSecond(state);
      const fluxGain = fluxPerSec * effectiveDt;
      const dataGain = dataPerSec * effectiveDt;

      let newResearch = state.research;
      let activeResearchId = state.activeResearchId;

      if (activeResearchId) {
        const rDef = RESEARCH_NODES.find(r => r.id === activeResearchId);
        if (rDef) {
          const rState = newResearch[activeResearchId] ?? { completed: false, progress: 0 };
          const speed = getResearchSpeed(state);
          const newProgress = rState.progress + effectiveDt * speed;
          if (newProgress >= rDef.duration) {
            newResearch = {
              ...newResearch,
              [activeResearchId]: { completed: true, progress: rDef.duration },
            };
            // Fire system-unlock animation for milestone research
            if (rDef.effect?.type === 'unlockSystem') {
              setTimeout(() => triggerPrestigeAnimation('systemUnlock', {
                details: [rDef.name, rDef.description],
              }), 0);
            }
            activeResearchId = null;
          } else {
            newResearch = {
              ...newResearch,
              [activeResearchId]: { ...rState, progress: newProgress },
            };
          }
        }
      }

      // Only scan events if there are undiscovered ones remaining
      let newSeen = state.seenEvents;
      if (newSeen.length < EVENTS.length) {
        for (const evt of EVENTS) {
          if (evt.id === 'e28') continue;
          if (!newSeen.includes(evt.id) && state.totalFluxEarned + fluxGain >= evt.unlockAt) {
            if (newSeen === state.seenEvents) newSeen = [...state.seenEvents];
            newSeen.push(evt.id);
          }
        }
      }

      // Auto-buy: premium feature — max-buy best-value generator (throttled)
      let newFlux = state.flux + fluxGain;
      let newGenerators = state.generators;
      const autoBuyCooldown = (state as any)._autoBuyCooldown ?? 0;
      if (state.isPremium && state.autoBuyEnabled && autoBuyCooldown <= 0) {
        // Find generator with best production-per-cost ratio
        let bestDef = null;
        let bestValue = 0;
        for (const def of GENERATORS) {
          if (state.totalFluxEarned + fluxGain < def.unlockAt) continue;
          const owned = newGenerators[def.id]?.owned ?? 0;
          const cost = getGeneratorCost(def, owned, state);
          if (cost > newFlux) continue;
          const value = def.baseProduction / cost;
          if (value > bestValue) {
            bestValue = value;
            bestDef = def;
          }
        }
        if (bestDef) {
          const owned = newGenerators[bestDef.id]?.owned ?? 0;
          const count = getMaxBuyable(bestDef, owned, newFlux, state);
          if (count > 0) {
            const totalCost = getBulkCost(bestDef, owned, count, state);
            newFlux -= totalCost;
            newGenerators = {
              ...newGenerators,
              [bestDef.id]: { owned: owned + count },
            };
          }
        }
      }

      // Check temp boost expiry — tempBoostEnd stores a Date.now() based timestamp
      // This runs from the tick which is inside useEffect, not during render
      let newExpeditions = state.expeditions;
      if (state.expeditions.tempBoostEnd > 0) {
        const tickNow = Date.now();
        if (tickNow > state.expeditions.tempBoostEnd) {
          newExpeditions = { ...state.expeditions, tempBoostEnd: 0 };
        }
      }

      return {
        flux: newFlux,
        totalFluxEarned: state.totalFluxEarned + fluxGain,
        data: state.data + dataGain,
        totalDataEarned: state.totalDataEarned + dataGain,
        totalTimePlayed: state.totalTimePlayed + effectiveDt,
        research: newResearch,
        activeResearchId,
        seenEvents: newSeen,
        generators: newGenerators,
        expeditions: newExpeditions,
        _autoBuyCooldown: (state.isPremium && state.autoBuyEnabled)
          ? (autoBuyCooldown <= 0 ? 0.1 : autoBuyCooldown - dt)
          : 0,
      };
    });
  },

  clickFlux: () => {
    set((state) => {
      const value = getClickValue(state);
      return {
        flux: state.flux + value,
        totalFluxEarned: state.totalFluxEarned + value,
        totalClicks: state.totalClicks + 1,
      };
    });
  },

  buyGenerator: (id: string) => {
    const state = get();
    const def = GENERATORS.find(g => g.id === id);
    if (!def) return;

    const owned = state.generators[id]?.owned ?? 0;
    const buyMode = state.buyMode;

    let count: number;
    if (buyMode === -1) {
      count = getMaxBuyable(def, owned, state.flux, state);
    } else {
      count = buyMode;
    }

    if (count <= 0) return;

    const totalCost = getBulkCost(def, owned, count, state);
    if (state.flux < totalCost) {
      count = getMaxBuyable(def, owned, state.flux, state);
      if (count <= 0) return;
      const adjustedCost = getBulkCost(def, owned, count, state);
      const newGens = { ...state.generators, [id]: { owned: owned + count } };
      set({ flux: state.flux - adjustedCost, generators: newGens });
      checkAllGeneratorsMilestone(owned, newGens);
      return;
    }

    const newGens = { ...state.generators, [id]: { owned: owned + count } };
    set({ flux: state.flux - totalCost, generators: newGens });
    checkAllGeneratorsMilestone(owned, newGens);
  },

  setBuyMode: (mode) => set({ buyMode: mode }),

  buyUpgrade: (id: string) => {
    const state = get();
    const def = UPGRADES.find(u => u.id === id);
    if (!def) return;

    const currentLevel = state.upgrades[id]?.level ?? 0;
    if (currentLevel >= def.maxLevel) return;

    const cost = getUpgradeCost(def, currentLevel);
    const resource = def.costResource === 'data' ? state.data : state.flux;
    if (resource < cost) return;

    const updates: Partial<GameState> = {
      upgrades: {
        ...state.upgrades,
        [id]: { level: currentLevel + 1 },
      },
    };

    if (def.costResource === 'data') {
      updates.data = state.data - cost;
    } else {
      updates.flux = state.flux - cost;
    }

    set(updates);
  },

  startResearch: (id: string) => {
    const state = get();
    if (state.activeResearchId) return;

    const def = RESEARCH_NODES.find(r => r.id === id);
    if (!def) return;
    if (!canStartResearch(def, state)) return;

    const updates: Partial<GameState> = {
      activeResearchId: id,
      research: {
        ...state.research,
        [id]: { completed: false, progress: 0 },
      },
    };

    if (def.costResource === 'data') {
      updates.data = state.data - def.cost;
    } else {
      updates.flux = state.flux - def.cost;
    }

    set(updates);
  },

  smashResearch: () => {
    const state = get();
    if (!state.activeResearchId) return 0;

    const rDef = RESEARCH_NODES.find(r => r.id === state.activeResearchId);
    if (!rDef) return 0;

    const rState = state.research[state.activeResearchId];
    if (!rState || rState.completed) return 0;

    const speed = getResearchSpeed(state);
    // Each smash adds 0.5-1.0 seconds of research progress
    let smashBoost = (0.5 + speed * 0.3);

    // Prestige research tap bonus
    for (const pDef of PRESTIGE_UPGRADES) {
      const level = state.prestigeUpgrades[pDef.id] ?? 0;
      if (level === 0) continue;
      if (pDef.effect.type === 'researchTapBonus') {
        smashBoost *= 1 + pDef.effect.value * level;
      }
    }

    const newProgress = rState.progress + smashBoost;

    if (newProgress >= rDef.duration) {
      set({
        research: {
          ...state.research,
          [state.activeResearchId]: { completed: true, progress: rDef.duration },
        },
        activeResearchId: null,
      });
    } else {
      set({
        research: {
          ...state.research,
          [state.activeResearchId]: { ...rState, progress: newProgress },
        },
      });
    }

    return smashBoost;
  },

  prestige: () => {
    const state = get();
    if (!isPrestigeUnlocked(state)) return;

    const echoGain = getEchoGain(state);
    if (echoGain <= 0) return;

    resetEntityStore();

    let startingFlux = 0;
    for (const pDef of PRESTIGE_UPGRADES) {
      const level = state.prestigeUpgrades[pDef.id] ?? 0;
      if (level === 0) continue;
      if (pDef.effect.type === 'startingFlux') {
        startingFlux += pDef.effect.value * level;
      }
    }

    set({
      flux: startingFlux,
      totalFluxEarned: 0,
      data: 0,
      totalDataEarned: 0,
      cores: 0,
      generators: {},
      upgrades: {},
      research: {},
      activeResearchId: null,
      echoes: state.echoes + echoGain,
      totalEchoes: state.totalEchoes + echoGain,
      prestigeCount: state.prestigeCount + 1,
      seenEvents: ['e28'],
      totalClicks: 0,
      activeTab: 'generators',
      offlineReport: null,
      // Preserve permanent expedition progress, cancel active
      expeditions: {
        ...state.expeditions,
        activeExpedition: null,
        pendingResult: null,
      },
      autoBuyEnabled: false,
    });
  },

  buyPrestigeUpgrade: (id: string) => {
    const state = get();
    const def = PRESTIGE_UPGRADES.find(p => p.id === id);
    if (!def) return;

    if (def.id === 'p_premium_bonus' && !state.isPremium) return;

    const currentLevel = state.prestigeUpgrades[id] ?? 0;
    if (currentLevel >= def.maxLevel) return;

    const cost = getPrestigeUpgradeCost(def.cost, currentLevel);
    if (state.echoes < cost) return;

    set({
      echoes: state.echoes - cost,
      prestigeUpgrades: {
        ...state.prestigeUpgrades,
        [id]: currentLevel + 1,
      },
    });
  },

  saveGame: () => {
    const state = get();
    const saveData: GameState = {
      flux: state.flux,
      totalFluxEarned: state.totalFluxEarned,
      data: state.data,
      totalDataEarned: state.totalDataEarned,
      cores: state.cores,
      generators: state.generators,
      upgrades: state.upgrades,
      research: state.research,
      activeResearchId: state.activeResearchId,
      echoes: state.echoes,
      totalEchoes: state.totalEchoes,
      prestigeCount: state.prestigeCount,
      prestigeUpgrades: state.prestigeUpgrades,
      seenEvents: state.seenEvents,
      totalClicks: state.totalClicks,
      totalTimePlayed: state.totalTimePlayed,
      lastSaveTimestamp: Date.now(),
      saveVersion: SAVE_VERSION,
      isPremium: state.isPremium,
      autoBuyEnabled: state.autoBuyEnabled,
      buyMode: state.buyMode,
      activeTab: state.activeTab,
      offlineReport: null,
      unlockedAchievements: state.unlockedAchievements,
      unlockedStats: state.unlockedStats,
      maxCombo: state.maxCombo,
      frenzyCount: state.frenzyCount,
      riftsClicked: state.riftsClicked,
      expeditions: state.expeditions,
      // Second prestige
      voidShards: state.voidShards,
      totalVoidShards: state.totalVoidShards,
      voidCollapseCount: state.voidCollapseCount,
      voidShardUpgrades: state.voidShardUpgrades,
      // Ascendancy
      ascendancy: state.ascendancy,
      // Third prestige
      realityFragments: state.realityFragments,
      totalRealityFragments: state.totalRealityFragments,
      singularityCount: state.singularityCount,
      singularityUpgrades: state.singularityUpgrades,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
  },

  loadGame: () => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;

      const saved = JSON.parse(raw) as Partial<GameState>;

      if (saved.lastSaveTimestamp) {
        const elapsed = (Date.now() - saved.lastSaveTimestamp) / 1000;
        if (elapsed > 5) {
          const mergedState = { ...DEFAULT_STATE, ...saved };
          const offline = calculateOfflineProgress(mergedState as GameState, elapsed);

          const report: OfflineReport = {
            timeAway: offline.timeAway,
            fluxGained: offline.fluxGained,
            dataGained: offline.dataGained,
          };

          set({
            ...mergedState,
            flux: (mergedState.flux ?? 0) + offline.fluxGained,
            totalFluxEarned: (mergedState.totalFluxEarned ?? 0) + offline.fluxGained,
            data: (mergedState.data ?? 0) + offline.dataGained,
            totalDataEarned: (mergedState.totalDataEarned ?? 0) + offline.dataGained,
            offlineReport: report,
            lastSaveTimestamp: Date.now(),
          });
          return;
        }
      }

      set({ ...DEFAULT_STATE, ...saved, lastSaveTimestamp: Date.now() });
    } catch {
      console.error('Failed to load save');
    }
  },

  exportSave: () => {
    const state = get();
    state.saveGame();
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;

    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clickerspace-save-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importSave: (json: string): boolean => {
    try {
      const parsed = JSON.parse(json) as Partial<GameState>;
      if (!parsed.saveVersion) return false;
      set({ ...DEFAULT_STATE, ...parsed, lastSaveTimestamp: Date.now() });
      get().saveGame();
      return true;
    } catch {
      return false;
    }
  },

  resetGame: () => {
    localStorage.removeItem(SAVE_KEY);
    set({ ...DEFAULT_STATE, lastSaveTimestamp: Date.now() });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  dismissOfflineReport: () => set({ offlineReport: null }),

  togglePremium: () => set((state) => ({ isPremium: !state.isPremium })),

  toggleAutoBuy: () => set((state) => ({ autoBuyEnabled: !state.autoBuyEnabled })),

  buyStatUnlock: (id: string) => {
    const state = get();
    if (state.unlockedStats.includes(id)) return;
    const def = STAT_UNLOCKS.find(s => s.id === id);
    if (!def) return;
    const resource = def.costResource === 'data' ? state.data : state.flux;
    if (resource < def.cost) return;
    const updates: Partial<GameState> = {
      unlockedStats: [...state.unlockedStats, id],
    };
    if (def.costResource === 'data') {
      updates.data = state.data - def.cost;
    } else {
      updates.flux = state.flux - def.cost;
    }
    set(updates);
  },

  checkAchievements: () => {
    const state = get();
    const totalOwned = Object.values(state.generators).reduce((s, g) => s + g.owned, 0);
    const researchCompleted = Object.values(state.research).filter(r => r.completed).length;
    const stats: AchievementStats = {
      totalFluxEarned: state.totalFluxEarned,
      totalClicks: state.totalClicks,
      totalTimePlayed: state.totalTimePlayed,
      totalDataEarned: state.totalDataEarned,
      totalOwned,
      prestigeCount: state.prestigeCount,
      researchCompleted,
      eventsUnlocked: state.seenEvents.length,
      maxCombo: state.maxCombo,
      frenzyCount: state.frenzyCount,
      riftsClicked: state.riftsClicked,
    };
    const newUnlocks: string[] = [];
    for (const ach of ACHIEVEMENTS) {
      if (state.unlockedAchievements.includes(ach.id)) continue;
      if (ach.check(stats)) {
        newUnlocks.push(ach.id);
      }
    }
    if (newUnlocks.length > 0) {
      set({
        unlockedAchievements: [...state.unlockedAchievements, ...newUnlocks],
      });
    }
  },

  respecPrestige: () => {
    const state = get();
    // Calculate total echoes spent on prestige upgrades (scaling cost)
    let refund = 0;
    for (const pDef of PRESTIGE_UPGRADES) {
      const level = state.prestigeUpgrades[pDef.id] ?? 0;
      refund += getPrestigeUpgradeTotalCost(pDef.cost, level);
    }
    set({
      echoes: state.echoes + refund,
      prestigeUpgrades: {},
    });
  },

  // ─── Expeditions ───

  startExpedition: (zoneId: string, assignedGens: Record<string, number>, duration: number) => {
    const state = get();
    if (state.expeditions.activeExpedition) return; // already have one

    const zone = EXPEDITION_ZONES.find(z => z.id === zoneId);
    if (!zone) return;

    // Validate assigned generators don't exceed owned
    for (const genId of Object.keys(assignedGens)) {
      const owned = state.generators[genId]?.owned ?? 0;
      if (assignedGens[genId] > owned) return;
    }

    // Validate at least one generator assigned
    const totalAssigned = Object.values(assignedGens).reduce((s, c) => s + c, 0);
    if (totalAssigned <= 0) return;

    const power = calculateExpeditionPower(assignedGens, state);
    const now = Date.now();

    set({
      expeditions: {
        ...state.expeditions,
        activeExpedition: {
          zoneId,
          assignedGenerators: assignedGens,
          startedAt: now,
          duration,
          power,
          events: [],
          nextEventCheck: now + 30_000 + Math.random() * 30_000,
        },
      },
    });
  },

  checkExpeditionCompletion: () => {
    const state = get();
    const exp = state.expeditions.activeExpedition;
    if (!exp) return;

    const now = Date.now();
    const elapsed = (now - exp.startedAt) / 1000;

    // Roll for random events
    if (now >= exp.nextEventCheck) {
      const zone = EXPEDITION_ZONES.find(z => z.id === exp.zoneId);
      if (zone) {
        const newEvents = [...exp.events];
        for (const evt of zone.eventPool) {
          if (Math.random() < evt.probability && !newEvents.includes(evt.id)) {
            newEvents.push(evt.id);
            break; // One event per check
          }
        }
        set({
          expeditions: {
            ...state.expeditions,
            activeExpedition: {
              ...exp,
              events: newEvents,
              nextEventCheck: now + 30_000 + Math.random() * 30_000,
            },
          },
        });
      }
    }

    // Check completion
    if (elapsed >= exp.duration) {
      const result = generateExpeditionRewards(get());
      set({
        expeditions: {
          ...get().expeditions,
          pendingResult: result,
          activeExpedition: null,
        },
      });
    }
  },

  collectExpeditionRewards: () => {
    const state = get();
    const result = state.expeditions.pendingResult;
    if (!result) return;

    let fluxGain = 0;
    let dataGain = 0;
    let echoGain = 0;
    let permBonus = 0;
    let tempBoostEnd = state.expeditions.tempBoostEnd;
    const newArtifacts = [...state.expeditions.artifacts];
    const newLore = [...state.expeditions.discoveredLore];

    for (const reward of result.rewards) {
      switch (reward.type) {
        case 'flux':
          fluxGain += reward.amount;
          break;
        case 'data':
          dataGain += reward.amount;
          break;
        case 'echoes':
          echoGain += reward.amount;
          break;
        case 'permanent_bonus':
          permBonus += reward.amount;
          break;
        case 'temp_boost':
          tempBoostEnd = Date.now() + reward.amount * 1000;
          break;
        case 'artifact': {
          if (reward.artifactId && !newArtifacts.includes(reward.artifactId)) {
            newArtifacts.push(reward.artifactId);
          }
          break;
        }
        case 'lore': {
          if (reward.loreId && !newLore.includes(reward.loreId)) {
            newLore.push(reward.loreId);
          }
          break;
        }
      }
    }

    set({
      flux: state.flux + fluxGain,
      totalFluxEarned: state.totalFluxEarned + fluxGain,
      data: state.data + dataGain,
      totalDataEarned: state.totalDataEarned + dataGain,
      echoes: state.echoes + echoGain,
      totalEchoes: state.totalEchoes + echoGain,
      expeditions: {
        ...state.expeditions,
        pendingResult: null,
        completedCount: state.expeditions.completedCount + 1,
        permanentBonus: state.expeditions.permanentBonus + permBonus,
        tempBoostEnd,
        artifacts: newArtifacts,
        discoveredLore: newLore,
      },
    });
  },

  dismissExpeditionResult: () => {
    set((state) => ({
      expeditions: {
        ...state.expeditions,
        pendingResult: null,
      },
    }));
  },

  // ─── Void Collapse (Second Prestige) ───

  voidCollapse: () => {
    const state = get();
    if (!isVoidCollapseUnlocked(state)) return;

    const shardGain = getVoidShardGain(state);
    if (shardGain <= 0) return;

    resetEntityStore();

    // Track path mastery
    const newMastery = { ...state.ascendancy.pathMastery };
    if (state.ascendancy.activePath) {
      newMastery[state.ascendancy.activePath] = (newMastery[state.ascendancy.activePath] ?? 0) + 1;
    }

    set({
      // Reset run progress
      flux: 0,
      totalFluxEarned: 0,
      data: 0,
      totalDataEarned: 0,
      cores: 0,
      generators: {},
      upgrades: {},
      research: {},
      activeResearchId: null,
      // Reset first prestige
      echoes: 0,
      totalEchoes: 0,
      prestigeCount: 0,
      prestigeUpgrades: {},
      // Award void shards
      voidShards: state.voidShards + shardGain,
      totalVoidShards: state.totalVoidShards + shardGain,
      voidCollapseCount: state.voidCollapseCount + 1,
      // Reset run state
      seenEvents: ['e28'],
      totalClicks: 0,
      activeTab: 'generators',
      offlineReport: null,
      autoBuyEnabled: false,
      // Reset expeditions
      expeditions: {
        ...state.expeditions,
        activeExpedition: null,
        pendingResult: null,
      },
      // Update path mastery
      ascendancy: {
        activePath: null, // Must choose again
        pathMastery: newMastery,
      },
    });
  },

  buyVoidShardUpgrade: (id: string) => {
    const state = get();
    const def = VOID_SHARD_UPGRADES.find(v => v.id === id);
    if (!def) return;

    const currentLevel = state.voidShardUpgrades[id] ?? 0;
    if (currentLevel >= def.maxLevel) return;
    if (state.voidShards < def.cost) return;

    set({
      voidShards: state.voidShards - def.cost,
      voidShardUpgrades: {
        ...state.voidShardUpgrades,
        [id]: currentLevel + 1,
      },
    });
  },

  respecVoidShards: () => {
    const state = get();
    let refund = 0;
    for (const vsDef of VOID_SHARD_UPGRADES) {
      const level = state.voidShardUpgrades[vsDef.id] ?? 0;
      refund += vsDef.cost * level;
    }
    set({
      voidShards: state.voidShards + refund,
      voidShardUpgrades: {},
    });
  },

  // ─── Ascendancy Paths ───

  chooseAscendancyPath: (pathId: AscendancyPathId) => {
    const state = get();
    // Can only choose if no path is active
    if (state.ascendancy.activePath) return;
    // Must have done at least one void collapse
    if (state.voidCollapseCount < 1) return;

    set({
      ascendancy: {
        ...state.ascendancy,
        activePath: pathId,
      },
    });
  },

  // ─── Singularity (Third Prestige) ───

  singularity: () => {
    const state = get();
    if (!isSingularityUnlocked(state)) return;

    const fragmentGain = getRealityFragmentGain(state);
    if (fragmentGain <= 0) return;

    resetEntityStore();

    set({
      // Reset everything including void shards
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
      voidShards: 0,
      totalVoidShards: 0,
      voidCollapseCount: 0,
      voidShardUpgrades: {},
      // Award reality fragments
      realityFragments: state.realityFragments + fragmentGain,
      totalRealityFragments: state.totalRealityFragments + fragmentGain,
      singularityCount: state.singularityCount + 1,
      // Reset paths — unlike void collapse which preserves mastery to reward
      // continued use of a path, singularity resets mastery so players must
      // rebuild it, creating a fresh strategic layer each singularity cycle.
      ascendancy: {
        activePath: null,
        pathMastery: {},
      },
      // Reset run state
      seenEvents: ['e28'],
      totalClicks: 0,
      activeTab: 'generators',
      offlineReport: null,
      autoBuyEnabled: false,
      expeditions: {
        ...state.expeditions,
        activeExpedition: null,
        pendingResult: null,
      },
    });
  },

  buySingularityUpgrade: (id: string) => {
    const state = get();
    const def = SINGULARITY_UPGRADES.find(s => s.id === id);
    if (!def) return;

    const currentLevel = state.singularityUpgrades[id] ?? 0;
    if (currentLevel >= def.maxLevel) return;
    if (state.realityFragments < def.cost) return;

    set({
      realityFragments: state.realityFragments - def.cost,
      singularityUpgrades: {
        ...state.singularityUpgrades,
        [id]: currentLevel + 1,
      },
    });
  },
}));

let autoSaveTimer: ReturnType<typeof setInterval> | null = null;

export function startAutoSave() {
  if (autoSaveTimer) clearInterval(autoSaveTimer);
  autoSaveTimer = setInterval(() => {
    useGameStore.getState().saveGame();
  }, AUTO_SAVE_INTERVAL);
}
