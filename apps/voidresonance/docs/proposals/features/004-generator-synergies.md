# Feature Proposal: Generator Synergies

## 📋 Overview

| Attribute | Rating |
|-----------|--------|
| **Impact** | ⭐⭐⭐⭐ (4/5) |
| **Fun Factor** | ⭐⭐⭐⭐ (4/5) |
| **Complexity** | ⭐⭐⭐ (3/5) |
| **Priority** | 🔴 Immediate |
| **Estimated Effort** | 2-3 days |
| **Dependencies** | None |
| **Risk** | Medium — needs balance testing |

---

## 🎯 Pitch

Currently, generator purchases are a linear escalation — buy the cheapest you can afford, move to the next tier, repeat. There's no strategic decision about **which** generator to invest in because they don't interact with each other.

Cookie Clicker's building synergies changed the genre forever. Grandmas boost farms, farms boost mines, temples boost everything — suddenly there's a reason to buy 200 grandmas even when you have antimatter condensers.

**The proposal:** Each generator type provides a small bonus to one or two other generator types based on ownership count. This creates:
1. A reason to invest in "lower" tier generators long past their prime
2. Meaningful purchase decisions ("Do I buy my 100th Antenna or my 10th Singularity Tap?")
3. Optimal build strategies that differ between prestige runs

---

## 🔧 Proposed Synergy Map

### Synergy Chain (Each generator boosts the next)

```
Void Antenna → Flux Condenser → Resonance Harvester → Quantum Refinery
      ↑                                                        ↓
The God Engine ← Reality Architect ← Entropy Weaver ← Phase Array
      ↓                                                        ↑
Temporal Oracle → Void Beacon → Dimensional Rift → Singularity Tap
```

### Specific Synergies

| Generator | Synergy Target | Bonus |
|-----------|---------------|-------|
| **Void Antenna** | Flux Condenser | +0.5% per Antenna owned |
| **Flux Condenser** | Resonance Harvester | +0.5% per Condenser owned |
| **Resonance Harvester** | Quantum Refinery | +1% per Harvester owned |
| **Quantum Refinery** | Phase Array | +1% per Refinery owned |
| **Phase Array** | Singularity Tap | +1.5% per Array owned |
| **Singularity Tap** | Dimensional Rift | +1.5% per Tap owned |
| **Dimensional Rift** | Void Beacon | +2% per Rift owned |
| **Void Beacon** | Entropy Weaver | +2% per Beacon owned |
| **Entropy Weaver** | Temporal Oracle | +2.5% per Weaver owned |
| **Temporal Oracle** | Reality Architect | +2.5% per Oracle owned |
| **Reality Architect** | The God Engine | +3% per Architect owned |
| **The God Engine** | ALL generators | +0.5% per Engine owned |

### Cross-Synergies (Unlocked via Research)

| Research Node | Synergy | Bonus |
|---------------|---------|-------|
| Void Resonance Theory | Antenna ↔ Singularity Tap | +0.2% mutual |
| Quantum Entanglement+ | Refinery ↔ Temporal Oracle | +0.3% mutual |
| Reality Weaving | All Tier 5-6 boost Tier 1-2 | +0.1% per owned |

---

## 💡 Implementation Approach

### Config Changes

Add synergy definitions to `src/config/generators.ts`:

```typescript
interface GeneratorSynergyDef {
  sourceId: string;
  targetId: string;
  bonusPerOwned: number; // e.g., 0.005 = +0.5% per source owned
}

export const GENERATOR_SYNERGIES: GeneratorSynergyDef[] = [
  { sourceId: 'void_antenna', targetId: 'flux_condenser', bonusPerOwned: 0.005 },
  // ... etc
];
```

### Engine Changes

In `src/game/engine.ts`, create `getSynergyMultiplier()`:

```typescript
function getSynergyMultiplier(genId: string, state: GameState): number {
  let bonus = 0;
  for (const synergy of GENERATOR_SYNERGIES) {
    if (synergy.targetId === genId) {
      const sourceOwned = state.generators[synergy.sourceId]?.owned ?? 0;
      bonus += sourceOwned * synergy.bonusPerOwned;
    }
  }
  return 1 + bonus;
}
```

Integrate into the per-generator production calculation chain:
```
genProduction = baseProduction × owned × upgradeMultiplier × milestoneMultiplier 
              × synergyMultiplier × globalMultiplier × eventMultiplier
```

### UI Enhancements

In `GeneratorPanel.tsx`:
- Show synergy info on hover: "Boosted by 50 Void Antennas (+25%)"
- Show synergy target: "Boosts Flux Condensers (+0.5% each)"
- Color-code synergy connections
- Synergy contribution in production breakdown

In `StatsPanel.tsx` (Production Monitor stat):
- Break down synergy contributions per generator
- Show total synergy bonus percentage

### Visual Reactor Enhancement

In `drawEntities.ts`:
- Draw faint connection lines between synergized entity types
- Entities with active synergies pulse brighter
- Synergy chain visualization when hovering a generator in the panel

---

## 🎮 Player Experience

**Early Game:** Player buys Void Antennas and Flux Condensers. They notice "Boosted by 10 Antennas (+5%)" on the Condenser. Light bulb moment: buying more Antennas makes Condensers better!

**Mid Game:** Player faces a real decision — buy 50 more Quantum Refineries to boost Phase Arrays, or save for the next Dimensional Rift? This is the first time generator purchases involve genuine strategy.

**Late Game:** The God Engine's "boost ALL generators" synergy means every God Engine purchased retroactively buffs the entire production chain. Owning 100 God Engines = +50% to every generator. This creates a satisfying endgame loop.

---

## 📈 Why This Matters

- **Transforms linear into strategic** — the biggest design gap in generator gameplay
- **Extends generator lifespan** — Tier 1 generators remain relevant at endgame
- **Creates "a-ha" optimization moments** — players discover synergy chains
- **Cookie Clicker validated this** — synergies are one of their most praised features
- **Config-driven** — easy to balance by adjusting percentage values
- **Visual synergy lines** — make the reactor more interconnected and alive

---

## ⚖️ Balance Considerations

- Lower tier synergy bonuses (0.5%) prevent early game from becoming too fast
- Higher tier synergy bonuses (2-3%) reward late-game investment
- God Engine's "boost all" synergy should be modest per-unit but powerful in aggregate
- Total synergy bonus should not exceed 2-3× production at maximum investment
- Consider diminishing returns past a threshold (e.g., first 100 give full bonus, 100+ give half)
