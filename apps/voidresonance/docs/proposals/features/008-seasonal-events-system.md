# Feature Proposal: Seasonal Events System

## 📋 Overview

| Attribute | Rating |
|-----------|--------|
| **Impact** | ⭐⭐⭐⭐ (4/5) |
| **Fun Factor** | ⭐⭐⭐⭐⭐ (5/5) |
| **Complexity** | ⭐⭐⭐⭐ (4/5) |
| **Priority** | 🟢 Long-term |
| **Estimated Effort** | 5-7 days per event |
| **Dependencies** | Core mechanics stable |
| **Risk** | Medium — requires ongoing content creation |

---

## 🎯 Pitch

Cookie Clicker's seasonal events (Christmas, Halloween, Easter, Valentine's) are responsible for massive player return spikes. Players who haven't played in months come back for seasonal content. Seasonal events create **FOMO (Fear of Missing Out)** — the most powerful retention tool in gaming.

**The concept:** Time-limited events that rotate on a schedule, each with unique mechanics, themed visuals, special rewards, and exclusive achievements. Events last 1-2 weeks and repeat annually, with new content added each year.

For a space/void-themed game, we can create thematic "cosmic events" tied to real-world time periods rather than traditional holidays — making them feel native to the game's universe.

---

## 🔧 Proposed Events

### Event 1: Void Storm Season (January)
| Property | Detail |
|----------|--------|
| **Theme** | Chaotic energy storm sweeps through the void |
| **Duration** | 2 weeks |
| **Mechanic** | Rift frequency ×3, but "storm rifts" appear that drain flux if not clicked within 3s |
| **Bonus** | All production ×1.5 during event |
| **Exclusive Reward** | "Storm Survivor" achievement (+5% production, permanent) |
| **Visual** | Reactor background turns turbulent, lightning effects, entities wobble erratically |
| **Exclusive Item** | Storm Core generator skin (cosmetic) |

### Event 2: Data Harvest Festival (March/April)
| Property | Detail |
|----------|--------|
| **Theme** | The void yields an abundance of data signals |
| **Duration** | 10 days |
| **Mechanic** | Data generation ×5, special "data nodes" appear on reactor that can be clicked for bonus data |
| **Bonus** | Research speed ×2 during event |
| **Exclusive Reward** | "Data Harvester" achievement, +25% permanent data rate |
| **Visual** | Green data streams flow across reactor, matrix-rain effect |
| **Exclusive Item** | Data Stream reactor theme |

### Event 3: Stellar Convergence (June/July)
| Property | Detail |
|----------|--------|
| **Theme** | Multiple void dimensions briefly align |
| **Duration** | 1 week |
| **Mechanic** | All generator synergies are ×2 for the event. Special "convergence points" appear connecting generators visually |
| **Bonus** | Echo gain ×2 during event |
| **Exclusive Reward** | "Convergence Witness" achievement |
| **Visual** | Brilliant golden lines connect entities, aurora borealis effect |
| **Exclusive Item** | Convergence Crown (generator milestone visual) |

### Event 4: Void Eclipse (October)
| Property | Detail |
|----------|--------|
| **Theme** | A dark entity consumes the void — spooky/dark theme |
| **Duration** | 2 weeks |
| **Mechanic** | Production slowly decays over time unless players click "shadow entities" that appear. Clicking shadow entities provides ×10 production burst for 30s |
| **Bonus** | Click damage ×3 during event |
| **Exclusive Reward** | "Eclipse Survivor" achievement, unlock Shadow generator skin |
| **Visual** | Dark reactor theme, shadow entities with red eyes, eerie particle effects |
| **Exclusive Item** | Shadow Reactor skin |

