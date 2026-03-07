# Feature Proposal: Achievement Bonuses

## 📋 Overview

| Attribute | Rating |
|-----------|--------|
| **Impact** | ⭐⭐⭐⭐ (4/5) |
| **Fun Factor** | ⭐⭐⭐⭐ (4/5) |
| **Complexity** | ⭐⭐ (2/5) |
| **Priority** | 🔴 Immediate |
| **Estimated Effort** | 0.5-1 day |
| **Dependencies** | None (achievements already exist) |
| **Risk** | Very Low — purely additive |

---

## 🎯 Pitch

We already have 35+ achievements but they're entirely cosmetic. This is a missed opportunity. Cookie Clicker proved that achievements granting production bonuses (+2-4% CPS per achievement) transform achievement hunting from a passive "oh cool" moment into an active gameplay goal.

**The simple change:** Every unlocked achievement grants +1-3% bonus to all production. With 35+ achievements, a fully completed set provides +50-100% total production. This makes achievement hunting a legitimate strategy and creates a "collection" motivation loop.

This is the highest ROI feature we can add — minimal implementation effort, maximum engagement increase.

---

## 🔧 Proposed Design

### Base Mechanic
- Each achievement unlocked provides a flat **+2% all production** bonus
- Displayed as: "Achievement Bonus: +X% (Y/Z achievements)"
- Stacks additively with other multipliers
- Persists through prestige (achievements are never lost)

### Tiered Achievement Bonuses
Some achievements could provide enhanced bonuses based on difficulty:

| Achievement Tier | Bonus | Examples |
|-----------------|-------|---------|
| **Common** | +1% | First Spark, Tap Tap, Small Army |
| **Uncommon** | +2% | Combo Master, Researcher, Echo Chamber |
| **Rare** | +3% | Terawatt Ascension, Combo Legend, Rift Master |
| **Legendary** | +5% | Omniscient, All Signals Received, Eternal Return |

### Achievement Milestone Bonuses
Additional bonuses for reaching achievement count thresholds:

| Milestone | Bonus |
|-----------|-------|
| 5 achievements | +5% click power |
| 10 achievements | +10% all production |
| 15 achievements | +5% data rate |
| 20 achievements | +15% all production |
| 25 achievements | +10% echo gain |
| 30 achievements | ×2 all production |
| All achievements | ×3 all production + secret title |

---

## 💡 Implementation Approach

### Engine Changes

In `src/game/engine.ts`, modify `getGlobalMultiplier()`:

```typescript
function getAchievementBonus(state: GameState): number {
  let bonus = 0;
  for (const achId of state.unlockedAchievements) {
    const achDef = ACHIEVEMENTS.find(a => a.id === achId);
    bonus += achDef?.bonus ?? 0.02; // Default 2% per achievement
  }
  // Add milestone bonuses
  const count = state.unlockedAchievements.length;
  if (count >= 30) bonus += 1.0;
  else if (count >= 20) bonus += 0.15;
  // ... etc
  return 1 + bonus;
}
```

Then include `getAchievementBonus(state)` in the global multiplier chain.

### Config Changes

In `src/config/achievements.ts`, add a `bonus` field to each `AchievementDef`:

```typescript
{
  id: 'first_spark',
  name: 'First Spark',
  // ... existing fields
  bonus: 0.01, // +1% production
  tier: 'common',
}
```

### UI Changes

In `StatsPanel.tsx` or `Header.tsx`:
- Display "Achievement Bonus: +X%" in the production breakdown
- When an achievement unlocks, toast notification shows the bonus: "🏆 First Spark — +1% all production!"
- Achievement panel shows bonus amount per achievement

### Achievement Panel Enhancement

In the achievements display, add:
- Progress bar toward next milestone
- Total bonus from achievements
- Next milestone bonus preview

---

## 🎮 Player Experience

**The "Ah-ha" moment:** Player unlocks their first achievement and sees "+1% all production." They open the achievement panel and see 30+ achievements they can pursue, each with a bonus. Suddenly achievement hunting is a real progression vector, not just a vanity system.

**Mid-game motivation:** Player is in the "dead zone" between content and prestige. They notice they're 2 achievements away from the 15-achievement milestone (+5% data rate). This gives them a concrete goal during the waiting period.

**Completionist drive:** The "All achievements = ×3 production" milestone creates a powerful long-term goal that incentivizes engaging with every game system.

---

## 📈 Why This Matters

- **Transforms existing content into progression** — no new systems needed
- **Creates "hunting" behavior** — players actively pursue specific achievements
- **Fills the dead zone** — gives intermediate goals during slow periods
- **Cookie Clicker validation** — achievements providing CPS bonuses are one of their most praised features
- **Prestige-safe** — achievements persist, making bonus feel permanent and valuable
- **Trivial to implement** — one multiplier function + config additions
