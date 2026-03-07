import { useGameStore } from '../game/store';
import type { GameState } from '../game/types';
import { isPrestigeUnlocked } from '../game/engine';
import './TabBar.css';

const TABS: { id: GameState['activeTab']; label: string; icon: string }[] = [
  { id: 'generators', label: 'Generators', icon: '⚙' },
  { id: 'upgrades', label: 'Upgrades', icon: '⬆' },
  { id: 'research', label: 'Research', icon: '🔬' },
  { id: 'prestige', label: 'Echoes', icon: '🔮' },
  { id: 'events', label: 'Signals', icon: '📡' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export function TabBar() {
  const activeTab = useGameStore((s) => s.activeTab);
  const setActiveTab = useGameStore((s) => s.setActiveTab);
  const totalFluxEarned = useGameStore((s) => s.totalFluxEarned);
  const state = useGameStore();

  return (
    <nav className="tab-bar">
      {TABS.map(tab => {
        if (tab.id === 'research' && totalFluxEarned < 10000) return null;
        if (tab.id === 'prestige' && !isPrestigeUnlocked(state) && totalFluxEarned < 1000000) return null;

        return (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
