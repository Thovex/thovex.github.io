import { useGameStore } from '../game/store';
import './ClickButton.css';

export function ClickButton() {
  const clickFlux = useGameStore((s) => s.clickFlux);

  return (
    <button className="click-button" onClick={clickFlux} title="Click to harvest flux from the void">
      <div className="click-button-inner">
        <div className="click-pulse" />
        <span className="click-icon">◉</span>
        <span className="click-label">HARVEST FLUX</span>
      </div>
    </button>
  );
}
