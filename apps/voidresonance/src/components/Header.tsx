import { useGameStore } from '../game/store';
import { getFluxPerSecond, getDataPerSecond, getClickValue } from '../game/engine';
import { formatNumber } from '../utils/numberFormatting';
import './Header.css';

export function Header() {
  const state = useGameStore();
  const fps = getFluxPerSecond(state);
  const dps = getDataPerSecond(state);
  const clickVal = getClickValue(state);

  return (
    <header className="header">
      <div className="header-left">
        <div className="header-title">
          <h1>VOID<span className="title-accent">RESONANCE</span></h1>
        </div>
        <span className="header-subtitle">v{__APP_VERSION__}+{__GIT_HASH__}</span>
      </div>
      <div className="header-resources">
        <div className="resource-display flux-display">
          <span className="resource-label">FLUX</span>
          <span className="resource-value">{formatNumber(state.flux)}</span>
          <span className="resource-rate">+{formatNumber(fps)}/s</span>
        </div>
        <div className="resource-divider" />
        <div className="resource-display data-display">
          <span className="resource-label">DATA</span>
          <span className="resource-value">{formatNumber(state.data)}</span>
          <span className="resource-rate">+{formatNumber(dps, 2)}/s</span>
        </div>
        {state.echoes > 0 && (
          <>
            <div className="resource-divider" />
            <div className="resource-display echo-display">
              <span className="resource-label">ECHOES</span>
              <span className="resource-value">{formatNumber(state.echoes)}</span>
            </div>
          </>
        )}
        <div className="resource-divider" />
        <div className="resource-display click-display">
          <span className="resource-label">CLICK</span>
          <span className="resource-value">+{formatNumber(clickVal)}</span>
        </div>
      </div>
    </header>
  );
}
