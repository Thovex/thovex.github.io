import { useGameStore } from '../game/store';
import { formatNumber, formatTime } from '../utils/numberFormatting';
import './OfflinePopup.css';

export function OfflinePopup() {
  const report = useGameStore((s) => s.offlineReport);
  const dismiss = useGameStore((s) => s.dismissOfflineReport);

  if (!report) return null;

  return (
    <div className="offline-overlay" onClick={dismiss}>
      <div className="offline-popup" onClick={e => e.stopPropagation()}>
        <h2>Welcome Back</h2>
        <p className="offline-subtitle">The void kept working while you were away.</p>

        <div className="offline-stats">
          <div className="offline-stat">
            <span className="offline-label">Time Away</span>
            <span className="offline-value">{formatTime(report.timeAway)}</span>
          </div>
          <div className="offline-stat">
            <span className="offline-label">Flux Gained</span>
            <span className="offline-value flux">+{formatNumber(report.fluxGained)}</span>
          </div>
          {report.dataGained > 0 && (
            <div className="offline-stat">
              <span className="offline-label">Data Gained</span>
              <span className="offline-value data">+{formatNumber(report.dataGained)}</span>
            </div>
          )}
        </div>

        <button className="offline-dismiss" onClick={dismiss}>
          Continue
        </button>
      </div>
    </div>
  );
}
