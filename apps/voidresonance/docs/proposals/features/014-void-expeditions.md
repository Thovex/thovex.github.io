# Feature Proposal: Void Expeditions — Idle Mini-Adventures

## 📋 Overview

| Attribute | Rating |
|-----------|--------|
| **Impact** | ⭐⭐⭐⭐ (4/5) |
| **Fun Factor** | ⭐⭐⭐⭐⭐ (5/5) |
| **Complexity** | ⭐⭐⭐⭐⭐ (5/5) |
| **Priority** | 🟢 Long-term |
| **Estimated Effort** | 7-10 days |
| **Dependencies** | Second prestige layer (005), preferably abilities (003) |
| **Risk** | High — significant new system |

---

## 🎯 Pitch

NGU Idle has Adventure Mode. Clicker Heroes has zone progression. Realm Grinder has excavation. The most successful idle games don't just have one loop — they have a **second game mode** running alongside the core idle loop that provides different engagement.

**The concept:** Players can send generators on "Void Expeditions" — timed missions into procedurally generated void sectors. Assigned generators are removed from production during the expedition but return with unique rewards: rare resources, permanent bonuses, lore discoveries, and exclusive items. This creates a push-pull tension: "Do I keep my generators producing, or risk them on an expedition for potentially amazing rewards?"

Expeditions run in the background (truly idle) and complete after a set duration. Players choose difficulty, assign generators, and check back for results.

---

## 🔧 Proposed Design

### Expedition Mechanics

#### Setup Phase
1. Player selects an **Expedition Zone** (unlocked progressively)
2. Player assigns **generators** to the expedition (removed from production)
3. More/better generators = higher success chance and better rewards
4. Player selects **duration** (longer = better rewards but longer without those generators)

#### Execution Phase
- Expedition runs passively in the background
- Progress bar shows time remaining
- Random events during expedition (shown in log):
  - "Your Void Antennas detected an anomaly..."
  - "The Quantum Refinery overloaded! Expedition power reduced by 10%"
  - "A data cache was discovered! Bonus data incoming."

#### Completion Phase
- Rewards calculated based on: zone difficulty × power × duration × luck
- Results screen showing everything found
- Generators return to production

### Expedition Zones

| Zone | Unlock | Duration | Difficulty | Reward Type |
|------|--------|----------|------------|-------------|
| **Shallow Void** | 100K flux earned | 15-60 min | Easy | Flux, small bonuses |
| **Data Nebula** | 1M flux earned | 30-120 min | Medium | Data, research speed boosts |
| **Echo Caverns** | First prestige | 1-4 hours | Medium | Echoes, prestige bonuses |
| **Quantum Fields** | 10 prestiges | 2-8 hours | Hard | Rare resources, generator boosts |
| **The Deep Void** | 50 prestiges | 4-12 hours | Very Hard | Exclusive items, permanent bonuses |
| **Reality Fracture** | First void collapse | 8-24 hours | Extreme | Void shards, unique rewards |

### Expedition Power Calculation

```
expeditionPower = sum of assigned generators:
  = baseProduction × owned × milestoneMultiplier
  
successChance = min(100%, expeditionPower / zoneDifficulty × 100)
rewardMultiplier = expeditionPower / zoneDifficulty
```

### Reward Tables

#### Shallow Void Rewards
| Reward | Probability | Amount |
|--------|------------|--------|
| Flux | 100% | 30-120 minutes of production |
| Bonus Data | 30% | 500-2000 data |
| Temp Boost | 15% | ×2 production for 30 min |
| Expedition Map Fragment | 5% | Unlocks next zone faster |

#### The Deep Void Rewards
| Reward | Probability | Amount |
|--------|------------|--------|
| Massive Flux | 100% | 4-12 hours of production |
| Echo Fragments | 40% | 1-5 echoes |
| Permanent Bonus | 10% | +1-5% permanent production |
| Expedition Artifact | 5% | Unique item with passive effect |
| Lore Fragment | 20% | Exclusive expedition lore text |
| Void Shard Fragment | 2% | 0.5-1 void shard |

### Expedition Artifacts (Unique Permanent Items)

| Artifact | Found In | Effect |
|----------|----------|--------|
| **Void Compass** | Shallow Void | +10% expedition reward quality |
| **Data Scanner** | Data Nebula | +25% data from expeditions |
| **Echo Resonator** | Echo Caverns | +10% echo gain globally |
| **Quantum Stabilizer** | Quantum Fields | -10% generator cost |
| **Void Heart** | The Deep Void | +1% all production per expedition completed |
| **Reality Anchor** | Reality Fracture | Keep 1 extra upgrade through prestige |

---

## 💡 Implementation Approach

### Data Model

