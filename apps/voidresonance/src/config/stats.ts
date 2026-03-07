export interface StatUnlockDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: number;
  costResource: 'flux' | 'data';
  category: 'production' | 'clicking' | 'efficiency' | 'time' | 'advanced';
}

export const STAT_UNLOCKS: StatUnlockDef[] = [
  // Production stats
  { id: 'stat_fps', name: 'Production Monitor', description: 'Shows flux per second breakdown by generator',
    icon: '📈', cost: 50, costResource: 'data', category: 'production' },
  { id: 'stat_total_flux', name: 'Lifetime Flux Tracker', description: 'Shows total flux earned across all time',
    icon: '⚡', cost: 20, costResource: 'data', category: 'production' },
  { id: 'stat_total_data', name: 'Data Accumulation Log', description: 'Shows total data earned',
    icon: '📊', cost: 30, costResource: 'data', category: 'production' },
  { id: 'stat_gen_breakdown', name: 'Generator Census', description: 'Shows owned count per generator type',
    icon: '⚙', cost: 80, costResource: 'data', category: 'production' },
  { id: 'stat_multipliers', name: 'Multiplier Analysis', description: 'Shows all active production multipliers',
    icon: '×', cost: 120, costResource: 'data', category: 'production' },

  // Clicking stats
  { id: 'stat_clicks', name: 'Click Counter', description: 'Shows total clicks and click value',
    icon: '🖱️', cost: 10, costResource: 'data', category: 'clicking' },
  { id: 'stat_combo', name: 'Combo Tracker', description: 'Shows max combo reached and current combo',
    icon: '🔥', cost: 40, costResource: 'data', category: 'clicking' },
  { id: 'stat_crits', name: 'Critical Hit Log', description: 'Shows critical hit rate and total crits',
    icon: '💥', cost: 60, costResource: 'data', category: 'clicking' },
  { id: 'stat_frenzy', name: 'Frenzy Analytics', description: 'Shows frenzy activations and charge rate',
    icon: '⚡', cost: 70, costResource: 'data', category: 'clicking' },

  // Efficiency stats
  { id: 'stat_flux_per_click', name: 'Click Efficiency', description: 'Shows flux earned per click on average',
    icon: '📉', cost: 100, costResource: 'data', category: 'efficiency' },
  { id: 'stat_best_generator', name: 'Best Generator Analysis', description: 'Shows which generator produces the most',
    icon: '🏆', cost: 90, costResource: 'data', category: 'efficiency' },
  { id: 'stat_cost_efficiency', name: 'Cost Efficiency Metrics', description: 'Shows flux/second gained per flux spent',
    icon: '💰', cost: 150, costResource: 'data', category: 'efficiency' },

  // Time stats
  { id: 'stat_time', name: 'Session Timer', description: 'Shows total time played and current session',
    icon: '⏱', cost: 15, costResource: 'data', category: 'time' },
  { id: 'stat_prestige', name: 'Prestige History', description: 'Shows prestige count and echo totals',
    icon: '◈', cost: 100, costResource: 'data', category: 'time' },
  { id: 'stat_events', name: 'Event Log Stats', description: 'Shows events unlocked and discovery rate',
    icon: '▣', cost: 50, costResource: 'data', category: 'time' },

  // Advanced stats
  { id: 'stat_research', name: 'Research Progress', description: 'Shows research completion rate and speed',
    icon: '◇', cost: 80, costResource: 'data', category: 'advanced' },
  { id: 'stat_achievements', name: 'Achievement Progress', description: 'Shows achievement completion rate',
    icon: '🏅', cost: 60, costResource: 'data', category: 'advanced' },
  { id: 'stat_rifts', name: 'Void Rift Tracker', description: 'Shows rifts clicked and rift bonuses',
    icon: '◉', cost: 100, costResource: 'data', category: 'advanced' },
  { id: 'stat_random_events', name: 'Surge Monitor', description: 'Shows active and past random events',
    icon: '🌀', cost: 70, costResource: 'data', category: 'advanced' },
];
