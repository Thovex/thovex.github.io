# Feature Proposal: Ascendancy Paths — Faction Specialization System

## 📋 Overview

| Attribute | Rating |
|-----------|--------|
| **Impact** | ⭐⭐⭐⭐⭐ (5/5) |
| **Fun Factor** | ⭐⭐⭐⭐⭐ (5/5) |
| **Complexity** | ⭐⭐⭐⭐⭐ (5/5) |
| **Priority** | 🟢 Long-term |
| **Estimated Effort** | 10-15 days |
| **Dependencies** | Second prestige layer (005), expanded research (012) |
| **Risk** | High — fundamental game transformation |

---

## 🎯 Pitch

Realm Grinder's faction system is widely considered the gold standard for idle game replayability. Choosing between Angels, Fairies, Elves (good) vs. Goblins, Undead, Demons (evil) fundamentally changes how you play. Each faction has unique buildings, upgrades, and strategies. Players replay the game dozens of times trying different factions.

**The concept:** After the first Void Collapse (second prestige), players choose an **Ascendancy Path** — a specialization that fundamentally alters their playstyle for that cycle. Three paths are available, each with unique mechanics, exclusive generators, modified production formulas, and distinct visual themes. Paths can be changed on each Void Collapse, encouraging experimentation.

This is the ultimate endgame feature — it transforms Void Reactor from "one game" into "three games in one."

---

## 🔧 Proposed Ascendancy Paths

### Path 1: The Architect — Builder's Mastery

| Aspect | Detail |
|--------|--------|
| **Philosophy** | "Build more, produce more. Quantity is power." |
| **Color Theme** | Blue/Silver |
| **Core Mechanic** | Generator costs reduced by 50%. Generator count milestones are easier (halved thresholds). New milestone tier at 1024. |
| **Unique Bonus** | "Blueprint Mastery" — Each generator type owned gives +0.5% to ALL other generators |
| **Exclusive Generator** | **Void Fabricator** — Produces 0 flux but reduces all generator costs by 1% per owned |
| **Modified Formula** | Production = base × (1 + 0.01 × totalGeneratorsOwned)² |
| **Exclusive Upgrade** | "Mass Construction" — Buy 1000 generators at once |
| **Exclusive Research** | "Recursive Architecture" — Generator count milestones grant ×1.5 instead of base values |
| **Visual Theme** | Ordered geometric patterns, grid-like entity arrangement, crystalline structures |
| **Playstyle** | Hoard generators. Stack milestones. Wide and deep ownership. |

### Path 2: The Channeler — Active Power

| Aspect | Detail |
|--------|--------|
| **Philosophy** | "Harness the void through direct interaction. Your will shapes reality." |
| **Color Theme** | Purple/Gold |
| **Core Mechanic** | Click power ×10. Combo multiplier caps raised to 100×. Abilities recharge 50% faster. Rifts appear 2× as often. |
| **Unique Bonus** | "Void Channeling" — Each click increases ALL production by 0.01% for 30 seconds (stacks) |
| **Exclusive Generator** | **Click Amplifier** — Doesn't produce flux but multiplies click value by 1.1× per owned |
| **Modified Formula** | ClickValue = base × (1 + 0.001 × totalClicks)^0.5 |
| **Exclusive Upgrade** | "Auto-Click" — Generates 1 click per second passively |
| **Exclusive Research** | "Resonance Cascade" — Clicking has 5% chance to trigger all abilities simultaneously |
| **Visual Theme** | Dynamic energy bursts, lightning, entities pulse with each click |
| **Playstyle** | Active clicking is king. Stack combos, chain rifts, use abilities constantly. |

### Path 3: The Observer — Passive Omniscience

| Aspect | Detail |
|--------|--------|
| **Philosophy** | "True power comes from patience. Let the void work for you." |
| **Color Theme** | Green/Teal |
| **Core Mechanic** | Passive production ×5. Offline efficiency 100%. Data generation ×3. Research speed ×2. But click power reduced to 10%. |
| **Unique Bonus** | "Time Dilation" — Production increases by +1% for every minute of uninterrupted idle (caps at +300% after 5 hours) |
| **Exclusive Generator** | **Temporal Accumulator** — Produces flux that scales with time since last click |
| **Modified Formula** | Production = base × (1 + minutesSinceLastClick × 0.02) |
| **Exclusive Upgrade** | "Dream Engine" — Offline earnings are 150% of online earnings |
| **Exclusive Research** | "Void Meditation" — After 10 minutes idle, gain 1% of run's total flux as bonus |
| **Visual Theme** | Calm, meditative, slow-moving entities with trailing afterimages |
| **Playstyle** | Set up generators, close the game, come back to massive gains. Minimal clicking. |

---

## 🔀 Path Interactions & Switching

### Choosing a Path
- First Void Collapse: All three paths unlock simultaneously
- Player chooses one path before starting the next cycle
- Path choice is shown prominently in the UI

### Switching Paths
- On each subsequent Void Collapse, player can switch paths
- Switching is encouraged — different paths are optimal for different goals
- "Path Mastery" system: Using a path multiple times unlocks deeper bonuses

### Path Mastery Levels

| Level | Uses | Bonus |
|-------|------|-------|
| Novice | 1 | Base path bonuses |
| Adept | 3 | +25% path-specific bonuses |
| Master | 7 | +50% path-specific bonuses + exclusive cosmetic |
| Grandmaster | 15 | +100% path-specific bonuses + exclusive achievement |

