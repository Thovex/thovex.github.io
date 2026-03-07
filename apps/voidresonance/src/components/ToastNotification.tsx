import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '../game/store';
import { useSettingsStore } from '../store/settingsStore';
import { EVENTS } from '../config/events';
import { playEventSound } from '../audio/SoundManager';
import './ToastNotification.css';

interface Toast {
  id: number;
  text: string;
  category: string;
  timestamp: number;
}

let toastCounter = 0;

export function ToastNotification() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const prevSeenRef = useRef<string[]>([]);
  const seenEvents = useGameStore((s) => s.seenEvents);
  const toastsEnabled = useSettingsStore((s) => s.toastNotifications);

  const addToast = useCallback((text: string, category: string) => {
    const id = ++toastCounter;
    setToasts(prev => [...prev.slice(-2), { id, text, category, timestamp: Date.now() }]);
    playEventSound();

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    if (!toastsEnabled) return;
    const prev = prevSeenRef.current;
    const newEventIds = seenEvents.filter(id => !prev.includes(id));
    prevSeenRef.current = [...seenEvents];

    if (prev.length === 0 && seenEvents.length > 0) return; // Initial load

    for (const evtId of newEventIds) {
      const evt = EVENTS.find(e => e.id === evtId);
      if (evt) {
        addToast(evt.text, evt.category);
      }
    }
  }, [seenEvents, toastsEnabled, addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`toast toast-${toast.category}`}
        >
          <div className="toast-header">
            <span className="toast-icon">◈</span>
            <span className="toast-label">SIGNAL RECEIVED</span>
          </div>
          <span className="toast-text">{toast.text}</span>
          <div className="toast-progress" />
        </div>
      ))}
    </div>
  );
}
