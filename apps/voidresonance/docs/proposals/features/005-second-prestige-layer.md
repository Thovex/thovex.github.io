# Feature Proposal: Second Prestige Layer — Void Shards

## 📋 Overview

| Attribute | Rating |
|-----------|--------|
| **Impact** | ⭐⭐⭐⭐⭐ (5/5) |
| **Fun Factor** | ⭐⭐⭐⭐ (4/5) |
| **Complexity** | ⭐⭐⭐⭐⭐ (5/5) |
| **Priority** | 🟡 Medium-term |
| **Estimated Effort** | 5-8 days |
| **Dependencies** | Core systems mature (rifts, abilities, synergies) |
| **Risk** | High — fundamental progression change |

---

## 🎯 Pitch

Every successful long-running idle game has multiple prestige layers. Antimatter Dimensions has Infinity → Eternity → Reality. Cookie Clicker has Ascension. Clicker Heroes has Transcendence. Each new layer transforms the game by introducing genuinely new mechanics, not just bigger numbers.

Our current single-layer prestige (Echoes) provides approximately 3-10 hours of meaningful progression. After that, players have purchased all prestige upgrades and the game stagnates. A second prestige layer would:

1. **Triple the effective game lifetime** (from ~10 hours to ~30+ hours)
2. **Introduce new mechanics** that change how the game plays
3. **Create the "I finally made it" moment** that keeps players talking about the game

**The concept:** After accumulating enough total Echoes across multiple prestige runs, players can perform a "Void Collapse" — resetting everything including Echoes for a new currency: **Void Shards**. These unlock an entirely new upgrade tree and game mechanics.

---

## 🔧 Proposed Design

### Unlock Condition
- **Minimum:** 1,000 total Echoes earned across all runs
- **Visible at:** 500 total Echoes (teased in UI: "Something stirs beyond the Echo...")
- **Research Gate:** Complete a special "Void Collapse Theory" research node (appears at 500 echoes)

### Void Collapse (Second Prestige)
**What resets:**
- All flux, data, generators, upgrades
- All research progress
- All echoes and echo upgrades
- All first-layer prestige progress

**What persists:**
- Void Shards (new currency)
- Void Shard upgrades
- Achievements (and their bonuses)
- Total statistics
- Unlocked lore/events

### Void Shard Calculation
```
voidShards = floor(log10(totalEchoesEarned / 100)) × shardMultiplier
```
Requires significant echo accumulation before the first shard is meaningful.

### Void Shard Upgrade Tree

| Upgrade | Cost | Max | Effect |
|---------|------|-----|--------|
| **Void Memory** | 1 shard | 10 | Start each echo run with +100×level flux |
| **Echo Amplifier** | 2 shards | 5 | ×1.5 echo gain per level |
| **Accelerated Research** | 2 shards | 5 | All research 30% faster per level |
| **Generator Legacy** | 3 shards | 3 | Start runs with 5×level of each Tier 1 gen |
| **Void Insight** | 3 shards | 5 | +20% all production per level |
| **Rift Mastery** | 4 shards | 3 | +25% rift frequency per level |
| **Ability Affinity** | 4 shards | 3 | -15% ability cooldowns per level |
| **Shard Resonance** | 5 shards | 10 | +10% shard gain per level |
| **Void Walker** | 8 shards | 1 | Unlock Void Expeditions mini-game |
| **Reality Glimpse** | 10 shards | 1 | Unlock automate first prestige layer |
| **Dimensional Anchor** | 15 shards | 1 | Keep one research node through prestige |
| **Eternal Echo** | 20 shards | 1 | Keep one echo upgrade through void collapse |

### New Mechanic: Automator
Unlocked via "Reality Glimpse" (10 shards):
- Auto-buy generators at configurable intervals
- Auto-prestige at configurable echo thresholds  
- Auto-research in priority order
- Makes echo runs feel like a strategic setup phase rather than repetitive clicking

---

## 💡 Implementation Approach

### State Model Changes

```typescript
// Additions to GameState
interface GameState {
  // ... existing
  
  // Second prestige
  voidShards: number;
  totalVoidShards: number;
  voidCollapseCount: number;
  voidShardUpgrades: Record<string, number>;
  
  // Automator (unlocked via shards)
  automatorEnabled: boolean;
  automatorConfig: {
    autoBuyGenerators: boolean;
    autoPrestigeThreshold: number; // min echoes to auto-prestige
    autoResearchPriority: string[]; // ordered research IDs
  };
}
```

### New Config File

Create `src/config/voidShards.ts`:
- Void Shard upgrade definitions
- Shard calculation formula
- Automator configuration options

### Engine Changes

- New `voidCollapse()` action: Calculate shards, reset everything, apply shard bonuses
- Modify `prestige()` to check for automator auto-prestige
- Add `getVoidShardMultiplier()` to global multiplier chain
- Automator tick: Check auto-buy/auto-prestige conditions each frame

### UI: New Tab

Create `VoidShardPanel.tsx`:
- Void Shard count display with unique visual (shattered crystal aesthetic)
- Shard upgrade tree (branching, not linear)
- "Void Collapse" button with dramatic confirmation dialog
- Shard gain preview: "You would earn X Void Shards"
- Automator configuration panel (toggle switches, threshold sliders)

### Visual

- New reactor visual layer when shards are earned (subtle crystal/shard particles)
- Void Collapse animation: screen shatters, rebuilds with shard glow
- Shard count in header with unique styling

---

## 🎮 Player Experience

### The Tease (500 echoes)
Player notices a flickering message: "Something stirs beyond the Echo..." A new research node appears in the tree: "Void Collapse Theory." Curiosity drives them forward.

### The Decision (1000 echoes)
"Void Collapse" button unlocks. Player sees they would earn 3 Void Shards. They agonize: "Should I collapse now or farm more echoes first?" This mirrors the first-prestige anxiety but at a higher level. The prestige preview helps them decide.

### The Reset
Everything goes. Their carefully built echo upgrades, their production, their research — gone. But they have 3 Void Shards and access to transformative upgrades. The first shard upgrade ("Void Memory: Start with 1000 flux") makes their next run dramatically faster.

### The New Game
Now the meta-game changes. Each echo run is planned around shard upgrades. The automator makes echo runs semi-automatic. The player's role shifts from "clicker" to "strategist" — setting up automator rules and optimizing shard gain.

---

## 📈 Why This Matters

- **Extends game lifetime by 3-5×** — the single biggest content expansion possible
- **Creates the "metagame shift"** — gameplay fundamentally changes, preventing staleness
- **Automator reduces tedium** — later prestige runs don't require manual clicking through familiar content
- **Industry standard** — every top idle game has 2+ prestige layers
- **Creates FOMO/achievement** — "I void collapsed!" becomes a bragging point
- **Opens future expansion** — third prestige layer can build on this foundation

---

## ⚖️ Balance Considerations

- First void collapse should feel meaningful (3-5 shards), not trivial
- Shard upgrades should make echo runs noticeably faster (2-3× by 10 shards)
- Automator should NOT be available until sufficient shards (prevents skipping engagement)
- Time to first void collapse: ~8-12 hours of play
- Time between void collapses should decrease: first 8h, second 4h, third 2h
- Consider a "soft cap" on shard gain to prevent runaway progression
