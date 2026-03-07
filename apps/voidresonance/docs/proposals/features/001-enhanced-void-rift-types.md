# Feature Proposal: Enhanced Void Rift Types

## 📋 Overview

| Attribute | Rating |
|-----------|--------|
| **Impact** | ⭐⭐⭐⭐⭐ (5/5) |
| **Fun Factor** | ⭐⭐⭐⭐⭐ (5/5) |
| **Complexity** | ⭐⭐⭐ (3/5) |
| **Priority** | 🔴 Immediate |
| **Estimated Effort** | 2-3 days |
| **Dependencies** | None (builds on existing rift system) |
| **Risk** | Low — extends proven mechanic |

---

## 🎯 Pitch

Void Rifts are our equivalent of Cookie Clicker's Golden Cookies — the primary driver of active engagement. Currently, we have a single rift type that grants flux. This is leaving massive engagement potential on the table.

Golden Cookies are **the single most important feature** in Cookie Clicker's retention loop. Players keep their tab open specifically to catch them. By expanding our rift system to 6+ types with varying rarity and rewards, we create a variable-ratio reinforcement schedule — the most addictive pattern in behavioral psychology.

**The core idea:** Every 30-90 seconds, a clickable rift appears on the reactor canvas. The type is random, the reward varies, and chaining multiple rift clicks within a window multiplies the rewards. Players will want to watch the screen to catch the rare golden rifts.

---

## 🔧 Proposed Rift Types

| Rift Type | Rarity | Visual | Reward | Duration |
|-----------|--------|--------|--------|----------|
| **Flux Rift** | Common (50%) | Blue swirl | Instant 10-30s of flux production | Instant |
| **Frenzy Rift** | Uncommon (20%) | Orange pulse | ×7 production for 30-60s | 30-60s |
| **Data Rift** | Uncommon (15%) | Green glow | Instant data injection (5-15s of data/sec) | Instant |
| **Chain Rift** | Rare (8%) | Purple chain | Spawns 3-5 smaller rifts in rapid succession | 10s window |
| **Echo Rift** | Rare (5%, post-prestige) | Gold shimmer | Small echo reward (0.5-2 echoes) without reset | Instant |
| **Golden Rift** | Very Rare (2%) | Brilliant gold | ×777 production for 77 seconds | 77s |

### Rift Combo System
- Clicking a rift within 5 seconds of another rift applies a combo multiplier
- Combo stacks: ×1.5 → ×2 → ×3 → ×5 for 2nd, 3rd, 4th, 5th+ consecutive rift
- Chain Rifts specifically enable combo stacking
- Visual feedback: combo counter above the reactor

---

## 💡 Implementation Approach

### Data Model Changes

```typescript
// New type in src/game/types.ts or src/config/rifts.ts
interface VoidRiftDef {
  id: string;
  name: string;
  type: 'flux' | 'frenzy' | 'data' | 'chain' | 'echo' | 'golden';
  rarity: number; // Weight for random selection (0-1)
  description: string;
  color: string; // Canvas render color
  icon: string; // Emoji or icon reference
  duration: number; // 0 for instant, seconds for timed
  effectMultiplier: number; // Base multiplier for the reward
  unlockCondition?: string; // e.g., 'prestige >= 1' for Echo Rift
}
```

### Config File

Create `src/config/rifts.ts` with all rift type definitions and spawn rate constants:
- `RIFT_BASE_INTERVAL`: 60s (reduced from current ~85s average)
- `RIFT_MIN_INTERVAL`: 30s
- `RIFT_MAX_INTERVAL`: 90s
- `RIFT_COMBO_WINDOW`: 5s

### Entity Store Changes

Extend `entityStore.ts` to track:
- `activeRiftType`: The current rift's type definition
- `riftCombo`: Current combo counter
- `lastRiftClickTime`: Timestamp of last rift click for combo tracking
- `activeRiftEffects`: Array of timed rift effects currently active (frenzy, golden)

### Engine Changes

In `src/game/engine.ts`:
- Modify production multiplier chain to include active rift effects
- Add `getActiveRiftMultiplier()` that checks for frenzy/golden rift effects
- Modify click handler to award echo rifts correctly (add echoes without prestige)
- Add chain rift spawning logic (spawn sub-rifts on click)

### Canvas Rendering

In `src/components/reactor/drawEffects.ts`:
- Different visual styles per rift type (color, animation, particle effects)
- Combo counter display above reactor
- Active buff indicators on screen edge (showing remaining duration for frenzy/golden)
- Chain rift "explosion" animation spawning child rifts

### State Tracking

Add to game state:
- `riftsByType: Record<string, number>` — count per type clicked (for achievements)
- `goldenRiftsClicked: number` — rare rift tracking
- `maxRiftCombo: number` — best combo achieved

---

## 🎮 Player Experience

**Early Game (pre-prestige):** Flux Rifts appear every ~60s. Player learns to watch for them. Frenzy Rifts provide exciting production spikes. Data Rifts help with research.

**Mid Game (first few prestiges):** Echo Rifts start appearing, giving a small trickle of echoes between prestiges. Chain Rifts create exciting "burst" moments. Players learn to chase combos.

**Late Game (deep prestige):** Golden Rifts become the holy grail. Prestige upgrades reduce rift cooldowns and increase golden rift probability. Rift combo mastery becomes a core skill.

---

## 📈 Why This Matters

- **Cookie Clicker's golden cookies are responsible for ~60% of active session engagement** according to community surveys
- Variable reward schedules create the strongest habit loops
- Rift combos add a skill element to an otherwise passive game
- Echo Rifts create a "free echoes" excitement that reduces prestige anxiety
- Golden Rifts become legendary moments players remember and share

---

## 🏆 New Achievements

- **Rift Surfer**: Click 5 rifts in a single combo chain
- **Golden Hour**: Click a Golden Rift
- **Echo Hunter**: Collect 10 echoes from Echo Rifts
- **Chain Reaction**: Complete a Chain Rift (click all sub-rifts)
- **Rift Connoisseur**: Click every type of rift at least once