```typescript
// src/config/expeditions.ts
interface ExpeditionZoneDef {
  id: string;
  name: string;
  description: string;
  flavorText: string;
  difficulty: number;
  minDuration: number; // seconds
  maxDuration: number; // seconds
  unlockCondition: { stat: string; value: number };
  rewardTable: ExpeditionReward[];
  eventPool: ExpeditionEvent[];
}

interface ExpeditionReward {
  id: string;
  type: 'flux' | 'data' | 'echoes' | 'temp_boost' | 'permanent_bonus' | 'artifact' | 'lore';
  probability: number;
  amountRange: [number, number];
  scaling: 'flat' | 'production_based' | 'power_based';
}

interface ExpeditionEvent {
  id: string;
  text: string;
  effect: 'power_bonus' | 'power_penalty' | 'bonus_reward' | 'flavor';
  value: number;
  probability: number;
}

// State additions
interface GameState {
  expeditions: {
    unlocked: boolean;
    activeExpedition: {
      zoneId: string;
      assignedGenerators: Record<string, number>; // genId -> count assigned
      startedAt: number;
      duration: number;
      power: number;
      events: string[]; // event IDs that occurred
    } | null;
    completedExpeditions: number;
    artifacts: string[]; // discovered artifact IDs
    discoveredLore: string[];
    expeditionHistory: Array<{
      zoneId: string;
      success: boolean;
      rewards: string[];
      timestamp: number;
    }>;
  };
}
```

### Engine Integration

In `tick()`:
```typescript
if (state.expeditions.activeExpedition) {
  const exp = state.expeditions.activeExpedition;
  const elapsed = (Date.now() / 1000) - exp.startedAt;
  
  // Roll for random events at intervals
  if (shouldRollEvent(elapsed, exp)) {
    rollExpeditionEvent(state, exp);
  }
  
  // Check completion
  if (elapsed >= exp.duration) {
    completeExpedition(state, exp);
  }
}
```

Generator production adjustment:
```typescript
function getAvailableGenerators(genId: string, state: GameState): number {
  const total = state.generators[genId]?.owned ?? 0;
  const assigned = state.expeditions.activeExpedition?.assignedGenerators[genId] ?? 0;
  return total - assigned; // Reduce production by assigned amount
}
```

### UI Components

**ExpeditionPanel.tsx** (new sidebar tab):
- Zone selection with difficulty indicators
- Generator assignment interface (drag/slider to assign count per type)
- Power calculation preview: "Expedition Power: 45,000 (Success: 87%)"
- Production impact preview: "Production during expedition: -15%"
- Active expedition tracker with progress bar and event log
- Completion screen with reward summary
- Artifact collection display
- Expedition history log

**Reactor Visual Integration:**
- Assigned generators visually "leave" the reactor during expedition
- A small expedition indicator icon on the reactor
- On completion, generators return with a celebration animation

---

## 🎮 Player Experience

**First Expedition:** Player unlocks Shallow Void. They assign 10 Void Antennas (their weakest generators) — the production loss is minimal. 30 minutes later, they come back: "Your expedition returned with 50,000 flux and 1,000 data!" Worth it.

**The Risk/Reward Tension:** Player considers sending their Singularity Taps on a Deep Void expedition. The potential rewards are incredible (5 echoes!), but losing those generators for 8 hours would cut their production by 40%. Do they dare?

**Artifact Collection:** Player finds their first artifact — the Void Compass. It permanently improves all future expeditions. Now they're invested in the expedition system long-term. "What other artifacts are out there?"

**Deep Lore:** Expedition lore fragments reveal backstory about the Void. Players who engage with expeditions learn things about the game world that others don't. This exclusive lore creates a sense of being an explorer.

---

## 📈 Why This Matters

- **Creates a second gameplay loop** — expeditions run alongside normal play
- **Idle-within-idle** — expeditions are themselves idle content (send and wait)
- **Risk/reward decisions** — assigning generators creates genuine tension
- **Exclusive content** — artifacts and lore only available through expeditions
- **Long-term progression** — "Void Heart" (+1% per expedition) rewards dedicated players
- **Works with offline play** — expeditions can complete while offline
- **Extends engagement lifetime** — entirely new content vector

---

## ⚖️ Balance Considerations

- Expedition rewards should exceed the production lost during the expedition (e.g., assigning 50% of generators for 8h loses 4h-equivalent of full production), but should not exceed what full uninterrupted production would have earned (8h at 100%). This ensures expeditions are worthwhile but not strictly superior to normal play.
- Artifact bonuses must be modest (+1-10% range) to avoid making expeditions mandatory
- Players should never feel forced to send generators — it should always be a choice
- Expedition difficulty should scale with player progression
- Consider "auto-expedition" upgrade from void shards (second prestige)
- Failed expeditions should still return generators (no permanent loss)
- Limit to 1 active expedition (2 with upgrade) to prevent generator hoarding
