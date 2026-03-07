# Feature Proposal: The Void Forge — Resource Conversion System

## 📋 Overview

| Attribute | Rating |
|-----------|--------|
| **Impact** | ⭐⭐⭐ (3/5) |
| **Fun Factor** | ⭐⭐⭐⭐ (4/5) |
| **Complexity** | ⭐⭐⭐ (3/5) |
| **Priority** | 🟡 Medium-term |
| **Estimated Effort** | 2-3 days |
| **Dependencies** | None |
| **Risk** | Medium — economic balance |

---

## 🎯 Pitch

Currently, flux and data exist as independent resources. You earn flux, you earn data, you spend them separately. There's no interaction between currencies — no decision about allocation, no conversion, no resource management puzzle.

Kittens Game's resource chains are a masterclass in resource interdependency. When catnip feeds into wood, which feeds into minerals, which feeds into iron — every resource decision ripples through the entire economy. This creates the "one more thing" engagement loop.

**The concept:** Introduce "The Void Forge" — a facility where players can convert between resources at variable exchange rates, craft special items, and create resource chains that unlock new production methods. This adds an economic layer to a game that currently has linear resource accumulation.

---

## 🔧 Proposed Design

### Basic Conversions

| Conversion | Rate | Unlock |
|------------|------|--------|
| Flux → Data | 1000:1 | 10K flux earned |
| Data → Flux | 1:500 | 1K data earned |
| Flux → Cores | 1M:1 | First prestige |
| Cores → Flux | 1:100K | 10 cores owned |
| Data → Cores | 10K:1 | 5K data earned |

### Dynamic Exchange Rate
- Conversion rates fluctuate based on recent usage:
  - Converting flux→data repeatedly makes the rate worse (demand pricing)
  - Rate normalizes over time (30-minute recovery)
  - Current rate displayed in forge UI
- This prevents pure arbitrage while allowing strategic conversion

### Forge Recipes (Crafting System)

| Recipe | Ingredients | Result | Duration |
|--------|------------|--------|----------|
| **Efficiency Crystal** | 50K flux + 500 data | ×1.2 all production for 10 min | 5 min craft |
| **Data Prism** | 100K flux + 1K data | ×3 data rate for 5 min | 10 min craft |
| **Echo Shard** | 500K flux + 5K data | +0.5 echoes (instant) | 15 min craft |
| **Frenzy Catalyst** | 200K flux + 2K data | Instant frenzy activation | 8 min craft |
| **Rift Beacon** | 1M flux + 10K data | Guarantee rare rift within 30s | 20 min craft |
| **Generator Seed** | 2M flux + 5K data + 1 core | +5 of cheapest generator (free) | 30 min craft |
| **Time Crystal** | 5M flux + 20K data + 3 cores | ×2 all production for 1 hour | 45 min craft |

### Forge Upgrades (Permanent via Prestige)

| Upgrade | Cost | Effect |
|---------|------|--------|
| **Forge Efficiency I-III** | 2-6 echoes | -10% forge recipe costs per level |
| **Rapid Forging I-III** | 3-8 echoes | -20% forge crafting time per level |
| **Rate Stabilizer** | 5 echoes | Conversion rates fluctuate 50% less |
| **Dual Forge** | 10 echoes | Can craft 2 recipes simultaneously |

---

## 💡 Implementation Approach

### Data Model

```typescript
// src/config/forge.ts
interface ForgeConversionDef {
  id: string;
  fromResource: 'flux' | 'data' | 'cores';
  toResource: 'flux' | 'data' | 'cores';
  baseRate: number; // amount of fromResource per 1 toResource
  rateFluctuationMax: number; // max % change from base
  unlockCondition: { stat: string; value: number };
}

interface ForgeRecipeDef {
  id: string;
  name: string;
  description: string;
  ingredients: { resource: string; amount: number }[];
  craftDuration: number; // seconds
  result: {
    type: 'timed_boost' | 'instant_resource' | 'instant_effect' | 'generators';
    effect: string;
    value: number;
    duration?: number; // seconds
  };
  unlockCondition?: { stat: string; value: number };
}

// State additions
interface GameState {
  forge: {
    unlocked: boolean;
    currentRates: Record<string, number>; // dynamic rates
    activeRecipe: { recipeId: string; startedAt: number; completesAt: number } | null;
    activeRecipe2: { recipeId: string; startedAt: number; completesAt: number } | null; // with Dual Forge
    craftedCount: Record<string, number>; // per recipe
    totalConversions: number;
  };
}
```

### Engine Integration

```typescript
function convertResource(state: GameState, conversionId: string, amount: number): boolean {
  const conversion = FORGE_CONVERSIONS.find(c => c.id === conversionId);
  if (!conversion) return false;
  
  const currentRate = state.forge.currentRates[conversionId] ?? conversion.baseRate;
  const cost = amount * currentRate;
  
  if (state[conversion.fromResource] < cost) return false;
  
  state[conversion.fromResource] -= cost;
  state[conversion.toResource] += amount;
  
  // Worsen rate due to usage (demand pricing)
  state.forge.currentRates[conversionId] = currentRate * 1.05;
  state.forge.totalConversions++;
  
  return true;
}
```

In `tick()`:
- Progress active forge recipes
- Gradually normalize exchange rates toward base values
- Apply completed recipe effects

### UI: Forge Panel

Create `ForgePanel.tsx` (new tab or sub-panel):
- **Conversion Section:** Two-way converter with current rates and slider for amount
- **Recipe Grid:** Available recipes with ingredient costs, craft time, and result preview
- **Active Craft:** Progress bar for currently crafting recipe(s)
- **Rate Chart:** Simple line graph showing rate fluctuation over time
- **Forge Stats:** Total conversions, recipes crafted, etc.

---

## 🎮 Player Experience

**Discovery:** Player unlocks the Forge after earning 10K flux. A new tab appears. They see they can convert flux to data — useful because they need data for research but their data rate is low. First conversion is at a great rate. Second is slightly worse. They learn about dynamic pricing.

**Strategic Usage:** Player is 500 data short of a critical research node. They could wait 10 minutes for passive data income... or convert flux right now. The conversion costs more flux than they'd like, but the research node is worth it. This creates an engaging trade-off decision.

**Crafting Loop:** Player discovers they can craft an Echo Shard — 0.5 free echoes without prestiging! It costs a lot of flux and data, but it's worth it. They start planning their resource allocation around forge recipes, adding a whole new dimension to gameplay.

**Late Game:** With Dual Forge and reduced costs from prestige upgrades, the forge becomes a core part of the gameplay loop — converting excess flux into data for research, crafting boosters before optimal prestige windows, and maintaining a balanced economy.

---

## 📈 Why This Matters

- **Adds resource management depth** — from linear accumulation to strategic allocation
- **Creates meaningful decisions** — "convert now or wait for better rate?"
- **Fills dead time** — recipes provide active goals during waiting periods
- **Connects disconnected systems** — flux, data, and cores now interact
- **Extends prestige value** — forge upgrades add more echo spending options
- **Crafting is universally appealing** — combines resources for powerful results

---

## ⚖️ Balance Considerations

- Conversion rates must prevent infinite loops (flux→data→flux should lose value)
- Dynamic pricing prevents pure arbitrage but shouldn't be punishing
- Recipe costs should scale with current progression (percentage-based, not flat)
- Echo Shard recipe should never be more efficient than actual prestige
- Crafting times should align with game pacing (5-45 minutes, not hours)
- Forge shouldn't overshadow core gameplay — it's a supplement, not a replacement
- Consider "forge cooldown" to prevent recipe spam
