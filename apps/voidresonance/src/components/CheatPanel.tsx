// Admin cheat panel — set to false for production builds
const ENABLE_CHEATS = true;

import { useState } from 'react';
import { useGameStore } from '../game/store';
import { RESEARCH_NODES } from '../config/research';
import { DEFAULT_ASCENDANCY_STATE } from '../game/types';
import './CheatPanel.css';

export function CheatPanel() {
  const [open, setOpen] = useState(false);

  if (!ENABLE_CHEATS) return null;

  const addFlux = (amount: number) => {
    useGameStore.setState((s) => ({
      flux: s.flux + amount,
      totalFluxEarned: s.totalFluxEarned + amount,
    }));
  };

  const addData = (amount: number) => {
    useGameStore.setState((s) => ({
      data: s.data + amount,
      totalDataEarned: s.totalDataEarned + amount,
    }));
  };

  const addEchoes = (amount: number) => {
    useGameStore.setState((s) => ({
      echoes: s.echoes + amount,
      totalEchoes: s.totalEchoes + amount,
    }));
  };

  const addVoidShards = (amount: number) => {
    useGameStore.setState((s) => ({
      voidShards: s.voidShards + amount,
      totalVoidShards: s.totalVoidShards + amount,
    }));
  };

  const addRealityFragments = (amount: number) => {
    useGameStore.setState((s) => ({
      realityFragments: s.realityFragments + amount,
      totalRealityFragments: s.totalRealityFragments + amount,
    }));
  };

  const completeAllResearch = () => {
    const research: Record<string, { completed: boolean; progress: number }> = {};
    for (const node of RESEARCH_NODES) {
      research[node.id] = { completed: true, progress: node.duration };
    }
    useGameStore.setState({ research, activeResearchId: null });
  };

  const togglePremium = () => {
    useGameStore.setState((s) => ({ isPremium: !s.isPremium }));
  };

  const finishExpedition = () => {
    const s = useGameStore.getState();
    if (!s.expeditions.activeExpedition) return;
    useGameStore.setState({
      expeditions: {
        ...s.expeditions,
        activeExpedition: {
          ...s.expeditions.activeExpedition,
          startedAt: Date.now() - s.expeditions.activeExpedition.duration * 1000 - 1000,
        },
      },
    });
  };

  /** Jump to mid-game: unlocks prestige, lots of flux/data/research */
  const jumpToMidGame = () => {
    const research: Record<string, { completed: boolean; progress: number }> = {};
    for (const node of RESEARCH_NODES) {
      if (node.unlockAt <= 10_000_000) {
        research[node.id] = { completed: true, progress: node.duration };
      }
    }
    useGameStore.setState((s) => ({
      flux: s.flux + 5e7,
      totalFluxEarned: s.totalFluxEarned + 5e7,
      data: s.data + 50_000,
      totalDataEarned: s.totalDataEarned + 50_000,
      research,
      activeResearchId: null,
    }));
  };

  /** Jump to prestige phase: enough echoes to buy upgrades */
  const jumpToPrestige = () => {
    completeAllResearch();
    useGameStore.setState((s) => ({
      flux: s.flux + 1e12,
      totalFluxEarned: s.totalFluxEarned + 1e12,
      data: s.data + 500_000,
      totalDataEarned: s.totalDataEarned + 500_000,
      echoes: s.echoes + 500,
      totalEchoes: s.totalEchoes + 500,
      prestigeCount: Math.max(s.prestigeCount, 5),
    }));
  };

  /** Jump to void collapse phase: lots of echoes, collapse research done */
  const jumpToVoidCollapse = () => {
    completeAllResearch();
    useGameStore.setState((s) => ({
      flux: s.flux + 1e15,
      totalFluxEarned: s.totalFluxEarned + 1e15,
      data: s.data + 1e6,
      totalDataEarned: s.totalDataEarned + 1e6,
      echoes: s.echoes + 5000,
      totalEchoes: s.totalEchoes + 5000,
      prestigeCount: Math.max(s.prestigeCount, 20),
    }));
  };

  /** Jump to ascendancy phase: has done void collapses, has shards */
  const jumpToAscendancy = () => {
    completeAllResearch();
    useGameStore.setState((s) => ({
      flux: s.flux + 1e15,
      totalFluxEarned: s.totalFluxEarned + 1e15,
      data: s.data + 1e6,
      totalDataEarned: s.totalDataEarned + 1e6,
      echoes: s.echoes + 5000,
      totalEchoes: s.totalEchoes + 5000,
      prestigeCount: Math.max(s.prestigeCount, 20),
      voidShards: s.voidShards + 50,
      totalVoidShards: s.totalVoidShards + 50,
      voidCollapseCount: Math.max(s.voidCollapseCount, 3),
      ascendancy: s.ascendancy.activePath ? s.ascendancy : { ...DEFAULT_ASCENDANCY_STATE },
    }));
  };

  /** Jump to singularity phase: many collapses, high mastery, ready for singularity */
  const jumpToSingularity = () => {
    completeAllResearch();
    useGameStore.setState((s) => ({
      flux: s.flux + 1e18,
      totalFluxEarned: s.totalFluxEarned + 1e18,
      data: s.data + 1e8,
      totalDataEarned: s.totalDataEarned + 1e8,
      echoes: s.echoes + 50_000,
      totalEchoes: s.totalEchoes + 50_000,
      prestigeCount: Math.max(s.prestigeCount, 100),
      voidShards: s.voidShards + 200,
      totalVoidShards: s.totalVoidShards + 200,
      voidCollapseCount: Math.max(s.voidCollapseCount, 15),
      ascendancy: {
        activePath: s.ascendancy.activePath,
        pathMastery: {
          architect: Math.max(s.ascendancy.pathMastery['architect'] ?? 0, 5),
          channeler: Math.max(s.ascendancy.pathMastery['channeler'] ?? 0, 5),
          observer: Math.max(s.ascendancy.pathMastery['observer'] ?? 0, 5),
        },
      },
    }));
  };

  /** Jump to endgame: has reality fragments and singularity upgrades available */
  const jumpToEndgame = () => {
    completeAllResearch();
    useGameStore.setState((s) => ({
      flux: s.flux + 1e21,
      totalFluxEarned: s.totalFluxEarned + 1e21,
      data: s.data + 1e10,
      totalDataEarned: s.totalDataEarned + 1e10,
      echoes: s.echoes + 500_000,
      totalEchoes: s.totalEchoes + 500_000,
      prestigeCount: Math.max(s.prestigeCount, 500),
      voidShards: s.voidShards + 1000,
      totalVoidShards: s.totalVoidShards + 1000,
      voidCollapseCount: Math.max(s.voidCollapseCount, 50),
      realityFragments: s.realityFragments + 50,
      totalRealityFragments: s.totalRealityFragments + 50,
      singularityCount: Math.max(s.singularityCount, 3),
      ascendancy: {
        activePath: s.ascendancy.activePath,
        pathMastery: {
          architect: Math.max(s.ascendancy.pathMastery['architect'] ?? 0, 15),
          channeler: Math.max(s.ascendancy.pathMastery['channeler'] ?? 0, 15),
          observer: Math.max(s.ascendancy.pathMastery['observer'] ?? 0, 15),
        },
      },
    }));
  };

  return (
    <div className={`cheat-panel ${open ? 'open' : 'closed'}`}>
      <button className="cheat-toggle" onClick={() => setOpen(!open)}>
        {open ? '✕' : '🔧'}
      </button>
      {open && (
        <div className="cheat-content">
          <div className="cheat-title">ADMIN CHEATS</div>
          <div className="cheat-section">
            <span className="cheat-label">FLUX</span>
            <button onClick={() => addFlux(1000)}>+1K</button>
            <button onClick={() => addFlux(1e6)}>+1M</button>
            <button onClick={() => addFlux(1e9)}>+1B</button>
            <button onClick={() => addFlux(1e12)}>+1T</button>
          </div>
          <div className="cheat-section">
            <span className="cheat-label">DATA</span>
            <button onClick={() => addData(100)}>+100</button>
            <button onClick={() => addData(1000)}>+1K</button>
            <button onClick={() => addData(1e5)}>+100K</button>
          </div>
          <div className="cheat-section">
            <span className="cheat-label">ECHOES</span>
            <button onClick={() => addEchoes(10)}>+10</button>
            <button onClick={() => addEchoes(100)}>+100</button>
            <button onClick={() => addEchoes(1000)}>+1K</button>
          </div>
          <div className="cheat-section">
            <span className="cheat-label">SHARDS</span>
            <button onClick={() => addVoidShards(5)}>+5</button>
            <button onClick={() => addVoidShards(50)}>+50</button>
            <button onClick={() => addVoidShards(200)}>+200</button>
          </div>
          <div className="cheat-section">
            <span className="cheat-label">FRAGS</span>
            <button onClick={() => addRealityFragments(5)}>+5</button>
            <button onClick={() => addRealityFragments(50)}>+50</button>
            <button onClick={() => addRealityFragments(200)}>+200</button>
          </div>
          <div className="cheat-section">
            <button onClick={completeAllResearch}>Complete All Research</button>
          </div>
          <div className="cheat-section">
            <button onClick={finishExpedition}>Finish Expedition</button>
          </div>
          <div className="cheat-section">
            <button onClick={togglePremium}>Toggle Premium</button>
          </div>
          <div className="cheat-divider" />
          <div className="cheat-subtitle">JUMP TO PHASE</div>
          <div className="cheat-section">
            <button onClick={jumpToMidGame}>Mid-Game</button>
            <button onClick={jumpToPrestige}>Prestige</button>
          </div>
          <div className="cheat-section">
            <button onClick={jumpToVoidCollapse}>Void Collapse</button>
            <button onClick={jumpToAscendancy}>Ascendancy</button>
          </div>
          <div className="cheat-section">
            <button onClick={jumpToSingularity}>Singularity</button>
            <button onClick={jumpToEndgame}>Endgame</button>
          </div>
        </div>
      )}
    </div>
  );
}
