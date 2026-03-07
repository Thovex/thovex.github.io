import { useEffect, useState, useMemo } from 'react';
import { useGameStore, startAutoSave } from './game/store';
import { useGameLoop } from './components/useGameLoop';
import { useSettingsStore } from './store/settingsStore';
import { startSessionTracker, stopSessionTracker } from './utils/sessionHistory';
import { Header } from './components/Header';
import { ReactorViewer } from './components/ReactorViewer';
import { GeneratorPanel } from './components/GeneratorPanel';
import { UpgradePanel } from './components/UpgradePanel';
import { ResearchPanel } from './components/ResearchPanel';
import { PrestigePanel } from './components/PrestigePanel';
import { EventPanel } from './components/EventPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { StatsPanel } from './components/StatsPanel';
import { ExpeditionPanel } from './components/ExpeditionPanel';
import { VoidShardPanel } from './components/VoidShardPanel';
import { AscendancyPanel } from './components/AscendancyPanel';
import { SingularityPanel } from './components/SingularityPanel';
import { CheatPanel } from './components/CheatPanel';
import { OfflinePopup } from './components/OfflinePopup';
import { ToastNotification } from './components/ToastNotification';
import { PrestigeAnimation } from './components/PrestigeAnimation';
import { playTabSound } from './audio/SoundManager';
import { getAffordableCounts } from './game/badges';
import './App.css';

type SidePanel = 'generators' | 'upgrades' | 'research' | 'prestige' | 'events' | 'stats' | 'settings' | 'voidshards' | 'ascendancy' | 'singularity';

