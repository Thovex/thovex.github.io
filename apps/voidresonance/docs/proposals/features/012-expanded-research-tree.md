# Feature Proposal: Expanded Research Tree

## 📋 Overview

| Attribute | Rating |
|-----------|--------|
| **Impact** | ⭐⭐⭐⭐ (4/5) |
| **Fun Factor** | ⭐⭐⭐⭐ (4/5) |
| **Complexity** | ⭐⭐⭐ (3/5) |
| **Priority** | 🟡 Medium-term |
| **Estimated Effort** | 3-4 days |
| **Dependencies** | Abilities feature (003) for ability unlock nodes |
| **Risk** | Low — extends existing system |

---

## 🎯 Pitch

Our research tree currently has 18 nodes in a mostly linear structure. Realm Grinder has 300+ research nodes. Antimatter Dimensions' Time Studies create branching paths where players must choose between mutually exclusive options. Our research system is solid but needs depth and strategic choice.

**The concept:** Expand from 18 to 40+ research nodes organized into distinct branches. Introduce **branching paths** where players must choose one of two mutually exclusive options (respecable on prestige). Add a new **Specialization** system where deep investment in one branch provides exponential bonuses. This transforms research from a checklist into a strategic build system.

**Why it works:** The research tree is already one of our strongest engagement features (players actively check research progress). More nodes means more goals, branching means strategy, and specializations mean replayability across prestige runs.

---

## 🔧 Proposed Research Tree Structure

### Branch 1: Production Mastery (Existing + New)

```
Void Theory 101 (+10%)
├── Thermal Regulation (+15%)
│   ├── Deep Void Cartography (+25%)
│   │   ├── [CHOICE] Overproduction Protocol (×2 flux, -50% data)
│   │   └── [CHOICE] Balanced Yield (+30% flux, +30% data)
│   └── Generator Optimization (-10% gen costs)
│       └── Mass Production (-20% gen costs, +5% per gen type owned)
├── Controlled Overclock (+30%)
│   └── Quantum Entanglement (+40%)
│       ├── [CHOICE] Flux Dominance (×3 flux, Tier 1-3 gens)
│       └── [CHOICE] Void Dominance (×3 flux, Tier 4-6 gens)
└── NEW: Efficiency Matrix (+1% per generator milestone reached)
```

### Branch 2: Data Sciences (Existing + New)

```
Signal Decryption (+25% data/sec)
├── Data Surge Protocol (+50% data/sec)
│   ├── Perpetual Data Stream (+100% data/sec)
│   │   ├── NEW: Data Overflow (excess data converts to flux at 10:1)
│   │   └── NEW: Data Compression II (data costs -25%)
│   └── NEW: Pattern Analysis (data gain scales with generator count)
├── NEW: Algorithmic Trading (data generates passive flux)
│   └── NEW: Machine Learning (+1% all production per 1000 data earned)
└── NEW: Data Mining Protocols (clicking generates data)
```

### Branch 3: Active Mechanics (New — tied to Abilities feature)

```
NEW: Void Manipulation (unlocks Void Surge ability)
├── NEW: Data Extraction Protocol (unlocks Data Harvest ability)
│   └── NEW: Swarm Intelligence (unlocks Entity Swarm ability)
├── NEW: Temporal Mechanics (unlocks Temporal Acceleration ability)
│   └── NEW: Void Resonance Mastery (unlocks Rift Call ability)
└── NEW: Ability Refinement (-15% all ability cooldowns)
    └── NEW: Power Overwhelming (ability effects +50%)
```

### Branch 4: Prestige & Meta (Existing + New)

```
Echo Theory (unlocks prestige)
├── Echo Amplification (+25% echo gain)
│   └── Echo Mastery (+50% echo gain)
│       ├── NEW: Echo Recursion (echoes earned scale with prestige count)
│       └── NEW: Resonant Memory (keep 1 upgrade through prestige)
├── Anomaly Studies (+20% all production)
│   ├── NEW: Rift Attunement (+25% rift frequency)
│   │   └── NEW: Rift Mastery (unlock rare rift types)
│   └── NEW: Event Horizon (random events last 50% longer)
└── NEW: Void Collapse Theory (prerequisite for second prestige layer)
```

