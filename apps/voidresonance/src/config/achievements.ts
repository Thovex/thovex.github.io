export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'production' | 'clicking' | 'research' | 'prestige' | 'events' | 'milestones';
  check: (stats: AchievementStats) => boolean;
}

export interface AchievementStats {
  totalFluxEarned: number;
  totalClicks: number;
  totalTimePlayed: number;
  totalDataEarned: number;
  totalOwned: number;
  prestigeCount: number;
  researchCompleted: number;
  eventsUnlocked: number;
  maxCombo: number;
  frenzyCount: number;
  riftsClicked: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Production milestones
  { id: 'a_flux_100', name: 'First Spark', description: 'Earn 100 total flux', icon: '⚡', category: 'production',
    check: (s) => s.totalFluxEarned >= 100 },
  { id: 'a_flux_10k', name: 'Power Surge', description: 'Earn 10,000 total flux', icon: '⚡', category: 'production',
    check: (s) => s.totalFluxEarned >= 10000 },
  { id: 'a_flux_1m', name: 'Megawatt', description: 'Earn 1,000,000 total flux', icon: '⚡', category: 'production',
    check: (s) => s.totalFluxEarned >= 1_000_000 },
  { id: 'a_flux_1b', name: 'Gigavolt', description: 'Earn 1,000,000,000 total flux', icon: '⚡', category: 'production',
    check: (s) => s.totalFluxEarned >= 1_000_000_000 },
  { id: 'a_flux_1t', name: 'Terawatt Ascension', description: 'Earn 1 trillion total flux', icon: '⚡', category: 'production',
    check: (s) => s.totalFluxEarned >= 1_000_000_000_000 },

  // Clicking
  { id: 'a_click_10', name: 'Tap Tap', description: 'Click 10 times', icon: '🖱️', category: 'clicking',
    check: (s) => s.totalClicks >= 10 },
  { id: 'a_click_100', name: 'Clicker', description: 'Click 100 times', icon: '🖱️', category: 'clicking',
    check: (s) => s.totalClicks >= 100 },
  { id: 'a_click_1k', name: 'Rapid Fire', description: 'Click 1,000 times', icon: '🖱️', category: 'clicking',
    check: (s) => s.totalClicks >= 1000 },
  { id: 'a_click_10k', name: 'Machine Gun Fingers', description: 'Click 10,000 times', icon: '🖱️', category: 'clicking',
    check: (s) => s.totalClicks >= 10000 },
  { id: 'a_combo_10', name: 'Combo Starter', description: 'Reach a 10× combo', icon: '🔥', category: 'clicking',
    check: (s) => s.maxCombo >= 10 },
  { id: 'a_combo_25', name: 'Combo Master', description: 'Reach a 25× combo', icon: '🔥', category: 'clicking',
    check: (s) => s.maxCombo >= 25 },
  { id: 'a_combo_50', name: 'Combo Legend', description: 'Reach a 50× combo', icon: '🔥', category: 'clicking',
    check: (s) => s.maxCombo >= 50 },

  // Generators
  { id: 'a_gen_10', name: 'Small Army', description: 'Own 10 total generators', icon: '⚙', category: 'milestones',
    check: (s) => s.totalOwned >= 10 },
  { id: 'a_gen_50', name: 'Growing Force', description: 'Own 50 total generators', icon: '⚙', category: 'milestones',
    check: (s) => s.totalOwned >= 50 },
  { id: 'a_gen_200', name: 'Entity Swarm', description: 'Own 200 total generators', icon: '⚙', category: 'milestones',
    check: (s) => s.totalOwned >= 200 },
  { id: 'a_gen_500', name: 'Legion', description: 'Own 500 total generators', icon: '⚙', category: 'milestones',
    check: (s) => s.totalOwned >= 500 },

  // Research
  { id: 'a_res_1', name: 'Scholar', description: 'Complete 1 research', icon: '◇', category: 'research',
    check: (s) => s.researchCompleted >= 1 },
  { id: 'a_res_5', name: 'Researcher', description: 'Complete 5 researches', icon: '◇', category: 'research',
    check: (s) => s.researchCompleted >= 5 },
  { id: 'a_res_10', name: 'Void Scientist', description: 'Complete 10 researches', icon: '◇', category: 'research',
    check: (s) => s.researchCompleted >= 10 },
  { id: 'a_res_all', name: 'Omniscient', description: 'Complete all 18 researches', icon: '◇', category: 'research',
    check: (s) => s.researchCompleted >= 18 },

  // Prestige
  { id: 'a_prestige_1', name: 'Echo Chamber', description: 'Prestige for the first time', icon: '◈', category: 'prestige',
    check: (s) => s.prestigeCount >= 1 },
  { id: 'a_prestige_5', name: 'Time Loop', description: 'Prestige 5 times', icon: '◈', category: 'prestige',
    check: (s) => s.prestigeCount >= 5 },
  { id: 'a_prestige_10', name: 'Eternal Return', description: 'Prestige 10 times', icon: '◈', category: 'prestige',
    check: (s) => s.prestigeCount >= 10 },

  // Events
  { id: 'a_events_5', name: 'Signal Listener', description: 'Unlock 5 events', icon: '▣', category: 'events',
    check: (s) => s.eventsUnlocked >= 5 },
  { id: 'a_events_15', name: 'Void Whisperer', description: 'Unlock 15 events', icon: '▣', category: 'events',
    check: (s) => s.eventsUnlocked >= 15 },
  { id: 'a_events_all', name: 'All Signals Received', description: 'Unlock all 28 events', icon: '▣', category: 'events',
    check: (s) => s.eventsUnlocked >= 28 },

  // Frenzy
  { id: 'a_frenzy_1', name: 'First Frenzy', description: 'Activate frenzy for the first time', icon: '⚡', category: 'clicking',
    check: (s) => s.frenzyCount >= 1 },
  { id: 'a_frenzy_10', name: 'Frenzy Addict', description: 'Activate frenzy 10 times', icon: '⚡', category: 'clicking',
    check: (s) => s.frenzyCount >= 10 },

  // Rifts
  { id: 'a_rift_1', name: 'Rift Walker', description: 'Click your first void rift', icon: '◉', category: 'events',
    check: (s) => s.riftsClicked >= 1 },
  { id: 'a_rift_10', name: 'Rift Hunter', description: 'Click 10 void rifts', icon: '◉', category: 'events',
    check: (s) => s.riftsClicked >= 10 },
  { id: 'a_rift_50', name: 'Rift Master', description: 'Click 50 void rifts', icon: '◉', category: 'events',
    check: (s) => s.riftsClicked >= 50 },

  // Time played
  { id: 'a_time_1h', name: 'Dedicated', description: 'Play for 1 hour total', icon: '⏱', category: 'milestones',
    check: (s) => s.totalTimePlayed >= 3600 },
  { id: 'a_time_24h', name: 'Void Dweller', description: 'Play for 24 hours total', icon: '⏱', category: 'milestones',
    check: (s) => s.totalTimePlayed >= 86400 },

  // Data
  { id: 'a_data_100', name: 'Data Collector', description: 'Earn 100 total data', icon: '📊', category: 'production',
    check: (s) => s.totalDataEarned >= 100 },
  { id: 'a_data_10k', name: 'Data Hoarder', description: 'Earn 10,000 total data', icon: '📊', category: 'production',
    check: (s) => s.totalDataEarned >= 10000 },
];
