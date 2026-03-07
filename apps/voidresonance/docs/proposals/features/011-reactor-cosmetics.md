# Feature Proposal: Reactor Cosmetics & Visual Customization

## 📋 Overview

| Attribute | Rating |
|-----------|--------|
| **Impact** | ⭐⭐⭐ (3/5) |
| **Fun Factor** | ⭐⭐⭐⭐ (4/5) |
| **Complexity** | ⭐⭐⭐ (3/5) |
| **Priority** | 🟢 Long-term |
| **Estimated Effort** | 3-5 days |
| **Dependencies** | None |
| **Risk** | Low |

---

## 🎯 Pitch

The reactor visualization is Void Reactor's signature feature — it's the "idle spectacle" that makes our game visually distinctive. But currently, every player's reactor looks the same. Cosmetic customization is a proven engagement and monetization lever that:

1. Gives players ownership over their experience
2. Creates aspirational goals ("I want THAT skin")
3. Provides non-pay-to-win monetization options
4. Rewards achievement/milestone completion with visual proof

Cookie Clicker's milk types, background changes, and cursor cosmetics are beloved. Idle Breakout's ball skins drive engagement. Visual customization is the most player-friendly form of progression reward.

**The concept:** A cosmetic system with reactor themes, entity skins, particle effects, and core styles — earned through gameplay achievements, prestige milestones, challenges, and seasonal events.

---

## 🔧 Proposed Cosmetic Categories

### 1. Reactor Themes (Background/Atmosphere)

| Theme | Unlock Method | Visual |
|-------|---------------|--------|
| **Default Void** | Starting | Dark space with subtle stars |
| **Deep Space** | 1 hour played | Nebula swirls, distant galaxies |
| **Quantum Field** | Complete all research | Grid lines with probability waves |
| **Data Matrix** | Earn 100K total data | Green matrix-rain overlays |
| **Storm Front** | Click 100 void rifts | Turbulent clouds with lightning |
| **Crimson Void** | 10 prestiges | Deep red atmosphere with ember particles |
| **Golden Hour** | Click a Golden Rift | Warm golden glow with light rays |
| **Shadow Realm** | Complete Void Eclipse event | Ultra-dark with red accent lighting |
| **Prismatic** | All achievements unlocked | Rainbow gradient shift |
| **The Abyss** | First void collapse | Pure black with faint white entities |

### 2. Entity Skins (Generator Visual Styles)

| Skin Set | Unlock Method | Visual Change |
|----------|---------------|---------------|
| **Classic Orbs** | Default | Simple colored circles |
| **Geometric** | 50 total generators | Polygons (triangles, hexagons, etc.) |
| **Crystalline** | Reach Tier 4 generators | Faceted crystal shapes |
| **Flame** | 10 frenzy activations | Fire particle trails on entities |
| **Ghost** | "Patience is a Virtue" secret | Translucent with glow halos |
| **Mechanical** | All generator milestones | Gear/cog-styled entities |
| **Starlight** | Reach 1T total flux | Brilliant star points with rays |
| **Void Touched** | First prestige | Dark entities with void aura |

### 3. Core Styles (Central Reactor Core)

| Style | Unlock Method | Visual |
|-------|---------------|--------|
| **Standard Core** | Default | Pulsing white circle |
| **Plasma Core** | 10K total clicks | Animated plasma ball |
| **Crystal Core** | Buy 5 stat unlocks | Rotating crystal |
| **Black Hole** | Reach Tier 6 generators | Gravitational lens distortion |
| **Supernova** | 100 void rifts clicked | Exploding star animation |
| **Void Eye** | "The Void Stares Back" secret | Blinking eye that follows cursor |

### 4. Particle Effects (Click/Production Visuals)

| Effect | Unlock Method | Visual |
|--------|---------------|--------|
| **Standard Sparks** | Default | Small white particles |
| **Stardust** | 1000 total clicks | Glittering multi-color particles |
| **Data Bits** | Earn 10K data | Binary 0/1 floating numbers |
| **Void Wisps** | Click 25 rifts | Curving smoke-like trails |
| **Lightning** | Reach 50× combo | Electric arcs between entities |
| **Cherry Blossoms** | Play during spring equinox | Falling petal particles |

---

## 💡 Implementation Approach

### Data Model

```typescript
// src/config/cosmetics.ts
interface CosmeticDef {
  id: string;
  name: string;
  category: 'theme' | 'entity_skin' | 'core_style' | 'particle_effect';
  description: string;
  preview: string; // Description of visual for tooltip
  unlockCondition: {
    type: 'achievement' | 'stat' | 'prestige' | 'secret' | 'event' | 'time' | 'default';
    value?: string | number;
  };
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

// State
interface GameState {
  cosmetics: {
    unlockedCosmetics: string[];
    activeTheme: string;
    activeEntitySkin: string;
    activeCoreStyle: string;
    activeParticleEffect: string;
  };
}
```

### Rendering Integration

In the reactor rendering pipeline:

```typescript
// src/components/reactor/drawEffects.ts
function getThemeConfig(themeId: string): ThemeRenderConfig {
  // Returns background colors, particle configs, special effects
  return THEME_CONFIGS[themeId] ?? THEME_CONFIGS['default'];
}

// src/components/reactor/drawEntities.ts  
function getEntityRenderer(skinId: string): EntityDrawFunction {
  // Returns the draw function for the selected skin
  return ENTITY_RENDERERS[skinId] ?? ENTITY_RENDERERS['classic'];
}
```

Each skin/theme is a set of render parameters (colors, shapes, particle configs) passed to existing draw functions — NOT entirely new renderers.

### UI: Cosmetics Panel

Create a "Wardrobe" section in Settings or a new tab:
- Grid display of all cosmetics by category
- Locked items show silhouette with unlock condition
- Preview pane showing how the reactor looks with selected cosmetics
- "Apply" button to set active cosmetics
- Rarity badges (common=white, uncommon=green, rare=blue, legendary=purple)

---

## 🎮 Player Experience

**First Unlock:** Player reaches 1 hour of play. Toast: "🎨 New cosmetic unlocked: Deep Space theme!" They open the wardrobe, see the preview, and apply it. The reactor transforms with nebula swirls. "This is MY reactor now."

**The Aspiration:** Player sees the "Prismatic" theme (locked, requires all achievements). It looks incredible in the preview. This becomes a long-term goal that motivates them to 100% the achievement list.

**The Collection:** Over time, the player accumulates 20+ cosmetics. Mixing and matching themes, skins, cores, and particles creates a unique combination. Their reactor looks completely different from any other player's.

**The Flex:** If social features are ever added, cosmetics become the primary way players express their progress and achievements to others.

---

## 📈 Why This Matters

- **Zero balance impact** — purely visual, no competitive advantage
- **Strong retention** — "gotta collect 'em all" mentality
- **Monetization potential** — premium cosmetics (future, if desired)
- **Emotional attachment** — personalized reactor feels like "mine"
- **Complements every other feature** — achievements, challenges, events all can reward cosmetics
- **Visual spectacle** — makes the reactor (our #1 visual selling point) even more impressive

---

## ⚖️ Balance Considerations

- Cosmetics must be purely visual — no gameplay advantage
- Enough cosmetics should be easily unlockable that new players don't feel left out
- Rare/legendary cosmetics should require real achievement, not just time
- Performance impact: skins should use same render pipeline, just different parameters
- Accessibility: ensure all themes maintain readable text contrast
- Some skins may need graphics quality tier adjustments (no heavy particle effects on "low" quality)
