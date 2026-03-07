import { useRef } from 'react';
import { useGameStore } from '../game/store';
import { useSettingsStore } from '../store/settingsStore';
import './SettingsPanel.css';

export function SettingsPanel() {
  const state = useGameStore();
  const saveGame = useGameStore((s) => s.saveGame);
  const exportSave = useGameStore((s) => s.exportSave);
  const importSave = useGameStore((s) => s.importSave);
  const resetGame = useGameStore((s) => s.resetGame);
  const togglePremium = useGameStore((s) => s.togglePremium);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const settings = useSettingsStore();

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = importSave(reader.result as string);
      if (result) {
        window.alert('Save imported successfully!');
      } else {
        window.alert('Failed to import save. Invalid file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="settings-panel">
      <div className="panel-header">
        <h2>SYSTEM</h2>
      </div>

      {/* Audio Controls */}
      <div className="settings-section">
        <h3>◈ AUDIO</h3>
        <div className="settings-toggle-row">
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(e) => settings.setSoundEnabled(e.target.checked)}
            />
            <span className="toggle-switch" />
            <span className="toggle-label">Sound Effects</span>
          </label>
        </div>
        <div className="settings-slider-row">
          <label className="slider-label">Volume</label>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(settings.masterVolume * 100)}
            onChange={(e) => {
              settings.setMasterVolume(Number(e.target.value) / 100);
            }}
            className="settings-slider"
          />
          <span className="slider-value">{Math.round(settings.masterVolume * 100)}%</span>
        </div>
      </div>

      {/* Visual Controls */}
      <div className="settings-section">
        <h3>◈ VISUALS</h3>
        <div className="settings-row-label">Graphics Quality</div>
        <div className="graphics-quality-selector">
          {(['high', 'medium', 'low'] as const).map(q => (
            <button
              key={q}
              className={`gfx-btn ${settings.graphicsQuality === q ? 'active' : ''}`}
              onClick={() => settings.setGraphicsQuality(q)}
            >
              {q === 'high' ? '◆ HIGH' : q === 'medium' ? '◇ MED' : '○ LOW'}
            </button>
          ))}
        </div>
        <div className="settings-toggle-row">
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={settings.scanLines}
              onChange={(e) => settings.setScanLines(e.target.checked)}
            />
            <span className="toggle-switch" />
            <span className="toggle-label">Scan Lines</span>
          </label>
        </div>
        <div className="settings-toggle-row">
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={settings.screenShake}
              onChange={(e) => settings.setScreenShake(e.target.checked)}
            />
            <span className="toggle-switch" />
            <span className="toggle-label">Screen Shake</span>
          </label>
        </div>
        <div className="settings-toggle-row">
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={settings.floatingNumbers}
              onChange={(e) => settings.setFloatingNumbers(e.target.checked)}
            />
            <span className="toggle-switch" />
            <span className="toggle-label">Floating Numbers</span>
          </label>
        </div>
        <div className="settings-toggle-row">
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={settings.toastNotifications}
              onChange={(e) => settings.setToastNotifications(e.target.checked)}
            />
            <span className="toggle-switch" />
            <span className="toggle-label">Toast Notifications</span>
          </label>
        </div>
      </div>

      {/* Save Data */}
      <div className="settings-section">
        <h3>◈ SAVE DATA</h3>
        <div className="settings-buttons">
          <button className="settings-btn save" onClick={saveGame}>
            ▣ Save Now
          </button>
          <button className="settings-btn export" onClick={exportSave}>
            ▤ Export
          </button>
          <button className="settings-btn import" onClick={() => fileInputRef.current?.click()}>
            ▥ Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
          <button
            className="settings-btn reset"
            onClick={() => {
              if (window.confirm('Are you sure you want to reset ALL progress? This cannot be undone!')) {
                if (window.confirm('Really? Everything will be lost. Last chance!')) {
                  resetGame();
                }
              }
            }}
          >
            ✕ Reset Progress
          </button>
          <button
            className="settings-btn reset"
            onClick={() => {
              if (window.confirm('ERASE EVERYTHING? This will delete all save data AND settings. The page will reload.')) {
                if (window.confirm('This is irreversible. Are you absolutely sure?')) {
                  localStorage.removeItem('clickerspace_save');
                  localStorage.removeItem('clickerspace_settings');
                  window.location.reload();
                }
              }
            }}
          >
            ☠ Erase All Data
          </button>
        </div>
        <p className="settings-note">Auto-saves every 10s // v{__APP_VERSION__}+{__GIT_HASH__}</p>
      </div>

      {/* Premium */}
      <div className="settings-section premium-section">
        <h3>⭐ SUPPORT</h3>
        <p className="premium-desc">
          Enjoy Void Resonance? For <strong>$1</strong>:
        </p>
        <ul className="premium-perks">
          <li>+5% base production</li>
          <li>+10% data generation</li>
          <li>Auto-buy Best Max generator</li>
          <li>Patron&apos;s Echo prestige upgrade</li>
        </ul>
        <button
          className={`settings-btn premium ${state.isPremium ? 'active' : ''}`}
          onClick={togglePremium}
        >
          {state.isPremium ? '⭐ Active' : '⭐ Support ($1)'}
        </button>
        <p className="premium-note">
          {state.isPremium
            ? 'Demo toggle — would use payment in production.'
            : 'Demo toggle — no real payment.'}
        </p>
      </div>
    </div>
  );
}
