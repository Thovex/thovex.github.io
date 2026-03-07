# Feature Proposal: Secrets & Easter Eggs

## 📋 Overview

| Attribute | Rating |
|-----------|--------|
| **Impact** | ⭐⭐⭐ (3/5) |
| **Fun Factor** | ⭐⭐⭐⭐⭐ (5/5) |
| **Complexity** | ⭐⭐ (2/5) |
| **Priority** | 🟡 Medium-term |
| **Estimated Effort** | 2-3 days |
| **Dependencies** | None |
| **Risk** | Very Low |

---

## 🎯 Pitch

Cookie Clicker's community was built on discovering secrets. "Did you know if you click the cookie 999 times in 10 seconds you get a hidden achievement?" The word-of-mouth from secrets and easter eggs is worth more than any marketing budget.

Secrets create **community conversation**. Players share discoveries, write guides, and debate whether certain "secrets" are real or rumored. This organic engagement extends a game's cultural lifespan far beyond its content.

**The concept:** Hide 15-20 discoverable secrets throughout the game — hidden achievements, secret interactions, specific number triggers, konami codes, and lore easter eggs. None are required for progression, but discovering them feels magical.

---

## 🔧 Proposed Secrets

### Secret Achievements (Hidden from achievement list until discovered)

| Secret | Trigger | Reward | Hint |
|--------|---------|--------|------|
| **The Answer** | Have exactly 42 of any generator | +42% production for 42 seconds | "The universe has a number..." |
| **Leet Speak** | Reach exactly 1,337 total flux earned | Permanent +1.337% production | "Elite hackers know this number" |
| **The Void Stares Back** | Click the reactor core 1,000 times in a single session | Secret "Void Eye" entity appears permanently | "Gaze long into the void..." |
| **Patience is a Virtue** | Wait 10 minutes without any input | +50% offline production for 1 hour | None — pure discovery |
| **Speedster** | Reach 10,000 flux within 60 seconds of a new run | Permanent +10% click power | None |
| **The Collector** | Own at least 1 of every generator simultaneously | ×1.1 all production permanently | "Variety is the spice of the void" |
| **Negative Space** | Have 0 of everything (no generators, no upgrades) while having echoes | +1 free echo | "Emptiness has value" |
| **Binary** | Own exactly 128 total generators | +12.8% production permanently | "Computers speak in powers of two" |
| **The Long Game** | Play for 100 total hours | "Void Veteran" title + ×1.5 offline efficiency | "Some journeys take time" |
| **Fibonacci** | Own generators in fibonacci sequence (1,1,2,3,5,8...) | +20% production for 5 minutes | "Nature's favorite sequence" |

### Interactive Easter Eggs

| Easter Egg | How to Trigger | Effect |
|------------|---------------|--------|
| **Konami Code** | ↑↑↓↓←→←→BA on keyboard | All entities do a spin animation, +1% permanent production |
| **Click the Void** | Click empty space on reactor 100 times | "You found nothing. Or did you?" — secret lore text appears |
| **The Developer's Note** | Type "void" on keyboard while playing | A hidden message appears in the console log from the "developer" |
| **Resonance Frequency** | Click the flux display exactly 7 times in 7 seconds | Screen vibrates, ×7 production for 7 seconds |
| **The Dark Mode** | Click settings 10 times rapidly | Secret ultra-dark reactor theme unlocks |

### Lore Secrets (Hidden text in events/descriptions)

| Location | Secret | Discovery Method |
|----------|--------|-----------------|
| Event #15 | First letter of events 10-15 spell "V-O-I-D-E-D" | Reading carefully |
| Generator descriptions | First letters of all 12 generators spell something | Collecting all generators |
| Research flavor text | Contains coordinates that reference a real location | Community discovery |
| Achievement descriptions | Hidden message across all achievement descriptions | Community collaboration |
| Reactor visual | At exactly midnight, a ghost entity briefly appears | Observant players |

---

## 💡 Implementation Approach

### Secret Achievement System

```typescript
// src/config/secrets.ts
interface SecretDef {
  id: string;
  name: string;
  description: string; // Only shown AFTER discovery
  hint?: string; // Vague hint, shown after nearby discovery
  check: (state: GameState) => boolean;
  reward: {
    type: 'production_mult' | 'click_power' | 'echoes' | 'cosmetic' | 'timed_boost';
    value: number;
    duration?: number;
  };
  discoveredMessage: string; // "You discovered: [name]! [description]"
}
```

### Engine Integration

In `checkAchievements()` (already runs every 3 seconds):
```typescript
// Check secret conditions alongside regular achievements
for (const secret of SECRETS) {
  if (!state.discoveredSecrets.includes(secret.id)) {
    if (secret.check(state)) {
      state.discoveredSecrets.push(secret.id);
      applySecretReward(state, secret);
      showSecretDiscoveryToast(secret);
    }
  }
}
```

### Keyboard Input Handler

```typescript
// src/game/secretInputHandler.ts
const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 
                         'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 
                         'KeyB', 'KeyA'];
let konamiIndex = 0;

document.addEventListener('keydown', (e) => {
  if (e.code === konamiSequence[konamiIndex]) {
    konamiIndex++;
    if (konamiIndex === konamiSequence.length) {
      triggerKonamiSecret();
      konamiIndex = 0;
    }
  } else {
    konamiIndex = 0;
  }
});
```

### State Tracking

```typescript
interface GameState {
  // ... existing
  discoveredSecrets: string[];
  secretReactorClicks: number; // for "Click the Void" tracking
  sessionClickCount: number; // for "Void Stares Back"
}
```

### UI

- Secret achievements appear in achievement list ONLY after discovery
- Before discovery: "???" placeholder (if hints are enabled in settings)
- Discovery toast: Special golden/purple animation, different from normal achievements
- Secret count: "Secrets: 3/15" shown in stats (but not which ones)

---

## 🎮 Player Experience

**Accidental Discovery:** Player happens to have exactly 42 Void Antennas. Suddenly, a golden popup: "🌟 SECRET DISCOVERED: The Answer! +42% production for 42 seconds!" They immediately tell their friends, "You won't believe what I just found..."

**Intentional Hunting:** Player sees "Secrets: 3/15" in their stats. Three out of fifteen? What are the other twelve? They start experimenting — clicking things, trying numbers, reading text more carefully. Each discovery feels like finding treasure.

**Community Effect:** Player A discovers the Konami code. Posts on Reddit: "OMG I just typed the Konami code and..." This generates discussion, upvotes, and new players. Player B discovers the Fibonacci sequence trigger. Another post. The community becomes detectives collectively hunting all 15 secrets.

---

## 📈 Why This Matters

- **Word-of-mouth driver** — players share discoveries organically
- **Community building** — collective secret hunting creates collaboration
- **Extremely cheap to implement** — condition checks + toasts
- **Infinite cultural value** — secrets become part of the game's identity
- **Replayability** — players try different things to find secrets
- **No downside** — secrets are bonuses, never requirements

---

## ⚖️ Balance Considerations

- Secret rewards should be fun but not mandatory (total: ~+20-30% production from all secrets)
- Some secrets should be discoverable by accident, some by intent, some by community
- Don't make secrets frustrating — avoid "click exactly at 3:14:15 AM on a Tuesday"
- Hints can be toggled on/off in settings for players who want them
- Secrets should be persistent — once discovered, never lost (even through prestige)