### Cross-Path Synergies (Unlocked at Master level)

When switching FROM a mastered path TO another:
- **Architect → Channeler:** Keep 10% of generator cost reduction
- **Architect → Observer:** Keep 25% of milestone bonus improvements
- **Channeler → Architect:** Keep 20% of ability cooldown reduction
- **Channeler → Observer:** Keep 10% of rift frequency bonus
- **Observer → Architect:** Keep 25% of data generation bonus
- **Observer → Channeler:** Keep 50% of offline efficiency bonus

---

## 💡 Implementation Approach

### Data Model

```typescript
// src/config/ascendancy.ts
interface AscendancyPathDef {
  id: 'architect' | 'channeler' | 'observer';
  name: string;
  title: string; // "The Architect"
  philosophy: string;
  color: { primary: string; secondary: string; accent: string };
  
  modifiers: {
    productionMult?: number;
    clickMult?: number;
    generatorCostMult?: number;
    offlineEfficiency?: number;
    dataRateMult?: number;
    researchSpeedMult?: number;
    abilityRechargeRate?: number;
    riftFrequencyMult?: number;
    comboMaxMult?: number;
  };
  
  exclusiveGenerator: GeneratorDef;
  exclusiveUpgrades: UpgradeDef[];
  exclusiveResearch: ResearchNodeDef[];
  
  uniqueMechanic: {
    id: string;
    description: string;
    formula: string;
  };
}

// State additions
interface GameState {
  ascendancy: {
    activePath: string | null;
    pathMastery: Record<string, number>; // path -> times used
    crossPathBonuses: string[]; // active cross-path synergies
  };
}
```

### Engine Integration

Major engine modifications:
- All production calculations check `state.ascendancy.activePath` for modifiers
- Click handler checks for Channeler bonuses
- Tick loop applies Observer time-scaling
- Generator cost calculations apply Architect reductions
- Exclusive generators/upgrades/research only available when on correct path

```typescript
function getPathModifier(stat: string, state: GameState): number {
  if (!state.ascendancy.activePath) return 1;
  const path = ASCENDANCY_PATHS[state.ascendancy.activePath];
  const mastery = state.ascendancy.pathMastery[state.ascendancy.activePath] ?? 0;
  const masteryBonus = getMasteryBonus(mastery);
  return (path.modifiers[stat] ?? 1) * (1 + masteryBonus);
}
```

### UI: Path Selection Screen

**AscendancyPanel.tsx** (shown on Void Collapse):
- Full-screen path selection overlay
- Three columns, each showing a path with:
  - Visual theme preview (mini reactor mockup)
  - Core mechanic description
  - Key bonuses and trade-offs
  - Mastery level and progress
- "Choose Path" button with confirmation
- Can review paths at any time via settings

**In-Game Indicators:**
- Path icon in header
- Path-colored UI accents throughout the game
- Reactor visuals adopt path color theme
- Exclusive content marked with path icon

---

## 🎮 Player Experience

### The Revelation
After their first Void Collapse, the screen goes dark. Three paths materialize: "THE ARCHITECT — Builder's Mastery", "THE CHANNELER — Active Power", "THE OBSERVER — Passive Omniscience." Each shows a reactor preview in their color theme. This is a transformation moment — the game just expanded in three directions.

### First Path: The Architect
Player chooses Architect because they like building generators. Suddenly, costs are halved. They're buying generators twice as fast. Milestones are easier to reach. The Blueprint Mastery bonus makes every generator type valuable. The Void Fabricator (exclusive generator) creates a new strategic dimension — buy fabricators to reduce costs, or regular generators for production?

### Switching to Channeler
On the next Void Collapse, they try Channeler. The game feels COMPLETELY DIFFERENT. Now clicking is incredibly powerful (×10), combos go up to 100×, rifts appear constantly. They're actively clicking, timing abilities, chaining rifts. It's almost a different genre. This variety is what makes them play for 50+ more hours.

### Mastering All Three
Over time, the player masters each path. Cross-path synergies start unlocking — taking the best of each path into the next cycle. This creates a deep optimization puzzle: "If I master Observer first, I get 50% offline efficiency when I switch to Channeler. That means my idle periods are productive even when I'm actively clicking during active play."

---

## 📈 Why This Matters

- **3× content with 3× replayability** — each path is essentially a different game
- **Solves the "solved game" problem** — no single optimal strategy anymore
- **Personalizes playstyle** — clickers choose Channeler, AFK players choose Observer, collectors choose Architect
- **Community diversity** — "What path are you using?" becomes a conversation starter
- **Extends game lifetime by 5-10×** — mastering all three paths takes dozens of hours
- **Realm Grinder proof** — faction systems are the highest-rated feature in idle games that have them

---

## ⚖️ Balance Considerations

- All three paths should reach similar total production at equilibrium (different routes, same destination)
- Observer's passive superiority must be offset by the fun of active play in Channeler/Architect
- Exclusive generators should NOT be strictly better than existing generators — they're different, not superior
- Cross-path synergies should be meaningful but not game-breaking
- Path mastery progression should reward dedication (15 uses for Grandmaster = many void collapses)
- Consider analytics: if 80% of players choose one path, the others need buffs
- Each path should be viable for challenge runs, expeditions, and all other content
- Test with all three paths before releasing to ensure no path is a "trap" choice