### Branch 5: Synergies & Interaction (New)

```
NEW: Void Resonance Theory (unlock base generator synergies)
├── NEW: Harmonic Coupling (+50% synergy bonuses)
│   └── NEW: Perfect Resonance (×2 synergy bonuses)
├── NEW: Cross-Dimensional Links (unlock cross-tier synergies)
│   └── NEW: Universal Harmony (God Engine synergy affects all gens equally)
└── NEW: Feedback Loops (synergies work bidirectionally)
```

---

## 🔀 Branching Choice System

### How Choices Work
- At certain tree points, two research nodes are mutually exclusive
- Player chooses one; the other locks out
- On prestige, choices reset — player can try the other path
- This creates different "builds" per prestige run

### Example Choice: Overproduction Protocol vs. Balanced Yield
- **Overproduction:** ×2 flux production but -50% data generation
  - Best for: Speed runs, flux-focused strategies, challenge runs
- **Balanced Yield:** +30% flux and +30% data
  - Best for: Research-heavy runs, data-gated content, balanced play

This single choice changes how the entire prestige run plays out.

---

## 💡 Implementation Approach

### Config Extension

Extend `src/config/research.ts` with new nodes:

```typescript
// Add to existing ResearchNodeDef
interface ResearchNodeDef {
  // ... existing fields
  branch?: string; // 'production' | 'data' | 'active' | 'prestige' | 'synergy'
  mutuallyExclusive?: string; // ID of the other choice node
  specialization?: string; // ID of specialization this contributes to
}
```

### Research Panel UI Enhancement

Redesign `ResearchPanel.tsx` for the expanded tree:
- **Visual tree layout** with branches clearly separated
- **Color-coded branches** (production=red, data=green, active=blue, prestige=gold, synergy=purple)
- **Choice nodes** shown side-by-side with "OR" between them
- **Locked branch indicators** showing what needs to be researched first
- **Progress per branch:** "Production: 6/12 nodes"
- **Zoom and pan** for the larger tree (using CSS transforms)

### Specialization Tracking

```typescript
interface GameState {
  researchSpecializations: Record<string, number>; // branch -> completed nodes count
}
```

Specialization bonuses (completing 75%+ of a branch):
- Production Mastery: +50% all production
- Data Sciences: +100% data rate
- Active Mechanics: -25% all cooldowns
- Prestige Meta: +50% echo gain
- Synergy Network: +100% synergy bonuses

---

## 🎮 Player Experience

**First Encounter:** Player opens the expanded research tree and sees 5 distinct branches spreading out. "Whoa, there's so much to explore!" The visual tree layout makes paths clear and appealing.

**First Choice:** Player reaches the Overproduction/Balanced choice. They deliberate, consult tooltips, and choose. This is the first real strategic decision in research — it feels meaningful.

**Build Planning:** On subsequent prestige runs, the player tries different branch orders and different choices. "This run I'll rush Data Sciences for the Data Mining node." Each run feels different because the research path varies.

**Specialization:** Player completes 8/10 Production nodes and gets the specialization bonus. The +50% production makes production-focused runs significantly stronger. They plan a "data run" for their next prestige cycle.

---

## 📈 Why This Matters

- **Doubles content without new systems** — 22 new nodes using existing research mechanics
- **Adds strategic depth** — branching choices create meaningful decisions
- **Improves replayability** — different builds per prestige run
- **Extends mid-game** — more research to complete fills the "dead zone"
- **Feels like discovery** — unlocking new branches reveals new possibilities
- **Config-driven** — easy to add, balance, and modify nodes

---

## ⚖️ Balance Considerations

- New nodes should have proportional costs — don't make the tree trivial to complete
- Branching choices should be balanced — neither option should be strictly better
- Specialization bonuses should be strong enough to incentivize deep investment
- Research duration should scale appropriately (early nodes: 20-60s, late nodes: 300-600s)
- Consider "respec cost" for changing branch choices mid-run (spending data)
- Total research completion time across all branches: 4-8 hours of active play
