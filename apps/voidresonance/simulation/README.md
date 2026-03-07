# ClickerSpace Progression Simulator

A Python-based simulation tool that reads the game's configuration values and
models idle-game progression to estimate time-to-milestone. Use it to test
balance changes without running the live game.

## Quick Start

```bash
cd simulation
python sim.py                        # Full 1-week idle simulation
python sim.py --max-hours 48         # 48-hour simulation
python sim.py --clicks-per-sec 5     # Simulate active clicking
python sim.py --verbose              # Print milestones as they're reached
python sim.py --ascendancy observer  # Force ascendancy path
```

## How It Works

The simulator reads JSON config files from `config/` that mirror the game's
TypeScript configuration:

| Config File           | Game Source                    | Contents                          |
|-----------------------|--------------------------------|-----------------------------------|
| `generators.json`     | `src/config/generators.ts`     | Generator costs, production, tiers|
| `upgrades.json`       | `src/config/upgrades.ts`       | Upgrade effects and costs         |
| `prestige.json`       | `src/config/prestige.ts`       | Echo system and prestige upgrades |
| `void_shards.json`    | `src/config/voidShards.ts`     | 2nd prestige layer                |
| `singularity.json`    | `src/config/singularity.ts`    | 3rd prestige layer                |
| `milestones.json`     | `src/config/milestones.ts`     | Generator milestone thresholds    |
| `research.json`       | `src/config/research.ts`       | Research tree nodes               |
| `ascendancy.json`     | `src/config/ascendancy.ts`     | Ascendancy paths and mastery      |

### Simulation AI

The sim models a "reasonably optimal" player:

- **Bootstrap**: Simulates clicking until the first generator can be purchased
- **Generator buying**: Always buys the best production-per-cost generator
- **Upgrades**: Purchases all affordable upgrades as they unlock
- **Research**: Starts the cheapest available research node, prioritizes system
  unlocks (prestige theory, void collapse theory) by delaying prestige until
  they complete
- **Prestige**: First prestige ASAP (1 echo), then waits for 5%+ gain over
  current total. Won't prestige while critical research is in progress.
- **Void collapse**: Collapses when shards can be gained and echo research is
  complete
- **Singularity**: Triggers when conditions are met

### Adaptive Time Stepping

The simulation uses adaptive time stepping to speed through idle phases:
when flux production is stable (< 0.1% change), the tick rate increases up
to 60× to quickly cover boring periods. It slows back down when purchases
or prestiges change the production rate.

## CLI Options

| Flag                  | Default | Description                                  |
|-----------------------|---------|----------------------------------------------|
| `--max-hours N`       | 168     | Maximum simulation hours (168 = 1 week)      |
| `--clicks-per-sec N`  | 0       | Clicks/sec (0 = pure idle, 2 = casual)       |
| `--ascendancy PATH`   | auto    | Force ascendancy: architect/channeler/observer|
| `--verbose` / `-v`    | off     | Print every milestone as it's reached         |
| `--dt N`              | 1.0     | Base tick interval in seconds                 |
| `--no-adaptive`       | off     | Disable adaptive time stepping                |

## Example Output

```
─── Phase Timing Summary ───
  First Void Antenna            : 4s
  Total flux ≥ 1.00K            : 2.8m
  Total flux ≥ 100.00K          : 8.0m
  Total flux ≥ 1.00M            : 11.0m
  Prestige #1                   : 11.2m
  Prestige #10                  : 1.4h
  Total echoes ≥ 1.00K          : 6.6h
  Void collapse #1              : 1.6d
  Singularity #1                : 1.7d
```

## Tweaking Balance

1. Edit any JSON file in `config/`
2. Run `python sim.py --verbose` to see the impact
3. When satisfied, update the corresponding TypeScript config in `src/config/`

The JSON files should always stay in sync with the TypeScript configs.
When running the sim after a game config change, update the JSON first.

## Formulas Reference

| System            | Formula                                             |
|-------------------|-----------------------------------------------------|
| Generator cost    | `baseCost × costGrowth^owned × costReduction`       |
| Upgrade cost      | `cost × 3^currentLevel`                             |
| Prestige cost     | `baseCost × (currentLevel + 1)`                     |
| Echo gain         | `floor(sqrt(totalFlux / 1M)) × bonuses`             |
| Void shard gain   | `floor(sqrt(totalEchoes / 100)) × bonuses`          |
| Fragment gain     | `floor(sqrt(totalVoidShards / 10)) × bonuses`       |
| Data/sec          | `log10(flux/sec) × 0.5 × rateMult`                  |
| Click value       | `(flat + flux/sec × 5%) × multipliers`              |
