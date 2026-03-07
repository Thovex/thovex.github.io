# Feature Proposal: Daily Login Rewards

## 📋 Overview

| Attribute | Rating |
|-----------|--------|
| **Impact** | ⭐⭐⭐ (3/5) |
| **Fun Factor** | ⭐⭐⭐ (3/5) |
| **Complexity** | ⭐⭐ (2/5) |
| **Priority** | 🟡 Medium-term |
| **Estimated Effort** | 1-2 days |
| **Dependencies** | None |
| **Risk** | Low — standard retention mechanic |

---

## 🎯 Pitch

Daily login systems are the bread and butter of mobile game retention. They work because they exploit **loss aversion** — missing a day means losing your streak and the escalating rewards. While simple, the data is clear: daily login systems improve D7 retention by 20-40% across the industry.

**The concept:** A 30-day escalating reward calendar. Each day you log in, you receive a reward. Consecutive days increase the reward tier. Missing a day doesn't reset the calendar but breaks the streak bonus. At day 7, 14, and 30, special milestone rewards are given.

This is a low-effort, high-retention feature that gives players a reason to open the game every day, even for just a moment.

---

## 🔧 Proposed Design

### 30-Day Reward Calendar

| Day | Reward | Type |
|-----|--------|------|
| 1 | 1,000 flux | Currency |
| 2 | 500 flux | Currency |
| 3 | 50 data | Currency |
| 4 | 2,000 flux | Currency |
| 5 | 100 data | Currency |
| 6 | 5,000 flux | Currency |
| **7** | **Free stat unlock + ×2 production for 1 hour** | **Milestone** |
| 8 | 10,000 flux | Currency |
| 9 | 200 data | Currency |
| 10 | 15,000 flux | Currency |
| 11 | 500 data | Currency |
| 12 | 25,000 flux | Currency |
| 13 | 1,000 data | Currency |
| **14** | **1 Echo + ×3 production for 1 hour** | **Milestone** |
| 15 | 50,000 flux | Currency |
| 16 | 2,000 data | Currency |
| 17 | 100,000 flux | Currency |
| 18 | 5,000 data | Currency |
| 19 | 250,000 flux | Currency |
| 20 | 10,000 data | Currency |
| **21** | **3 Echoes + ×5 production for 2 hours** | **Milestone** |
| 22 | 500,000 flux | Currency |
| 23 | 25,000 data | Currency |
| 24 | 1,000,000 flux | Currency |
| 25 | 50,000 data | Currency |
| 26 | 2,500,000 flux | Currency |
| 27 | 100,000 data | Currency |
| 28 | 5,000,000 flux | Currency |
| 29 | 500,000 data | Currency |
| **30** | **5 Echoes + Exclusive "Devoted" achievement + reactor skin** | **Grand Milestone** |

### Streak System

| Streak | Bonus |
|--------|-------|
| 3+ consecutive days | ×1.5 daily reward |
| 7+ consecutive days | ×2 daily reward |
| 14+ consecutive days | ×3 daily reward |
| 30 consecutive days | ×5 daily reward + "Void Devotee" title |

### Calendar Behavior
- Calendar resets after day 30 (loops back to day 1 with scaling rewards)
- Each loop increases base rewards by ×2
- Missing a day does NOT reset calendar position, but resets streak multiplier
- Rewards scale with player progression (early game: flat amounts; late game: percentage of production)

---

## 💡 Implementation Approach

### Data Model

```typescript
// src/config/dailyRewards.ts
interface DailyRewardDef {
  day: number;
  reward: {
    type: 'flux' | 'data' | 'echoes' | 'stat_unlock' | 'production_boost' | 'achievement' | 'cosmetic';
    amount?: number;
    duration?: number; // for boosts, in seconds
    multiplier?: number; // for production boosts
    id?: string; // for achievements, cosmetics
  };
  isMilestone: boolean;
}

// State additions
interface GameState {
  dailyLogin: {
    currentDay: number; // 1-30
    currentStreak: number;
    bestStreak: number;
    lastLoginDate: string; // ISO date string (YYYY-MM-DD)
    totalLogins: number;
    calendarLoop: number; // how many times the 30-day calendar has reset
    todayCollected: boolean;
  };
}
```

### Engine Logic

```typescript
function checkDailyLogin(state: GameState): DailyRewardResult | null {
  const today = new Date().toISOString().split('T')[0];
  if (state.dailyLogin.lastLoginDate === today && state.dailyLogin.todayCollected) {
    return null; // Already collected today
  }
  
  // Calculate yesterday's date string for streak checking
  const yesterdayDate = new Date(Date.now() - 86400000);
  const yesterday = yesterdayDate.toISOString().split('T')[0];
  const isConsecutive = state.dailyLogin.lastLoginDate === yesterday;
  
  const newStreak = isConsecutive ? state.dailyLogin.currentStreak + 1 : 1;
  const streakMultiplier = getStreakMultiplier(newStreak);
  
  const nextDay = (state.dailyLogin.currentDay % 30) + 1;
  const reward = DAILY_REWARDS[nextDay - 1];
  
  return {
    day: nextDay,
    reward: scaleReward(reward, streakMultiplier, state.dailyLogin.calendarLoop),
    streak: newStreak,
    streakMultiplier,
  };
}
```

### UI Component

Create `DailyLoginPopup.tsx`:
- Calendar grid showing 30 days
- Past days show collected rewards (checkmark)
- Today's reward highlighted and claimable
- Streak counter with visual indicator
- Next milestone preview
- Animation when claiming reward (coins/particles flying)

Calendar display on a tab or sidebar:
- Monthly grid view with reward icons per day
- Streak flame icon that grows with consecutive days
- "Come back tomorrow for..." teaser

---

## 🎮 Player Experience

**Day 1:** Player opens game, a friendly popup shows: "Day 1 — Welcome! Here's 1,000 flux to get started!" They click collect. Easy, positive.

**Day 7:** "MILESTONE! 7 days of void exploration!" Free stat unlock + production boost. Player feels rewarded for consistency.

**Day 15:** Player missed day 12. Streak reset to 1, but calendar still shows day 15. They see what they missed (×2 multiplier) and are motivated to maintain their streak going forward.

**Day 30:** Grand celebration. Exclusive achievement unlocked. Reactor skin earned. Player feels a genuine sense of accomplishment. Calendar resets with ×2 rewards for the next cycle.

---

## 📈 Why This Matters

- **Industry proven** — 20-40% D7 retention improvement
- **Creates daily habit** — players open the game "just to collect" then stay to play
- **Low effort, high return** — simple implementation, significant engagement impact
- **Streak psychology** — loss aversion makes players reluctant to break streaks
- **Scales with progression** — rewards can be percentage-based for late-game relevance
- **Complements offline system** — works alongside returning player bonuses

---

## ⚖️ Balance Considerations

- Early rewards should be meaningful for new players but not game-breaking
- Late rewards should scale with progression (don't give 1000 flux to someone earning 1B/sec)
- Consider percentage-based rewards: "10 minutes of production" instead of flat amounts
- Streak bonus should feel good but missing a day shouldn't feel punishing
- Don't gate important content behind daily rewards — they should be bonuses, not requirements
- Calendar loop scaling (×2 per loop) prevents rewards from becoming meaningless at endgame