### Event 5: Resonance Day (December)
| Property | Detail |
|----------|--------|
| **Theme** | The void resonates with harmony — celebration theme |
| **Duration** | 2 weeks |
| **Mechanic** | Gift boxes appear on reactor (like rifts) containing random rewards. Daily login during event grants escalating bonuses |
| **Bonus** | All production ×2, all rewards ×2 |
| **Exclusive Reward** | "Resonance Reveler" achievement, exclusive particles |
| **Visual** | Warm glow effects, gift particles, celebratory entity trails |
| **Exclusive Item** | Resonance Glow reactor theme |

---

## 💡 Implementation Approach

### Event System Architecture

```typescript
// src/config/seasonalEvents.ts
interface SeasonalEventDef {
  id: string;
  name: string;
  description: string;
  startMonth: number; // 0-11
  startDay: number;
  durationDays: number;
  theme: {
    backgroundColor: string;
    particleColor: string;
    entityGlow: string;
    specialEffects: string[];
  };
  modifiers: {
    productionMult?: number;
    dataMult?: number;
    echoMult?: number;
    clickMult?: number;
    riftFrequencyMult?: number;
    researchSpeedMult?: number;
  };
  specialMechanic: string; // ID reference to mechanic handler
  exclusiveAchievements: AchievementDef[];
  exclusiveRewards: RewardDef[];
}
```

### Event Manager

```typescript
// src/game/eventManager.ts
class SeasonalEventManager {
  getCurrentEvent(): SeasonalEventDef | null {
    const now = new Date();
    return SEASONAL_EVENTS.find(event => {
      const start = new Date(now.getFullYear(), event.startMonth, event.startDay);
      const end = new Date(start.getTime() + event.durationDays * 86400000);
      return now >= start && now <= end;
    }) ?? null;
  }
  
  getEventModifiers(): EventModifiers { /* ... */ }
  isEventActive(eventId: string): boolean { /* ... */ }
}
```

### Engine Integration

- Check for active seasonal event in `tick()`
- Apply event production modifiers to global multiplier chain
- Spawn event-specific entities (storm rifts, data nodes, shadow entities, gifts)
- Track event-specific progress (shadow entities clicked, gifts collected)

### Visual System

- Event-specific background rendering in `drawEffects.ts`
- New entity types per event in `drawEntities.ts`
- Event banner at top of screen with countdown timer
- Themed UI color palette during events

### State Persistence

```typescript
interface GameState {
  // ... existing
  seasonalProgress: Record<string, {
    year: number;
    participated: boolean;
    exclusiveRewardsClaimed: string[];
    eventSpecificStats: Record<string, number>;
  }>;
}
```

---

## 🎮 Player Experience

**Pre-Event:** A countdown banner appears 3 days before: "Void Storm Season begins in 3 days!" Players who have left the game receive a notification (if enabled) or see it on return.

**During Event:** The reactor transforms visually. New mechanics create fresh gameplay. Exclusive achievements create urgency — "I need to complete this before the event ends!" Players share progress on social media.

**Post-Event:** Event ends, normal gameplay resumes. But exclusive rewards persist as badges of participation. Players who missed it see other players' exclusive skins and think "I need to catch the next one."

**Annual Return:** Same event returns next year with added content (new exclusive rewards, harder challenges). Veteran players show off year-1 exclusives.

---

## 📈 Why This Matters

- **Creates recurring player return spikes** — Cookie Clicker sees 200-300% traffic during seasonals
- **FOMO is the strongest retention tool** — exclusive time-limited rewards drive engagement
- **Fresh content without new systems** — events reuse existing mechanics with modifiers
- **Community building** — shared event experiences create conversations
- **Monetization-friendly** — premium event passes, exclusive cosmetics (optional)
- **Content scalability** — new events can be added each year

---

## ⚖️ Balance Considerations

- Event bonuses should feel generous but not break progression permanently
- Exclusive permanent rewards should be modest (+5-10% bonuses, not ×2 multipliers)
- Events should be completable by casual players (not just hardcore grinders)
- Consider "catch-up" mechanics for players who join mid-event
- Exclusive cosmetics are the best rewards — they don't affect balance but create desire
- Don't punish players for missing events — permanent bonuses should be nice-to-have, not essential