export default function App() {
  const loadGame = useGameStore((s) => s.loadGame);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const scanLines = useSettingsStore((s) => s.scanLines);
  const theme = useSettingsStore((s) => s.theme);
  const graphicsQuality = useSettingsStore((s) => s.graphicsQuality);

  const [leftPanel, setLeftPanel] = useState<SidePanel>('generators');
  const [rightPanel, setRightPanel] = useState<SidePanel>('prestige');
  const [centerPanel, setCenterPanel] = useState<'reactor' | 'expeditions'>('reactor');

  const hasActiveExpedition = useGameStore((s) => !!s.expeditions.activeExpedition);
  const hasPendingResult = useGameStore((s) => !!s.expeditions.pendingResult);
  const expeditionUnlocked = useGameStore((s) => s.totalFluxEarned >= 100_000);

  useGameLoop();

  useEffect(() => {
    loadSettings();
    loadGame();
    startAutoSave();
    startSessionTracker();
    return () => stopSessionTracker();
  }, [loadGame, loadSettings]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const renderPanel = (panel: SidePanel) => {
    switch (panel) {
      case 'generators': return <GeneratorPanel />;
      case 'upgrades': return <UpgradePanel />;
      case 'research': return <ResearchPanel />;
      case 'prestige': return <PrestigePanel />;
      case 'events': return <EventPanel />;
      case 'stats': return <StatsPanel />;
      case 'settings': return <SettingsPanel />;
      case 'voidshards': return <VoidShardPanel />;
      case 'ascendancy': return <AscendancyPanel />;
      case 'singularity': return <SingularityPanel />;
    }
  };

  const hasVoidShards = useGameStore((s) => s.voidCollapseCount > 0 || s.totalVoidShards > 0 || (s.research['r_void_collapse']?.completed === true));
  const hasAscendancy = useGameStore((s) => s.voidCollapseCount >= 1);
  const hasSingularity = useGameStore((s) => s.singularityCount > 0 || s.totalRealityFragments > 0 || (s.voidCollapseCount >= 10 && Object.values(s.ascendancy.pathMastery).some(m => m >= 3)));

  // Affordable-item badge counts
  const state = useGameStore();
  const badgeCounts = useMemo(() => getAffordableCounts(state), [
    state.flux, state.data, state.echoes, state.voidShards, state.realityFragments,
    state.totalFluxEarned, state.upgrades, state.generators, state.research,
    state.activeResearchId, state.prestigeUpgrades, state.voidShardUpgrades,
    state.singularityUpgrades, state.buyMode,
  ]);

  const LEFT_TABS: { id: SidePanel; label: string; icon: string }[] = [
    { id: 'generators', label: 'GENERATORS', icon: '⚙' },
    { id: 'upgrades', label: 'UPGRADES', icon: '⬆' },
    { id: 'research', label: 'RESEARCH', icon: '◇' },
  ];

  const RIGHT_TABS: { id: SidePanel; label: string; icon: string }[] = [
    { id: 'prestige', label: 'ECHOES', icon: '◈' },
    ...(hasVoidShards ? [{ id: 'voidshards' as SidePanel, label: 'VOID', icon: '💎' }] : []),
    ...(hasAscendancy ? [{ id: 'ascendancy' as SidePanel, label: 'ASCEND', icon: '⚜' }] : []),
    ...(hasSingularity ? [{ id: 'singularity' as SidePanel, label: 'SINGULARITY', icon: '✦' }] : []),
    { id: 'events', label: 'SIGNALS', icon: '▣' },
    { id: 'stats', label: 'STATS', icon: '📊' },
    { id: 'settings', label: 'SYSTEM', icon: '▤' },
  ];

  return (
    <div className={`app ${scanLines ? 'scanlines-on' : ''} ${graphicsQuality === 'low' ? 'gfx-low' : graphicsQuality === 'medium' ? 'gfx-med' : ''}`}>
      {scanLines && <div className="scanline-overlay" />}
      <Header />
      <div className="main-layout">
        {/* Left Sidebar */}
        <aside className="sidebar sidebar-left">
          <div className="sidebar-tabs">
            {LEFT_TABS.map(tab => {
              const count = badgeCounts[tab.id] ?? 0;
              return (
                <button
                  key={tab.id}
                  className={`sidebar-tab ${leftPanel === tab.id ? 'active' : ''}`}
                  onClick={() => { setLeftPanel(tab.id); playTabSound(); }}
                  title={tab.label}
                >
                  <span className="sidebar-tab-icon">{tab.icon}</span>
                  <span className="sidebar-tab-label">{tab.label}</span>
                  {count > 0 && leftPanel !== tab.id && <span className="sidebar-tab-badge">+{count}</span>}
                </button>
              );
            })}
          </div>
          <div className="sidebar-content">
            {renderPanel(leftPanel)}
          </div>
        </aside>

        {/* Center - Reactor / Expeditions */}
        <main className="center-panel">
          {expeditionUnlocked && (
            <div className="sidebar-tabs center-tabs">
              <button
                className={`sidebar-tab center-tab ${centerPanel === 'reactor' ? 'active' : ''}`}
                onClick={() => { setCenterPanel('reactor'); playTabSound(); }}
              >
                <span className="sidebar-tab-icon">◉</span>
                <span className="sidebar-tab-label">REACTOR</span>
              </button>
              <button
                className={`sidebar-tab center-tab ${centerPanel === 'expeditions' ? 'active' : ''} ${hasPendingResult ? 'has-result' : ''} ${hasActiveExpedition ? 'has-active' : ''}`}
                onClick={() => { setCenterPanel('expeditions'); playTabSound(); }}
              >
                <span className="sidebar-tab-icon">⬡</span>
                <span className="sidebar-tab-label">EXPEDITIONS</span>
                {hasPendingResult && <span className="center-tab-badge">!</span>}
                {hasActiveExpedition && !hasPendingResult && <span className="center-tab-dot" />}
              </button>
            </div>
          )}
          <div className="center-content">
            {centerPanel === 'reactor' || !expeditionUnlocked
              ? <ReactorViewer />
              : <ExpeditionPanel />
            }
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="sidebar sidebar-right">
          <div className="sidebar-tabs">
            {RIGHT_TABS.map(tab => {
              const count = badgeCounts[tab.id] ?? 0;
              return (
                <button
                  key={tab.id}
                  className={`sidebar-tab ${rightPanel === tab.id ? 'active' : ''}`}
                  onClick={() => { setRightPanel(tab.id); playTabSound(); }}
                  title={tab.label}
                >
                  <span className="sidebar-tab-icon">{tab.icon}</span>
                  <span className="sidebar-tab-label">{tab.label}</span>
                  {count > 0 && rightPanel !== tab.id && <span className="sidebar-tab-badge">+{count}</span>}
                </button>
              );
            })}
          </div>
          <div className="sidebar-content">
            {renderPanel(rightPanel)}
          </div>
        </aside>
      </div>
      <CheatPanel />
      <OfflinePopup />
      <ToastNotification />
      <PrestigeAnimation />
    </div>
  );
}
