# Feature Proposal: Active Cooldown Abilities

## 📋 Overview

| Attribute | Rating |
|-----------|--------|
| **Impact** | ⭐⭐⭐⭐⭐ (5/5) |
| **Fun Factor** | ⭐⭐⭐⭐⭐ (5/5) |
| **Complexity** | ⭐⭐⭐⭐ (4/5) |
| **Priority** | 🔴 Immediate |
| **Estimated Effort** | 3-5 days |
| **Dependencies** | None |
| **Risk** | Medium — needs balancing |

---

## 🎯 Pitch

The #1 gap in Void Reactor is **"what do I do between clicks?"** Players have a click button, a combo system, and rift hunting — but nothing that feels like an active "power" they can strategically deploy.

Clicker Heroes solved this brilliantly with Dark Ritual, Energize, and Powersurge — abilities on cooldowns that create meaningful **decision-making moments**. "Do I use Void Surge now, or save it for when I get a Frenzy Rift?"

We propose 5 active abilities, each unlocked through research or prestige, with cooldowns ranging from 60-300 seconds. These abilities provide the "active play" pillar that our design research identified as needing enhancement.

**The pitch in one sentence:** Give players buttons to press that feel powerful and require timing decisions.

---

## 🔧 Proposed Abilities

### Ability 1: Void Surge
| Property | Value |
|----------|-------|
| **Unlock** | Research: "Void Manipulation" |
| **Cooldown** | 60 seconds |
| **Effect** | ×5 all production for 10 seconds |
| **Visual** | Reactor pulses bright, entities accelerate, screen flash |
| **Upgrade Path** | Prestige: +2s duration per level (max 5) |

### Ability 2: Data Harvest
| Property | Value |
|----------|-------|
| **Unlock** | Research: "Data Extraction Protocol" |
| **Cooldown** | 120 seconds |
| **Effect** | Instantly generate 60 seconds of data production |
| **Visual** | Green data particles cascade from top of reactor |
| **Upgrade Path** | Prestige: +15s of data per level (max 5) |

### Ability 3: Temporal Acceleration
| Property | Value |
|----------|-------|
| **Unlock** | Research: "Temporal Mechanics" |
| **Cooldown** | 180 seconds |
| **Effect** | Research progresses at ×10 speed for 15 seconds |
| **Visual** | Clock-like visual effect, entities orbit faster |
| **Upgrade Path** | Prestige: +3s duration per level (max 5) |

### Ability 4: Entity Swarm
| Property | Value |
|----------|-------|
| **Unlock** | Research: "Swarm Intelligence" |
| **Cooldown** | 90 seconds |
| **Effect** | All generators produce at ×10 for 5 seconds |
| **Visual** | All entities converge to center then explode outward |
| **Upgrade Path** | Prestige: ×1.5 multiplier per level (max 3) |

### Ability 5: Rift Call
| Property | Value |
|----------|-------|
| **Unlock** | Research: "Void Resonance Mastery" |
| **Cooldown** | 300 seconds |
| **Effect** | Guarantee a void rift spawn within 5 seconds |
| **Visual** | Space warps, cracks appear in the reactor field |
| **Upgrade Path** | Prestige: +10% chance of rare rift type per level (max 5) |

---

## 💡 Implementation Approach

### Data Model

```typescript
// New type: src/config/abilities.ts
interface AbilityDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  baseCooldown: number; // seconds
  duration: number; // 0 for instant, seconds for buffs
  effectType: 'production_mult' | 'instant_resource' | 'research_speed' | 'spawn_rift';
  effectValue: number;
  unlockRequirement: string; // research node ID
  prestigeUpgradeId?: string; // prestige upgrade that enhances it
}

// Game state additions
interface GameState {
  // ... existing fields
  abilities: Record<string, {
    unlocked: boolean;
    lastUsedAt: number; // timestamp, 0 if never used
    level: number; // from prestige upgrades
  }>;
  activeBuffs: Array<{
    abilityId: string;
    startedAt: number;
    duration: number;
    multiplier: number;
  }>;
}
```

### Engine Integration

In the tick loop:
1. Decrement active buff timers
2. Remove expired buffs
3. Apply active buff multipliers to production calculations

```typescript
function getAbilityMultiplier(state: GameState): number {
  let mult = 1;
  const now = Date.now() / 1000;
  for (const buff of state.activeBuffs) {
    if (now - buff.startedAt < buff.duration) {
      mult *= buff.multiplier;
    }
  }
  return mult;
}
```

### UI Component

Create `AbilityBar.tsx`:
- Horizontal bar at bottom of reactor or in sidebar
- Each ability shows as a circular icon
- Cooldown shown as a sweep animation (like WoW ability cooldowns)
- Locked abilities show greyed out with unlock hint
- Active buffs show duration bar
- Keyboard shortcuts: 1-5 for quick activation

### Research Tree Extension

Add 5 new research nodes to `src/config/research.ts`:
- Each ability has a dedicated unlock node
- Nodes branch off from mid-tier research
- Creates a "specialization" feel — which ability do you research first?

### Prestige Upgrades

Add to `src/config/prestige.ts`:
- "Ability Enhancement I-V" — each reduces cooldown by 10% for all abilities
- Individual ability-specific upgrades for enhanced effects
- Late prestige: "Dual Cast" — use two abilities simultaneously

---

## 🎮 Player Experience

### Discovery Phase
Player researches "Void Manipulation" and unlocks their first ability — Void Surge. The button appears in the UI. They press it and see production spike to ×5 with a dramatic visual. They immediately want to unlock more abilities.

### Strategic Phase
Player has 3 abilities unlocked. A Golden Rift appears. Decision: "Do I pop Void Surge + Entity Swarm for ×50 production during the Golden Rift's ×777 effect?" This creates an epic moment of ×38,850 production.

### Optimization Phase
Player plans ability rotations: "Void Surge every 60s, Entity Swarm at 90s, stack them every 180s." Prestige upgrades reduce cooldowns. The ability rotation becomes a satisfying active gameplay loop.

---

## 📈 Why This Matters

- **Fills the active play gap** — the biggest identified weakness
- **Creates decision-making** — when to use abilities, which to enhance
- **Synergizes with rifts** — abilities + rifts = exponential excitement
- **Extends prestige depth** — ability upgrades add meaningful prestige spending
- **Visual spectacle** — ability activations make the reactor look incredible
- **Keyboard shortcuts** — appeals to active/power players
- **Proven pattern** — Clicker Heroes' abilities are consistently praised by players

---

## ⚖️ Balance Considerations

- Abilities should NOT replace passive income — they provide burst windows
- Cooldowns should be long enough that players can't maintain 100% uptime
- Ability multipliers should be balanced against rift multipliers (don't overshadow rifts)
- Consider diminishing returns if multiple abilities are stacked
- Prestige ability upgrades should be expensive enough to create meaningful choices
