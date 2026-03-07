# Void Resonance — ClickerSpace

A browser-based idle/incremental game set in a strange corner of subspace. Harvest flux from the void, build increasingly absurd machines, research questionable theories, and eventually reset reality itself for permanent power.

Built with React + TypeScript + Vite. Runs entirely in the browser with local save data — no backend required.

![Void Resonance Screenshot](https://github.com/user-attachments/assets/7ab21992-cfd0-4442-8df0-4fa3adca804e)

## Game Premise

You operate a mysterious deep-space signal processor that harvests **flux** — raw energy extracted from the void between stars. Click to gather flux manually, then invest in increasingly powerful (and increasingly weird) generators that produce flux automatically.

As your operation grows, you'll unlock:
- **12 generators** from Void Antennas to The God Engine
- **25+ upgrades** for clicks, generators, global production, offline efficiency, and research speed
- **16 research nodes** with prerequisites forming a tech tree
- **Data** as a secondary resource generated from flux production
- **The Echo Chamber** — a prestige system that lets you reset for permanent bonuses
- **28 signal log entries** with dry, mysterious, occasionally hilarious flavor text
- **Offline progress** that calculates gains while you're away

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Language | TypeScript |
| Build Tool | Vite |
| State Management | Zustand |
| Styling | Plain CSS (no framework) |
| Persistence | localStorage |

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The game runs at `http://localhost:5173` by default.

## Save System

Saving is automatic and reliable:

- **Auto-save** every 10 seconds
- **Manual save** button in Settings tab
- **Export** save to a `.json` file for backup
- **Import** save from a previously exported `.json` file
- **Reset** with double confirmation prompt
- **Offline progress** calculated when reopening the game (up to 24 hours, with configurable efficiency)
- **Save versioning** built in for future migration support

All data is stored in `localStorage` under the key `clickerspace_save`.

## Folder Structure

```
src/
├── main.tsx                    # Entry point
├── App.tsx                     # Root component with game loop
├── App.css                     # Global styles
├── vite-env.d.ts               # Vite type declarations
├── game/
│   ├── types.ts                # All TypeScript interfaces and default state
│   ├── engine.ts               # Game formulas (costs, production, prestige, offline)
│   └── store.ts                # Zustand store with all game actions
├── config/
│   ├── generators.ts           # 12 generator definitions
│   ├── upgrades.ts             # 25+ upgrade definitions
│   ├── research.ts             # 16 research node definitions
│   ├── prestige.ts             # 11 prestige upgrade definitions
│   └── events.ts               # 28 event/log message definitions
├── components/
│   ├── useGameLoop.ts          # requestAnimationFrame tick hook
│   ├── Header.tsx/css          # Resource display header
│   ├── ClickButton.tsx/css     # Main click interaction
│   ├── TabBar.tsx/css          # Navigation tabs
│   ├── GeneratorPanel.tsx/css  # Generator list with buy controls
│   ├── UpgradePanel.tsx/css    # Upgrade cards
│   ├── ResearchPanel.tsx/css   # Research tree with progress
│   ├── PrestigePanel.tsx/css   # Echo Chamber prestige system
│   ├── EventPanel.tsx/css      # Signal log
│   ├── SettingsPanel.tsx/css   # Save/stats/premium
│   └── OfflinePopup.tsx/css    # Welcome back overlay
└── utils/
    └── numberFormatting.ts     # Number display (1.2K, 3.4M, etc.)
```

## How to Tweak Balancing

All game data is defined in `src/config/` as simple arrays of typed objects:

### Adding a Generator
Edit `src/config/generators.ts` and add an entry:
```ts
{
  id: 'myGenerator',
  name: 'My Generator',
  description: 'Does cool things.',
  baseCost: 1000,       // starting price
  costGrowth: 1.15,     // cost multiplier per owned
  baseProduction: 10,   // flux per second per unit
  unlockAt: 500,        // total flux earned to reveal
  tier: 2,              // visual tier (1-6)
}
```

### Adding an Upgrade
Edit `src/config/upgrades.ts`:
```ts
{
  id: 'myUpgrade',
  name: 'My Upgrade',
  description: 'Does something.',
  cost: 5000,
  costResource: 'flux',  // or 'data'
  unlockAt: 3000,
  effect: { type: 'globalMultiplier', value: 1.5 },
  maxLevel: 1,
  flavorText: 'Optional witty comment.',
}
```

### Key Formulas (in `src/game/engine.ts`)

- **Generator cost**: `baseCost × costGrowth^owned` (with prestige reduction)
- **Upgrade cost**: `baseCost × 3^currentLevel` (for multi-level upgrades)
- **Production**: `baseProduction × owned × generatorMult × globalMult`
- **Data rate**: `log10(fluxPerSecond) × 0.5 × dataRateMult`
- **Echo gain**: `√(totalFluxEarned / 1,000,000)` (with research/prestige bonuses)
- **Offline efficiency**: base 25%, upgradeable to 100%

## Core Systems

### Primary Loop
Generate flux through clicking and automated generators. Buy generators with increasing costs, purchase upgrades to multiply production.

### Research
Unlocks at 10K total flux. Costs data (secondary resource). Nodes have prerequisites forming a tree. One node at a time, with real-time progress. Research provides permanent production boosts, click multipliers, and system unlocks.

### Prestige (Echo Chamber)
Unlocked by completing "Echo Theory" research (requires 1M+ flux reach). Reset your run to earn **Echoes** — a permanent meta-currency that buys upgrades that persist across resets. Changes strategy, not just speed.

### Premium Support
A $1 "Support the Developer" tier (demo toggle in prototype) provides:
- +5% base production
- +10% data generation rate
- Access to exclusive "Patron's Echo" prestige upgrade
- Nothing game-breaking — just a small thank-you

## Number Formatting

| Value | Display |
|-------|---------|
| 999 | 999 |
| 1,234 | 1.2K |
| 1,234,567 | 1.2M |
| 1,234,567,890 | 1.2B |
| 10^15+ | Scientific notation |

## Known Limitations

- No sound effects (planned)
- No achievement system yet
- No theme toggle (dark mode only)
- Research can only run one node at a time
- No keyboard shortcuts yet
- Premium toggle is a demo — no real payment integration
- Balance may need tuning for late-game pacing

## Suggested Next Features

- Achievement/milestone system
- Sound effects (Web Audio API generated tones)
- Light/dark theme toggle
- Keyboard shortcuts (spacebar to click, number keys for tabs)
- More research branches
- Additional prestige layers
- Particle effects on purchases
- Animated number transitions
- Real payment integration for supporter tier
- IndexedDB for larger save data
- Basic test coverage for formulas and save/load