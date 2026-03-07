import { useGameStore } from '../game/store';
import { EVENTS } from '../config/events';
import './EventPanel.css';

export function EventPanel() {
  const seenEvents = useGameStore((s) => s.seenEvents);

  const visibleEvents = EVENTS.filter(e => seenEvents.includes(e.id)).reverse();

  const categoryClass = (cat: string) => {
    switch (cat) {
      case 'discovery': return 'cat-discovery';
      case 'anomaly': return 'cat-anomaly';
      case 'system': return 'cat-system';
      default: return 'cat-log';
    }
  };

  return (
    <div className="event-panel">
      <div className="panel-header">
        <h2>Signal Log</h2>
        <span className="event-count">{visibleEvents.length} signals received</span>
      </div>

      <div className="event-list">
        {visibleEvents.map(evt => (
          <div key={evt.id} className={`event-entry ${categoryClass(evt.category)}`}>
            <span className="event-category">[{evt.category.toUpperCase()}]</span>
            <span className="event-text">{evt.text}</span>
          </div>
        ))}

        {visibleEvents.length === 0 && (
          <div className="empty-message">No signals received yet...</div>
        )}
      </div>
    </div>
  );
}
