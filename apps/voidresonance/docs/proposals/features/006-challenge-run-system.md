# Feature Proposal: Challenge Run System

## 📋 Overview

| Attribute | Rating |
|-----------|--------|
| **Impact** | ⭐⭐⭐⭐ (4/5) |
| **Fun Factor** | ⭐⭐⭐⭐⭐ (5/5) |
| **Complexity** | ⭐⭐⭐⭐ (4/5) |
| **Priority** | 🟡 Medium-term |
| **Estimated Effort** | 4-6 days |
| **Dependencies** | Prestige system maturity |
| **Risk** | Medium — challenge balance is tricky |

---

## 🎯 Pitch

Antimatter Dimensions' Infinity Challenges and Eternity Challenges are what separated it from the pack. Challenges transform the game from a passive number generator into an active puzzle. "Can I reach 1M flux without clicking?" or "Can I reach prestige in under 10 minutes?" — these create replayability, strategy depth, and a genuine sense of accomplishment.

**The concept:** Players can enter challenge runs that impose specific restrictions. Completing a challenge grants a permanent reward that persists across all future runs, including prestige and void collapse. Each challenge forces the player to engage with game mechanics in new ways, discovering strategies they never considered.

Challenges are the ultimate "I did it!" feature — shareable, braggable, and deeply satisfying.

---

## 🔧 Proposed Challenges

### Tier 1 — Echo Challenges (Unlocked at 5 prestiges)

| Challenge | Restriction | Goal | Reward |
|-----------|-------------|------|--------|
| **The Silent Run** | Cannot click the reactor (no manual clicks) | Earn 1M flux | +10% passive production (permanent) |
| **Minimalist** | Can only own 1 type of generator | Earn 500K flux | That generator permanently ×2 (player chooses) |
| **Speed Demon** | Must reach 1M flux in under 10 minutes | Prestige within 10 min | Starting flux ×10 on all future runs |
| **Data Drought** | No data generation (data rate = 0) | Earn 1M flux | Permanent +50% data rate |
| **Frenzied** | Production only works during frenzy/surge states | Earn 500K flux | Frenzy duration +50% permanently |
| **Unstable Reactor** | Production randomly fluctuates ×0.1 to ×10 each second | Earn 2M flux | +20% all production (permanent) |

### Tier 2 — Void Challenges (Unlocked at first Void Collapse)

| Challenge | Restriction | Goal | Reward |
|-----------|-------------|------|--------|
| **No Upgrades** | Cannot buy upgrades | Earn 10M flux | All upgrade costs -25% permanently |
| **Single Prestige** | Must complete in a single prestige run (no resetting) | Earn 100M flux | +25% echo gain permanently |
| **Reverse Scaling** | Higher-tier generators cost less but produce less | Complete research tree | Research speed +50% permanently |
| **Void Storm** | Negative void rifts spawn that drain flux | Earn 50M flux | Rift rewards ×2 permanently |

### Tier 3 — Reality Challenges (Unlocked at 10+ Void Collapses)

| Challenge | Restriction | Goal | Reward |
|-----------|-------------|------|--------|
| **True Idle** | No active input allowed (close the game, check back) | Earn 1B flux offline | Offline efficiency 100% permanently |
| **The Gauntlet** | All Tier 1 restrictions active simultaneously | Earn 100K flux | ×5 all production permanently |

---

## 💡 Implementation Approach

### Data Model

```typescript
// src/config/challenges.ts
interface ChallengeDef {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  description: string;
  restriction: string; // Human-readable description
  goal: ChallengeGoal;
  reward: ChallengeReward;
  unlockCondition: {
    type: 'prestige_count' | 'void_collapse_count';
    value: number;
  };
  flavorText: string;
}

interface ChallengeGoal {
  type: 'earn_flux' | 'prestige' | 'complete_research' | 'time_limit';
  value: number;
  timeLimit?: number; // seconds, for Speed Demon
}

interface ChallengeReward {
  type: 'production_mult' | 'specific_gen_mult' | 'cost_reduction' | 
        'echo_gain' | 'data_rate' | 'research_speed' | 'starting_flux' |
        'offline_efficiency' | 'frenzy_duration' | 'rift_reward';
  value: number;
  description: string;
}

// State additions
interface GameState {
  activeChallenge: string | null;
  completedChallenges: string[];
  challengeStartTime: number;
  challengeRunFlux: number; // flux earned in this challenge
}
```

