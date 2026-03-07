import { ReactorCanvas } from './reactor/ReactorCanvas';
import { useSettingsStore } from '../store/settingsStore';
import './ReactorViewer.css';

export function ReactorViewer() {
  const { canvasRef, handleClick, displayStats } = ReactorCanvas();
  const settings = useSettingsStore();

  const frenzyPercent = Math.round(displayStats.frenzyCharge * 100);
  const showFpsWarning = displayStats.lowFpsDetected && !settings.fpsWarningDismissed && settings.graphicsQuality === 'high';

  return (
    <div className={`reactor-viewer ${displayStats.frenzyActive ? 'frenzy-active' : ''}`}>
      <div className="reactor-header">
        <span className="reactor-title">VOID REACTOR</span>
        <span className={`reactor-status ${displayStats.overcharged ? 'overcharged' : ''} ${displayStats.frenzyActive ? 'frenzy' : ''}`}>
          {displayStats.frenzyActive
            ? '⚡ FRENZY'
            : displayStats.overcharged
              ? '◆ OVERCHARGED'
              : displayStats.active
                ? '● ACTIVE'
                : '○ STANDBY'}
        </span>
      </div>
      <div className="reactor-canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="reactor-canvas"
          onClick={handleClick}
          title="Click to harvest flux from the void"
        />
        <div className="reactor-overlay-stats">
          <div className="reactor-stat">
            <span className="reactor-stat-label">FLUX/SEC</span>
            <span className="reactor-stat-value">{displayStats.fps}</span>
          </div>
          <div className="reactor-stat">
            <span className="reactor-stat-label">ENTITIES</span>
            <span className="reactor-stat-value">{displayStats.totalOwned}</span>
          </div>
          <div className="reactor-stat">
            <span className="reactor-stat-label">CLICK PWR</span>
            <span className="reactor-stat-value">{displayStats.clickVal}</span>
          </div>
        </div>
        {/* Frenzy charge indicator */}
        {(displayStats.frenzyCharge > 0 || displayStats.frenzyActive) && (
          <div className="reactor-frenzy-indicator">
            <div className="frenzy-label">
              {displayStats.frenzyActive ? '⚡ FRENZY ACTIVE ⚡' : `CHARGE ${frenzyPercent}%`}
            </div>
            <div className="frenzy-bar-track">
              <div
                className={`frenzy-bar-fill ${displayStats.frenzyActive ? 'active' : ''}`}
                style={{ width: `${displayStats.frenzyActive ? 100 : frenzyPercent}%` }}
              />
            </div>
          </div>
        )}
        {showFpsWarning && (
          <div className="fps-warning">
            <span>Performance low — try reducing graphics in Settings</span>
            <button
              className="fps-warning-btn"
              onClick={() => settings.setGraphicsQuality('medium')}
            >
              Switch to Medium
            </button>
            <button
              className="fps-warning-dismiss"
              onClick={() => settings.setFpsWarningDismissed(true)}
            >
              ✕
            </button>
          </div>
        )}
      </div>
      <div className="reactor-footer">
        <span className="reactor-instruction">[ CLICK REACTOR TO HARVEST ]</span>
      </div>
    </div>
  );
}
