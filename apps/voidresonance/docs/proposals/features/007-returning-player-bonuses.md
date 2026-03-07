# Feature Proposal: Returning Player Bonuses

## 📋 Overview

| Attribute | Rating |
|-----------|--------|
| **Impact** | ⭐⭐⭐⭐ (4/5) |
| **Fun Factor** | ⭐⭐⭐ (3/5) |
| **Complexity** | ⭐⭐ (2/5) |
| **Priority** | 🟡 Short-term |
| **Estimated Effort** | 1-2 days |
| **Dependencies** | None |
| **Risk** | Low |

---

## 🎯 Pitch

The current offline system calculates passive gains and shows them in a popup. But the popup is informational, not exciting. There's no special reason to come back after being away — the game just tells you what you passively earned.

Successful mobile games and idle games use **returning player bonuses** to create a positive association with coming back. The message shifts from "here's what happened" to "WELCOME BACK! Here's a BONUS!" This subtle psychological reframe dramatically improves D1 and D7 retention.

**The concept:** When a player returns after 30+ minutes away, they receive a temporary production boost (×3 for 5 minutes) on top of their offline earnings. Longer absences earn bigger bonuses. Special "while you were away" events can occur for surprise rewards.

---

## 🔧 Proposed Design

### Welcome Back Boost

| Time Away | Boost | Duration |
|-----------|-------|----------|
| 30 min - 2 hours | ×2 production | 3 minutes |
| 2 - 8 hours | ×3 production | 5 minutes |
| 8 - 24 hours | ×5 production | 5 minutes |
| 24+ hours | ×5 production + bonus rift | 10 minutes |

### Offline Events (Random Bonuses While Away)

When offline for 2+ hours, there's a 30% chance of a bonus event:

| Event | Probability | Reward |
|-------|------------|--------|
| **Void Anomaly Discovered** | 40% | +500% of normal offline earnings |
| **Data Cache Found** | 25% | Bonus data equal to 1 hour of data production |
| **Echo Whisper** | 15% (post-prestige) | +0.5 free echoes |
| **Rift Residue** | 15% | Immediate rift spawn on return |
| **Temporal Pocket** | 5% | ×10 offline earnings for this session |

### Enhanced Offline Report

Redesign `OfflinePopup.tsx`:
- **Before:** "You were away for 4 hours. You earned 45,000 flux and 23 data."
- **After:** 
  ```
  ╔══════════════════════════════════╗
  ║     🌀 WELCOME BACK, VOID WALKER!     ║
  ╠══════════════════════════════════╣
  ║  ⏱️ Time Away: 4 hours 23 min          ║
  ║                                        ║
  ║  📊 Offline Earnings:                  ║
  ║     +45,000 flux                       ║
  ║     +23 data                           ║
  ║                                        ║
  ║  🎁 BONUS EVENT: Void Anomaly!         ║
  ║     +225,000 extra flux discovered!    ║
  ║                                        ║
  ║  ⚡ Welcome Boost: ×3 production       ║
  ║     for the next 5 minutes!            ║
  ╚══════════════════════════════════╝
  ```

---

## 💡 Implementation Approach

### State Changes

```typescript
interface GameState {
  // ... existing
  welcomeBoost: {
    active: boolean;
    multiplier: number;
    expiresAt: number; // timestamp
  } | null;
}
```

### Engine Changes

In the offline calculation (when loading save):

```typescript
function calculateWelcomeBoost(timeAway: number): WelcomeBoost | null {
  if (timeAway < 1800) return null; // Under 30 min, no boost
  
  const hours = timeAway / 3600;
  if (hours >= 24) return { multiplier: 5, duration: 600 };
  if (hours >= 8)  return { multiplier: 5, duration: 300 };
  if (hours >= 2)  return { multiplier: 3, duration: 300 };
  return { multiplier: 2, duration: 180 };
}

function rollOfflineEvent(timeAway: number): OfflineEvent | null {
  if (timeAway < 7200) return null; // Under 2 hours, no event
  if (Math.random() > 0.30) return null; // 30% chance
  
  // Weighted random selection of event types
  const roll = Math.random();
  if (roll < 0.40) return { type: 'anomaly', fluxBonus: 5.0 };
  if (roll < 0.65) return { type: 'data_cache', dataBonus: 3600 };
  // ... etc
}
```

In `getGlobalMultiplier()`:
```typescript
if (state.welcomeBoost?.active && Date.now() < state.welcomeBoost.expiresAt) {
  multiplier *= state.welcomeBoost.multiplier;
}
```

In `tick()`:
```typescript
// Check if welcome boost expired
if (state.welcomeBoost?.active && Date.now() >= state.welcomeBoost.expiresAt) {
  state.welcomeBoost = null;
}
```

### UI Changes

Enhance `OfflinePopup.tsx`:
- Redesign with the warm, celebratory format shown above
- Animate the numbers counting up
- Show welcome boost timer in header while active
- Toast notification when boost expires: "Welcome boost ended. See you next time! 👋"

Add to `Header.tsx`:
- Welcome boost indicator: "⚡ ×3 BOOST — 3:42 remaining"
- Pulsing animation to draw attention

---

## 🎮 Player Experience

**The Return:** Player closes the game at night. Next morning, they open it and see "WELCOME BACK!" with a cheerful popup. Their offline earnings are nice, but the ×3 boost for 5 minutes makes them feel rewarded for coming back. They immediately start playing to maximize the boost window.

**The Surprise:** Player was away for 6 hours. On return, they see "Void Anomaly Discovered! +500% offline earnings!" This unexpected bonus creates a moment of delight. They wonder what other surprises might happen.

**The Habit:** After a few returns, the player associates closing and reopening the game with positive rewards. This creates a healthy play pattern — play for 30 minutes, come back in a few hours for a boost, repeat.

---

## 📈 Why This Matters

- **Improves D1 retention by 15-30%** (industry benchmarks for welcome-back systems)
- **Reframes "leaving" as positive** — player doesn't feel punished for time away
- **Creates anticipation** — "I wonder what bonus I'll get when I come back"
- **Encourages healthy play patterns** — short sessions with breaks are rewarded
- **Very low implementation cost** — mostly UI and one multiplier check
- **Works with existing offline system** — enhancement, not replacement

---

## ⚖️ Balance Considerations

- Boost multiplier should be noticeable but not game-breaking (×2-5 range)
- Duration should be short enough that players feel urgency to play during it
- Offline event bonuses should be modest — a nice surprise, not a required strategy
- Ensure boost doesn't stack with other production multipliers in an unbalanced way
- Consider anti-exploit: Don't apply boost if player was away for less than 30 minutes (prevents save/reload abuse)