### Engine Modifications

Challenge restrictions are implemented as modifiers in the engine:

```typescript
function applyChallenge(state: GameState): ChallengeModifiers {
  if (!state.activeChallenge) return DEFAULT_MODIFIERS;
  
  switch (state.activeChallenge) {
    case 'silent_run':
      return { clickDisabled: true };
    case 'minimalist':
      return { maxGeneratorTypes: 1 };
    case 'speed_demon':
      return { timeLimit: 600 }; // 10 min
    case 'data_drought':
      return { dataMultiplier: 0 };
    case 'frenzied':
      return { productionOnlyDuringFrenzy: true };
    // ...
  }
}
```

Challenge modifiers are checked in:
- `clickFlux()` — disable for Silent Run
- `buyGenerator()` — restrict for Minimalist
- `tick()` — apply production modifiers, check time limits
- `getDataPerSecond()` — zero out for Data Drought

### UI: Challenge Panel

Create `ChallengePanel.tsx`:
- Grid layout of challenges with lock/unlock/complete states
- Active challenge banner at top of screen with progress
- Challenge details modal: restriction, goal, reward preview
- "Enter Challenge" button with confirmation ("This will prestige and start a restricted run")
- Timer display for timed challenges
- Completion celebration animation

### Challenge Flow

1. Player enters a challenge → automatic prestige occurs
2. Challenge restrictions apply immediately
3. Normal gameplay with restrictions in place
4. When goal is met → challenge complete popup, reward granted
5. Player can "abandon" a challenge (no reward, returns to normal)
6. Completed challenges show a checkmark and their permanent reward

---

## 🎮 Player Experience

### Discovery
Player reaches 5 prestiges and a new tab appears: "Challenges." They see 6 locked challenges with intriguing names and descriptions. "The Silent Run — can you progress without ever clicking?"

### The First Challenge
Player enters "Data Drought." Suddenly, data generation is zero. No research, no data upgrades. They must rely entirely on flux-based strategies. It's hard, unfamiliar, and exciting. When they finally hit the goal, the reward popup feels incredible: "+50% data rate FOREVER."

### The Collection
Completing challenges becomes addictive. Each one forces a different playstyle. Players discuss strategies on forums: "How do you beat Speed Demon?" "The Minimalist is insane with Singularity Taps." The community engages with shared knowledge.

### The Gauntlet
The ultimate challenge. All restrictions at once. This becomes a badge of honor — a legendary achievement that only dedicated players complete.

---

## 📈 Why This Matters

- **Massively extends replayability** — 12+ unique runs with different strategies
- **Creates community engagement** — challenge strategies are shareable, discussable
- **Permanent rewards feel earned** — not just time investment but skill/strategy
- **Forces system mastery** — players must understand every mechanic to overcome restrictions
- **Fills the "nothing new" phase** — gives experienced players fresh goals
- **Antimatter Dimensions proof** — challenges are consistently rated as the best feature

---

## ⚖️ Balance Considerations

- Challenge rewards should be meaningful but not mandatory — a player who never does challenges should still progress
- Total permanent bonus from all challenges: approximately ×3-5 total production
- Challenges should be beatable with strategic play, not just grinding
- Time-limited challenges need generous limits (10 min Speed Demon is tight but doable)
- Consider allowing challenges to be re-attempted at higher difficulties for additional rewards
- "The Gauntlet" should be extremely difficult but not mathematically impossible
