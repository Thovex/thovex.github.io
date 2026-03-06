// ─────────────────────────────────────────────────────────────
//  CMS Overlay — Inline editing on the live site
//  Activates when cms_authed flag is set in localStorage.
//  Edit mode is toggled via a button in the nav bar.
// ─────────────────────────────────────────────────────────────

(function () {
    'use strict';

    if (!localStorage.getItem('cms_authed')) return;

    const CMS_URL = window.location.pathname.includes('/cms/') ? './' : 'cms/';

    // ─── Type key ↔ label mapping ───
    const TYPE_LABELS = {
        'BSS': 'Bright Star Studios',
        'Zloppy-Games': 'Zloppy Games',
        'BH': 'Baer & Hoggo',
        'HKU': 'University of the Arts Utrecht',
        'Hobby': 'Personal Project',
        'PixelPool': 'PixelPool'
    };
    const TYPE_KEYS = Object.keys(TYPE_LABELS);
    const LABEL_TO_TYPE = Object.fromEntries(Object.entries(TYPE_LABELS).map(([k, v]) => [v, k]));

    // ─── State ───
    let firebaseApp = null;
    let db = null;
    let projectsData = [];
    let pendingChanges = new Map();
    let firebaseReady = false;
    let editMode = false;

    // CMS Settings (loaded from Firestore, with hardcoded defaults as fallback)
    const DEFAULT_LANGUAGES = ['C++', 'C#', 'C', 'Java', 'JavaScript', 'TypeScript', 'Python', 'GDScript', 'Lua', 'Rust', 'Go', 'Blueprint', 'Verse'];
    const DEFAULT_ENGINES = ['Unreal', 'Unity', 'Radiance', 'UEFN', 'Godot', 'Custom'];
    let cmsLanguages = [];
    let cmsEngines = [];
    let cmsTypes = [];
    let cmsSettingsLoaded = false;

    // ─── SVG Icons ───
    const ICONS = {
        terminal: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
        plus: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
        x: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        grip: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/></svg>',
    };

    // ─── Inject Styles ───
    function injectStyles() {
        if (document.getElementById('cms-overlay-styles')) return;
        const style = document.createElement('style');
        style.id = 'cms-overlay-styles';
        style.textContent = `
            /* ─── CMS Nav Buttons ─── */
            .cms-nav-btn, .cms-edit-toggle {
                display: inline-flex; align-items: center; gap: 0.4rem;
                padding: 0.3rem 0.65rem; font-family: var(--font-mono);
                font-size: 0.6rem; font-weight: 700; text-transform: uppercase;
                letter-spacing: 0.1em; border: 1px solid rgba(0, 240, 255, 0.2);
                background: rgba(0, 240, 255, 0.04); text-decoration: none;
                transition: all 0.2s ease; cursor: pointer;
                color: var(--color-cyan); opacity: 0.5;
            }
            .cms-nav-btn:hover, .cms-edit-toggle:hover { opacity: 1; background: rgba(0,240,255,0.1); border-color: rgba(0,240,255,0.4); }
            .cms-edit-toggle.active {
                opacity: 1; color: var(--color-green);
                border-color: rgba(58,255,127,0.4); background: rgba(58,255,127,0.08);
            }
            .cms-edit-toggle .toggle-dot {
                width: 6px; height: 6px; border-radius: 50%;
                background: var(--text-muted); transition: background 0.2s;
            }
            .cms-edit-toggle.active .toggle-dot { background: var(--color-green); box-shadow: 0 0 6px var(--color-green); }

            /* ─── Editable fields (only styled in edit mode) ─── */
            body.cms-edit-mode [data-cms-editable] {
                outline: 1px dashed transparent; outline-offset: 4px;
                cursor: text; transition: outline 0.15s ease, background 0.15s ease;
            }
            body.cms-edit-mode [data-cms-editable]:hover { outline-color: rgba(0,240,255,0.3); }
            body.cms-edit-mode [data-cms-editable]:focus { outline-color: var(--color-cyan); background: rgba(0,240,255,0.03); outline-style: solid; }
            body.cms-edit-mode [data-cms-editable].cms-dirty { outline-color: rgba(255,224,58,0.5); outline-style: dashed; }
            body.cms-edit-mode [data-cms-editable].cms-dirty:focus { outline-color: var(--color-yellow); outline-style: solid; }
            [data-cms-editable].cms-saved { animation: cms-flash-save 0.6s ease; }
            @keyframes cms-flash-save {
                0% { outline-color: var(--color-green); background: rgba(58,255,127,0.06); }
                100% { outline-color: transparent; background: transparent; }
            }
            body:not(.cms-edit-mode) [data-cms-editable] { outline: none !important; cursor: inherit; }

            /* ─── CMS-only elements: hidden unless edit mode ─── */
            .cms-only { display: none !important; }
            body.cms-edit-mode .cms-only { display: flex !important; }
            body.cms-edit-mode select.cms-only { display: inline-block !important; }

            /* Hide original text when select replaces it in edit mode */
            body.cms-edit-mode .cms-original-text { display: none !important; }

            /* ─── Tag editing ─── */
            .cms-tag-editor { display: none; flex-wrap: wrap; gap: 0.3rem; align-items: center; padding: 0.25rem; }
            body.cms-edit-mode .cms-tag-editor { display: flex; }
            body.cms-edit-mode .card-tags .card-tag { display: none; }
            .cms-tag-pill {
                display: inline-flex; align-items: center; gap: 0.25rem;
                padding: 0.15rem 0.5rem; font-family: var(--font-mono); font-size: 0.55rem;
                font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;
                background: rgba(0,240,255,0.08); border: 1px solid rgba(0,240,255,0.2); color: var(--color-cyan);
            }
            .cms-tag-remove { cursor: pointer; opacity: 0.5; font-size: 0.7rem; line-height: 1; transition: opacity 0.15s; }
            .cms-tag-remove:hover { opacity: 1; color: var(--color-pink); }
            .cms-tag-input {
                border: none; background: transparent; color: var(--text-primary);
                font-family: var(--font-mono); font-size: 0.55rem; width: 70px;
                outline: none; padding: 0.15rem 0.3rem; border-bottom: 1px dashed rgba(0,240,255,0.3);
            }
            .cms-tag-input::placeholder { color: var(--text-muted); opacity: 0.5; }

            /* ─── Add/Remove buttons ─── */
            .cms-add-inline {
                display: none; align-items: center; gap: 0.4rem;
                padding: 0.5rem 1rem; font-family: var(--font-mono); font-size: 0.6rem;
                font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
                color: var(--color-cyan); border: 1px dashed rgba(0,240,255,0.25);
                background: rgba(0,240,255,0.03); cursor: pointer; transition: all 0.2s ease;
                margin-top: 0.75rem; text-decoration: none;
            }
            body.cms-edit-mode .cms-add-inline { display: inline-flex; }
            .cms-add-inline:hover { background: rgba(0,240,255,0.08); border-color: rgba(0,240,255,0.5); border-style: solid; }
            .cms-add-inline.green { color: var(--color-green); border-color: rgba(58,255,127,0.25); }
            .cms-add-inline.green:hover { background: rgba(58,255,127,0.08); border-color: rgba(58,255,127,0.5); }

            .cms-remove-work, .cms-remove-media {
                position: absolute; top: 6px; right: 6px;
                width: 20px; height: 20px;
                display: none; align-items: center; justify-content: center;
                background: rgba(0,0,0,0.6); border: 1px solid rgba(255,58,58,0.3);
                color: var(--color-pink); cursor: pointer; transition: all 0.15s; z-index: 5;
            }
            body.cms-edit-mode .cms-remove-work, body.cms-edit-mode .cms-remove-media { display: flex; }
            .cms-remove-work:hover, .cms-remove-media:hover { background: rgba(255,58,58,0.15); border-color: var(--color-pink); }
            .work-card { position: relative; }

            /* ─── Media item editing ─── */
            body.cms-edit-mode .media-item { position: relative; }
            .cms-media-drag-handle {
                display: none; position: absolute; bottom: 6px; right: 6px; z-index: 10;
                width: 24px; height: 24px; align-items: center; justify-content: center;
                background: rgba(0,0,0,0.7); border: 1px solid rgba(0,240,255,0.3);
                color: var(--color-cyan); cursor: grab; backdrop-filter: blur(4px); transition: all 0.15s;
            }
            body.cms-edit-mode .cms-media-drag-handle { display: flex; }
            .cms-media-drag-handle:hover { background: rgba(0,240,255,0.12); border-color: var(--color-cyan); }
            .cms-media-drag-handle:active { cursor: grabbing; }
            .media-item.cms-dragging { opacity: 0.4; transform: scale(0.95); }
            .media-item.cms-drag-over { outline: 2px solid var(--color-cyan); outline-offset: 4px; }

            /* ─── CMS select dropdowns ─── */
            .cms-select {
                font-family: var(--font-mono); font-size: 0.65rem;
                background: rgba(0,240,255,0.06); border: 1px solid rgba(0,240,255,0.25);
                color: var(--color-cyan); padding: 0.2rem 0.4rem;
                outline: none; cursor: pointer; transition: border-color 0.15s;
                -webkit-appearance: none; appearance: none;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2300f0ff'/%3E%3C/svg%3E");
                background-repeat: no-repeat; background-position: right 6px center;
                padding-right: 1.2rem;
            }
            .cms-select:hover { border-color: rgba(0,240,255,0.5); }
            .cms-select:focus { border-color: var(--color-cyan); }
            .cms-select option { background: #0a0c12; color: #e8eaed; }

            /* ─── Media input ─── */
            .cms-media-input-wrap { display: none; gap: 0.5rem; margin-top: 0.75rem; align-items: center; }
            body.cms-edit-mode .cms-media-input-wrap { display: flex; }
            .cms-media-input-wrap input {
                flex: 1; padding: 0.4rem 0.6rem; font-family: var(--font-mono); font-size: 0.6rem;
                background: rgba(0,240,255,0.03); border: 1px solid rgba(0,240,255,0.2);
                color: var(--text-primary); outline: none;
            }
            .cms-media-input-wrap input:focus { border-color: var(--color-cyan); }
            .cms-media-input-wrap button {
                padding: 0.4rem 0.7rem; font-family: var(--font-mono); font-size: 0.6rem;
                font-weight: 700; text-transform: uppercase;
                color: var(--color-green); border: 1px solid rgba(58,255,127,0.3);
                background: rgba(58,255,127,0.05); cursor: pointer; transition: all 0.15s ease;
            }
            .cms-media-input-wrap button:hover { background: rgba(58,255,127,0.15); border-color: var(--color-green); }

            /* ─── Drag & drop ─── */
            body.cms-edit-mode .project-card { cursor: default; }
            .cms-drag-handle {
                display: none; position: absolute; bottom: 8px; right: 8px; z-index: 10;
                width: 28px; height: 28px; align-items: center; justify-content: center;
                background: rgba(0,0,0,0.7); border: 1px solid rgba(0,240,255,0.3);
                color: var(--color-cyan); cursor: grab; backdrop-filter: blur(4px); transition: all 0.15s;
            }
            body.cms-edit-mode .cms-drag-handle { display: flex; }
            .cms-drag-handle:hover { background: rgba(0,240,255,0.12); border-color: var(--color-cyan); }
            .cms-drag-handle:active { cursor: grabbing; }
            .project-card.cms-dragging { opacity: 0.4; transform: scale(0.95); }
            .project-card.cms-drag-over { outline: 2px solid var(--color-cyan); outline-offset: 4px; }

            /* ─── Social link editing ─── */
            .cms-social-editor { display: none; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem; align-items: center; }
            body.cms-edit-mode .cms-social-editor { display: flex; }
            .cms-social-row {
                display: flex; gap: 0.3rem; align-items: center;
                padding: 0.25rem 0.5rem; border: 1px solid rgba(0,240,255,0.15);
                background: rgba(0,240,255,0.02); font-family: var(--font-mono); font-size: 0.6rem;
            }
            .cms-social-row input {
                border: none; background: transparent; color: var(--text-primary);
                font-family: var(--font-mono); font-size: 0.6rem; outline: none;
                border-bottom: 1px dashed rgba(0,240,255,0.2); padding: 0.1rem 0.3rem;
            }
            .cms-social-row input:focus { border-bottom-color: var(--color-cyan); }
            .cms-social-row .cms-social-remove { cursor: pointer; color: var(--text-muted); transition: color 0.15s; }
            .cms-social-row .cms-social-remove:hover { color: var(--color-pink); }

            /* ─── Floating toolbar ─── */
            .cms-toolbar {
                position: fixed; bottom: 1.5rem; left: 50%;
                transform: translateX(-50%) translateY(100px); z-index: 9999;
                display: flex; align-items: center; gap: 0.75rem;
                padding: 0.6rem 1.2rem; background: rgba(10,12,18,0.95);
                border: 1px solid rgba(0,240,255,0.2); backdrop-filter: blur(12px);
                font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-secondary);
                transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease;
                opacity: 0; pointer-events: none;
            }
            .cms-toolbar.visible { transform: translateX(-50%) translateY(0); opacity: 1; pointer-events: all; }
            .cms-toolbar-status {
                display: flex; align-items: center; gap: 0.4rem;
                color: var(--color-yellow); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600;
            }
            .cms-toolbar-status .dot { width: 6px; height: 6px; background: var(--color-yellow); border-radius: 50%; animation: cms-pulse 1.5s ease infinite; }
            @keyframes cms-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
            .cms-toolbar-btn {
                padding: 0.35rem 0.8rem; font-family: var(--font-mono); font-size: 0.6rem;
                font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
                border: 1px solid; cursor: pointer; transition: all 0.2s ease;
                text-decoration: none; display: inline-flex; align-items: center; gap: 0.35rem;
            }
            .cms-toolbar-btn.save { color: var(--color-green); border-color: rgba(58,255,127,0.3); background: rgba(58,255,127,0.05); }
            .cms-toolbar-btn.save:hover { background: rgba(58,255,127,0.15); border-color: var(--color-green); }
            .cms-toolbar-btn.discard { color: var(--text-muted); border-color: var(--border-subtle); background: transparent; }
            .cms-toolbar-btn.discard:hover { color: var(--color-pink); border-color: rgba(255,58,58,0.3); }
            .cms-toolbar-btn.cms-link { color: var(--text-muted); border-color: var(--border-subtle); background: transparent; }
            .cms-toolbar-btn.cms-link:hover { color: var(--color-cyan); border-color: rgba(0,240,255,0.3); }
            .cms-toolbar-divider { width: 1px; height: 20px; background: var(--border-subtle); }

            @media (max-width: 768px) {
                .cms-toolbar { bottom: 0.75rem; padding: 0.5rem 0.8rem; gap: 0.5rem; font-size: 0.55rem; }
                .cms-nav-btn span.cms-label, .cms-edit-toggle span.cms-label { display: none; }
            }

            /* ─── Toast notifications ─── */
            .cms-toast {
                position: fixed; top: 1.5rem; right: 1.5rem; z-index: 10000;
                padding: 0.65rem 1.2rem; font-family: var(--font-mono); font-size: 0.65rem;
                font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;
                background: rgba(10,12,18,0.95); backdrop-filter: blur(12px);
                border: 1px solid; display: flex; align-items: center; gap: 0.5rem;
                animation: cms-toast-in 0.3s ease, cms-toast-out 0.3s ease 4.7s forwards;
                pointer-events: none;
            }
            .cms-toast.success { color: var(--color-green); border-color: rgba(58,255,127,0.3); }
            .cms-toast.info { color: var(--color-cyan); border-color: rgba(0,240,255,0.3); }
            .cms-toast.warning { color: var(--color-yellow); border-color: rgba(255,224,58,0.3); }
            .cms-toast.error { color: var(--color-pink); border-color: rgba(255,58,58,0.3); }
            .cms-toast .toast-dot {
                width: 6px; height: 6px; border-radius: 50%; background: currentColor;
            }
            @keyframes cms-toast-in { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes cms-toast-out { from { opacity: 1; } to { opacity: 0; transform: translateY(-10px); } }

            /* ─── Spotlight Search ─── */
            .spotlight-overlay {
                position: fixed; inset: 0; z-index: 99990;
                background: rgba(0,0,0,0.6); backdrop-filter: blur(6px);
                display: flex; align-items: flex-start; justify-content: center;
                padding-top: min(20vh, 160px);
                opacity: 0; visibility: hidden; transition: opacity 0.15s, visibility 0.15s;
            }
            .spotlight-overlay.active { opacity: 1; visibility: visible; }
            .spotlight-box {
                width: min(580px, 92vw); background: rgba(10,12,18,0.98);
                border: 1px solid rgba(0,240,255,0.25); box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(0,240,255,0.06);
                backdrop-filter: blur(20px); overflow: hidden;
                transform: translateY(-12px) scale(0.97); transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1);
            }
            .spotlight-overlay.active .spotlight-box { transform: translateY(0) scale(1); }
            .spotlight-input-wrap {
                display: flex; align-items: center; gap: 0.6rem;
                padding: 0.9rem 1rem; border-bottom: 1px solid rgba(0,240,255,0.12);
            }
            .spotlight-input-wrap svg { color: var(--color-cyan); flex-shrink: 0; opacity: 0.6; }
            .spotlight-input {
                flex: 1; background: none; border: none; outline: none;
                font-family: var(--font-mono); font-size: 0.85rem; color: var(--text-primary);
            }
            .spotlight-input::placeholder { color: var(--text-muted); }
            .spotlight-hint {
                font-family: var(--font-mono); font-size: 0.55rem; color: var(--text-muted);
                background: rgba(0,240,255,0.06); border: 1px solid rgba(0,240,255,0.15);
                padding: 0.15rem 0.4rem; white-space: nowrap;
            }
            .spotlight-results {
                max-height: min(50vh, 400px); overflow-y: auto; padding: 0.25rem 0;
            }
            .spotlight-results::-webkit-scrollbar { width: 4px; }
            .spotlight-results::-webkit-scrollbar-track { background: transparent; }
            .spotlight-results::-webkit-scrollbar-thumb { background: rgba(0,240,255,0.15); border-radius: 2px; }
            .spotlight-result {
                display: flex; align-items: center; gap: 0.75rem;
                padding: 0.6rem 1rem; cursor: pointer; transition: background 0.1s;
            }
            .spotlight-result:hover, .spotlight-result.active { background: rgba(0,240,255,0.06); }
            .spotlight-result.active { border-left: 2px solid var(--color-cyan); }
            .spotlight-result-icon {
                width: 36px; height: 36px; flex-shrink: 0; overflow: hidden;
                border: 1px solid rgba(0,240,255,0.12); display: flex; align-items: center; justify-content: center;
                background: rgba(0,240,255,0.03);
            }
            .spotlight-result-icon img { width: 100%; height: 100%; object-fit: cover; }
            .spotlight-result-icon svg { color: var(--color-cyan); opacity: 0.5; }
            .spotlight-result-text { flex: 1; min-width: 0; }
            .spotlight-result-title {
                font-family: var(--font-mono); font-size: 0.75rem; font-weight: 600;
                color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            }
            .spotlight-result-meta {
                font-family: var(--font-mono); font-size: 0.55rem; color: var(--text-muted);
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 0.1rem;
            }
            .spotlight-result-badge {
                font-family: var(--font-mono); font-size: 0.5rem; font-weight: 600;
                text-transform: uppercase; letter-spacing: 0.06em;
                padding: 0.15rem 0.4rem; flex-shrink: 0;
            }
            .spotlight-result-badge.project { color: var(--color-cyan); background: rgba(0,240,255,0.06); border: 1px solid rgba(0,240,255,0.15); }
            .spotlight-result-badge.action { color: var(--color-green); background: rgba(58,255,127,0.06); border: 1px solid rgba(58,255,127,0.15); }
            .spotlight-result-badge.page { color: var(--color-yellow); background: rgba(255,224,58,0.06); border: 1px solid rgba(255,224,58,0.15); }
            .spotlight-empty {
                padding: 2rem 1rem; text-align: center;
                font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted);
            }
            .spotlight-footer {
                padding: 0.4rem 1rem; border-top: 1px solid rgba(0,240,255,0.08);
                font-family: var(--font-mono); font-size: 0.5rem; color: var(--text-muted);
                display: flex; gap: 1rem;
            }
            .spotlight-footer kbd {
                background: rgba(0,240,255,0.06); border: 1px solid rgba(0,240,255,0.12);
                padding: 0.05rem 0.3rem; font-family: var(--font-mono);
            }

            /* ─── Konami Code Easter Egg ─── */
            .konami-achievement {
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0);
                z-index: 99999; padding: 2rem 3rem; text-align: center;
                background: rgba(10,12,18,0.97); backdrop-filter: blur(20px);
                border: 2px solid var(--color-cyan); box-shadow: 0 0 60px rgba(0,240,255,0.15);
                font-family: var(--font-mono); pointer-events: none;
                animation: konami-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, konami-fade 0.6s ease 4s forwards;
            }
            .konami-achievement h2 { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.2em; color: var(--color-cyan); margin: 0 0 0.5rem 0; opacity: 0.6; }
            .konami-achievement p { font-size: 1.1rem; font-weight: 700; color: var(--color-green); margin: 0 0 0.3rem 0; }
            .konami-achievement .konami-sub { font-size: 0.6rem; color: var(--text-muted); margin: 0; }
            @keyframes konami-pop { from { transform: translate(-50%,-50%) scale(0); opacity: 0; } to { transform: translate(-50%,-50%) scale(1); opacity: 1; } }
            @keyframes konami-fade { from { opacity: 1; } to { opacity: 0; transform: translate(-50%,-50%) scale(0.9); } }
            .konami-particle { position: fixed; z-index: 99998; pointer-events: none; width: 8px; height: 8px; border-radius: 1px; animation: konami-fall linear forwards; }
            @keyframes konami-fall { 0% { opacity: 1; transform: translateY(0) rotate(0deg); } 100% { opacity: 0; transform: translateY(100vh) rotate(720deg); } }
        `;
        document.head.appendChild(style);
    }

    // ─── Pending change helpers ───
    function setPending(projectId, field, value) {
        if (!pendingChanges.has(projectId)) pendingChanges.set(projectId, {});
        pendingChanges.get(projectId)[field] = value;
        updateToolbar();
    }
    function clearPending(projectId, field) {
        if (pendingChanges.has(projectId)) {
            delete pendingChanges.get(projectId)[field];
            if (Object.keys(pendingChanges.get(projectId)).length === 0) pendingChanges.delete(projectId);
        }
        updateToolbar();
    }

    // ─── Floating Toolbar ───
    function createToolbar() {
        if (document.querySelector('.cms-toolbar')) return;
        const homeURL = window.location.pathname.includes('/cms/') ? '../index.html' : 'index.html';
        const bar = document.createElement('div');
        bar.className = 'cms-toolbar';
        bar.innerHTML = `
            <div class="cms-toolbar-status"><span class="dot"></span><span class="cms-change-count">0 changes</span></div>
            <div class="cms-toolbar-divider"></div>
            <button class="cms-toolbar-btn save" data-action="save">Save</button>
            <button class="cms-toolbar-btn discard" data-action="discard">Discard</button>
            <div class="cms-toolbar-divider"></div>
            <a href="${homeURL}" class="cms-toolbar-btn cms-link">⌂ Home</a>
            <a href="${CMS_URL}" class="cms-toolbar-btn cms-link">${ICONS.terminal} CMS</a>
        `;
        document.body.appendChild(bar);
        bar.querySelector('[data-action="save"]').addEventListener('click', saveChanges);
        bar.querySelector('[data-action="discard"]').addEventListener('click', discardChanges);
    }

    function updateToolbar() {
        const bar = document.querySelector('.cms-toolbar');
        if (!bar) return;
        let total = 0;
        pendingChanges.forEach(f => { total += Object.keys(f).length; });
        bar.querySelector('.cms-change-count').textContent = `${total} change${total !== 1 ? 's' : ''}`;
        bar.classList.toggle('visible', total > 0);
    }

    // ─── Toast Notifications ───
    function showToast(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `cms-toast ${type}`;
        toast.innerHTML = `<span class="toast-dot"></span> ${message}`;
        // Stack multiple toasts
        const existing = document.querySelectorAll('.cms-toast');
        if (existing.length) {
            const offset = existing.length * 44;
            toast.style.top = `calc(1.5rem + ${offset}px)`;
        }
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), duration);
    }

    // ─── Firebase Init ───
    async function initFirebase() {
        if (firebaseReady) return true;
        try {
            const [{ initializeApp, getApp }, { getFirestore }, { getAuth, onAuthStateChanged }] = await Promise.all([
                import('https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js'),
                import('https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js'),
                import('https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js')
            ]);
            const cfg = (await import('./cms/firebase-config.js')).default;
            if (!cfg || cfg.apiKey === 'YOUR_API_KEY') return false;
            try { firebaseApp = getApp(); } catch { firebaseApp = initializeApp(cfg); }
            db = getFirestore(firebaseApp);
            const auth = getAuth(firebaseApp);
            const user = await new Promise(r => {
                const unsub = onAuthStateChanged(auth, u => { unsub(); r(u); });
                setTimeout(() => r(null), 8000);
            });
            if (!user || user.email !== 'thovexii@gmail.com') {
                console.warn('CMS overlay: auth failed —', user?.email);
                localStorage.removeItem('cms_authed');
                return false;
            }
            firebaseReady = true;
            return true;
        } catch (e) { console.warn('CMS overlay: Firebase init failed', e); return false; }
    }

    // ─── Make text editable ───
    function makeEditable(el, projectId, field) {
        el.setAttribute('contenteditable', 'true');
        el.setAttribute('spellcheck', 'false');
        el.dataset.cmsEditable = '';
        el.dataset.cmsProjectId = projectId;
        el.dataset.cmsField = field;
        el.dataset.cmsOriginal = el.textContent.trim();

        el.addEventListener('focus', (e) => { if (!editMode) { e.preventDefault(); el.blur(); } });
        el.addEventListener('blur', () => {
            if (!editMode) return;
            const v = el.textContent.trim(), o = el.dataset.cmsOriginal;
            if (v !== o) { el.classList.add('cms-dirty'); setPending(projectId, field, v); }
            else { el.classList.remove('cms-dirty'); clearPending(projectId, field); }
        });
        if (!['description', 'longdescription'].includes(field) && !field.includes('.description')) {
            el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } });
        }
    }

    // ─── Meta text editable (SVG + text) ───
    function makeMetaEditable(metaSpan, projectId, field) {
        let ts = metaSpan.querySelector('.cms-meta-text');
        if (!ts) {
            const txt = metaSpan.textContent.trim();
            Array.from(metaSpan.childNodes).filter(n => n.nodeType === Node.TEXT_NODE).forEach(n => n.remove());
            ts = document.createElement('span');
            ts.className = 'cms-meta-text';
            ts.textContent = txt;
            metaSpan.appendChild(ts);
        }
        makeEditable(ts, projectId, field);
    }

    // ─── Load CMS settings from Firestore (languages, engines, types) ───
    async function loadCmsSettings() {
        if (cmsSettingsLoaded) return;
        const ok = await initFirebase();
        if (!ok) return;
        try {
            const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js');
            const snapshot = await getDocs(collection(db, 'settings'));
            snapshot.forEach(d => {
                if (d.id === 'languages' && d.data().list) cmsLanguages = d.data().list;
                if (d.id === 'engines' && d.data().list) cmsEngines = d.data().list;
                if (d.id === 'types' && d.data().list) cmsTypes = d.data().list;
            });
            cmsSettingsLoaded = true;
        } catch (e) { console.warn('CMS overlay: settings load failed', e); }
    }

    // ─── Generic field select (language, engine, role) ───
    function createFieldSelect(container, projectId, field, currentValue, getOptions) {
        if (container.querySelector(`.cms-select[data-cms-field="${field}"]`)) return;

        // Wrap existing text nodes in a span that hides in edit mode
        Array.from(container.childNodes).forEach(n => {
            if (n.nodeType === Node.TEXT_NODE && n.textContent.trim()) {
                const wrapper = document.createElement('span');
                wrapper.className = 'cms-original-text';
                wrapper.textContent = n.textContent;
                container.replaceChild(wrapper, n);
            }
        });

        const sel = document.createElement('select');
        sel.className = 'cms-select cms-only';
        sel.dataset.cmsField = field;

        function populate() {
            sel.innerHTML = '';
            const options = getOptions();
            let found = false;
            options.forEach(opt => {
                const o = document.createElement('option');
                o.value = opt.value; o.textContent = opt.label;
                if (opt.value === currentValue) { o.selected = true; found = true; }
                sel.appendChild(o);
            });
            // If current value isn't in options, add it
            if (!found && currentValue) {
                const o = document.createElement('option');
                o.value = currentValue; o.textContent = currentValue; o.selected = true;
                sel.insertBefore(o, sel.firstChild);
            }
        }
        populate();

        sel.dataset.cmsOriginal = currentValue;
        sel.addEventListener('change', () => {
            if (sel.value !== sel.dataset.cmsOriginal) setPending(projectId, field, sel.value);
            else clearPending(projectId, field);
        });
        container.appendChild(sel);
        return sel;
    }

    // ─── Type dropdown ───
    function createTypeSelect(container, projectId, currentKey) {
        return createFieldSelect(container, projectId, 'type', currentKey, () =>
            cmsTypes.length > 0
                ? cmsTypes.map(t => ({ value: t.value, label: t.label }))
                : TYPE_KEYS.map(k => ({ value: k, label: TYPE_LABELS[k] }))
        );
    }

    // ─── Language dropdown ───
    function createLanguageSelect(container, projectId, currentValue) {
        return createFieldSelect(container, projectId, 'language', currentValue, () => {
            if (cmsLanguages.length > 0) return cmsLanguages.map(l => ({ value: l, label: l }));
            const fromData = [...new Set(projectsData.map(p => p.language).filter(Boolean))];
            const merged = [...new Set([...fromData, ...DEFAULT_LANGUAGES])].sort();
            return merged.map(l => ({ value: l, label: l }));
        });
    }

    // ─── Role dropdown (populated from existing project roles) ───
    function createRoleSelect(container, projectId, currentValue) {
        return createFieldSelect(container, projectId, 'role', currentValue, () => {
            const roles = [...new Set(projectsData.map(p => p.role).filter(Boolean))].sort();
            return roles.map(r => ({ value: r, label: r }));
        });
    }

    // ─── Engine dropdown ───
    function createEngineSelect(container, projectId, currentValue) {
        return createFieldSelect(container, projectId, 'engine', currentValue, () => {
            if (cmsEngines.length > 0) return cmsEngines.map(e => ({ value: e, label: e }));
            const fromData = [...new Set(projectsData.map(p => p.engine).filter(Boolean))];
            const merged = [...new Set([...fromData, ...DEFAULT_ENGINES])].sort();
            return merged.map(e => ({ value: e, label: e }));
        });
    }

    // ─── Period input ───
    function createPeriodInput(container, projectId, currentDatetime) {
        const parts = currentDatetime.split('-').map(s => s.trim());
        const startYear = parts[0] || new Date().getFullYear().toString();
        const endPart = parts[1] || 'Present';
        const isPresent = endPart.toLowerCase() === 'present';

        const wrap = document.createElement('div');
        wrap.className = 'cms-only';
        wrap.style.cssText = 'display:none;align-items:center;gap:0.3rem;font-family:var(--font-mono);font-size:0.65rem;margin-top:0.25rem;';

        const mkInput = (val, ph) => {
            const inp = document.createElement('input');
            inp.type = 'number'; inp.value = val; inp.placeholder = ph || '';
            inp.min = '1990'; inp.max = '2099';
            inp.style.cssText = 'width:55px;padding:0.15rem 0.3rem;font-family:var(--font-mono);font-size:0.65rem;background:rgba(0,240,255,0.04);border:1px solid rgba(0,240,255,0.2);color:var(--text-primary);outline:none;';
            return inp;
        };
        const startInp = mkInput(startYear);
        const dash = document.createElement('span');
        dash.textContent = '–'; dash.style.color = 'var(--text-muted)';
        const endInp = mkInput(isPresent ? '' : endPart, 'end');
        endInp.disabled = isPresent;

        const lbl = document.createElement('label');
        lbl.style.cssText = 'display:flex;align-items:center;gap:0.2rem;cursor:pointer;color:var(--text-muted);font-size:0.55rem;';
        const chk = document.createElement('input');
        chk.type = 'checkbox'; chk.checked = isPresent;
        lbl.append(chk, document.createTextNode('Present'));

        wrap.append(startInp, dash, endInp, lbl);
        container.appendChild(wrap);

        const original = currentDatetime;
        const getVal = () => { const e = chk.checked ? 'Present' : endInp.value; return e ? `${startInp.value}-${e}` : startInp.value; };
        const onChange = () => {
            endInp.disabled = chk.checked;
            const v = getVal();
            if (v !== original) setPending(projectId, 'datetime', v);
            else clearPending(projectId, 'datetime');
        };
        startInp.addEventListener('input', onChange);
        endInp.addEventListener('input', onChange);
        chk.addEventListener('change', onChange);
    }

    // ─── Tag editor ───
    function createTagEditor(container, projectId, currentTags) {
        if (container.querySelector('.cms-tag-editor')) return;
        const originalTags = [...currentTags], tags = [...currentTags];
        const editor = document.createElement('div');
        editor.className = 'cms-tag-editor';

        function render() {
            editor.innerHTML = '';
            tags.forEach((tag, i) => {
                const pill = document.createElement('span');
                pill.className = 'cms-tag-pill';
                pill.innerHTML = `${tag} <span class="cms-tag-remove">×</span>`;
                pill.querySelector('.cms-tag-remove').addEventListener('mousedown', (e) => {
                    e.stopPropagation(); e.preventDefault(); tags.splice(i, 1); render(); check();
                });
                editor.appendChild(pill);
            });
            const inp = document.createElement('input');
            inp.className = 'cms-tag-input'; inp.placeholder = '+ tag';
            inp.addEventListener('keydown', (e) => {
                if ((e.key === 'Enter' || e.key === ',') && inp.value.trim()) {
                    e.preventDefault();
                    const v = inp.value.trim().toLowerCase().replace(/,/g, '');
                    if (v && !tags.includes(v)) { tags.push(v); render(); check(); }
                    inp.value = '';
                }
                if (e.key === 'Backspace' && !inp.value && tags.length) { tags.pop(); render(); check(); }
            });
            inp.addEventListener('mousedown', e => e.stopPropagation());
            editor.appendChild(inp);
        }
        function check() {
            if (JSON.stringify(tags) !== JSON.stringify(originalTags)) setPending(projectId, 'tags', [...tags]);
            else clearPending(projectId, 'tags');
        }
        render();
        container.appendChild(editor);
        editor._cmsReset = () => { tags.length = 0; tags.push(...originalTags); render(); };
    }

    // ─── Social link editor ───
    function createSocialEditor(container, projectId, currentSocials) {
        if (container.querySelector('.cms-social-editor')) return;
        const socials = (currentSocials || []).map(s => ({ ...s }));
        const origJSON = JSON.stringify(currentSocials || []);
        const editor = document.createElement('div');
        editor.className = 'cms-social-editor';

        function render() {
            editor.innerHTML = '';
            socials.forEach((s, i) => {
                const row = document.createElement('div');
                row.className = 'cms-social-row';
                const urlInp = document.createElement('input');
                urlInp.value = s.url || ''; urlInp.placeholder = 'URL'; urlInp.style.width = '180px';
                urlInp.addEventListener('input', () => { s.url = urlInp.value; check(); });
                const infoInp = document.createElement('input');
                infoInp.value = s.info || ''; infoInp.placeholder = 'label'; infoInp.style.width = '100px';
                infoInp.addEventListener('input', () => { s.info = infoInp.value; check(); });
                const rm = document.createElement('span');
                rm.className = 'cms-social-remove'; rm.innerHTML = ICONS.x;
                rm.addEventListener('click', () => { socials.splice(i, 1); render(); check(); });
                row.append(urlInp, infoInp, rm);
                editor.appendChild(row);
            });
            const addBtn = document.createElement('button');
            addBtn.className = 'cms-add-inline'; addBtn.style.cssText = 'display:inline-flex;margin-top:0;';
            addBtn.innerHTML = `${ICONS.plus} Link`;
            addBtn.addEventListener('click', () => { socials.push({ url: '', info: '', icon: 'res/ico_site.png' }); render(); check(); });
            editor.appendChild(addBtn);
        }
        function check() {
            if (JSON.stringify(socials) !== origJSON) setPending(projectId, 'socials', socials.map(s => ({ ...s })));
            else clearPending(projectId, 'socials');
        }
        render();
        container.appendChild(editor);
        editor._cmsReset = () => { socials.length = 0; (currentSocials || []).forEach(s => socials.push({ ...s })); render(); };
    }

    // ─── Add Work Item ───
    function addWorkItemUI(workGrid, projectId) {
        if (workGrid.querySelector('.cms-add-inline[data-for="work"]')) return;
        const btn = document.createElement('button');
        btn.className = 'cms-add-inline'; btn.dataset.for = 'work';
        btn.innerHTML = `${ICONS.plus} Add Contribution`;
        btn.addEventListener('click', () => {
            const idx = workGrid.querySelectorAll('.work-card').length;
            const card = document.createElement('div');
            card.className = 'work-card'; card.dataset.cmsNew = '1';
            card.innerHTML = `<h4>New Contribution</h4><p>Description here...</p>`;
            workGrid.insertBefore(card, btn);
            attachWorkCardEditing(card, projectId, idx);
            setPending(projectId, `work.${idx}.title`, 'New Contribution');
            setPending(projectId, `work.${idx}.description`, 'Description here...');
            card.querySelector('h4').classList.add('cms-dirty');
            card.querySelector('p').classList.add('cms-dirty');
            card.querySelector('h4').focus();
        });
        workGrid.appendChild(btn);
    }

    function attachWorkCardEditing(card, projectId, idx) {
        const h4 = card.querySelector('h4'), p = card.querySelector('p');
        if (h4) makeEditable(h4, projectId, `work.${idx}.title`);
        if (p) makeEditable(p, projectId, `work.${idx}.description`);
        const rm = document.createElement('button');
        rm.className = 'cms-remove-work'; rm.innerHTML = ICONS.x; rm.title = 'Remove';
        rm.addEventListener('mousedown', (e) => { e.preventDefault(); card.remove(); setPending(projectId, `_removeWork.${idx}`, true); });
        card.appendChild(rm);
    }

    // ─── Add Media UI (below the media grid, inside the container) ───
    function addMediaUI(mediaSection, projectId) {
        const inner = mediaSection.querySelector('.project-media-inner') || mediaSection;
        if (inner.querySelector('.cms-media-input-wrap')) return;
        const wrap = document.createElement('div');
        wrap.className = 'cms-media-input-wrap';
        wrap.innerHTML = `<input type="text" placeholder="res/projects/.../ss_01.png or YouTube URL" /><button type="button">+ Add Media</button>`;
        const input = wrap.querySelector('input'), addBtn = wrap.querySelector('button');

        addBtn.addEventListener('click', () => {
            const src = input.value.trim();
            if (!src) return;
            const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(src) || src.includes('youtube.com') || src.includes('youtu.be');

            const mediaGrid = document.getElementById('mediaGrid');
            if (mediaGrid) {
                const item = document.createElement('div');
                item.className = 'media-item'; item.dataset.cmsNew = '1';
                item.dataset.cmsMediaType = isVideo ? 'video' : 'screenshot';
                item.dataset.cmsMediaSrc = src;
                item.setAttribute('data-reveal', ''); item.classList.add('revealed');
                if (isVideo) {
                    const yt = src.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
                    if (yt) item.innerHTML = `<iframe src="https://www.youtube.com/embed/${yt[1]}" allowfullscreen loading="lazy"></iframe>`;
                    else item.innerHTML = `<video src="${src}" controls muted loop preload="none"></video>`;
                    item.style.cursor = 'default';
                } else {
                    item.innerHTML = `<img src="${src}" alt="New media" loading="lazy">`;
                }
                item.style.outline = '1px dashed rgba(255,224,58,0.5)'; item.style.outlineOffset = '4px';
                mediaGrid.appendChild(item);
                attachMediaItemEditing(item, projectId);
            }
            rebuildMediaArrays(projectId);
            input.value = '';
            updateToolbar();
        });
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') addBtn.click(); });
        inner.appendChild(wrap);
    }

    // ─── Detect media type from a media-item element ───
    function detectMediaType(item) {
        if (item.dataset.cmsMediaType) return item.dataset.cmsMediaType;
        if (item.querySelector('iframe') || item.querySelector('video')) return 'video';
        return 'screenshot';
    }

    // ─── Get the source URL from a media-item element ───
    function detectMediaSrc(item) {
        if (item.dataset.cmsMediaSrc) return item.dataset.cmsMediaSrc;
        const img = item.querySelector('img');
        if (img) return img.getAttribute('src') || '';
        const video = item.querySelector('video');
        if (video) return video.getAttribute('src') || '';
        const iframe = item.querySelector('iframe');
        if (iframe) {
            const iframeSrc = iframe.getAttribute('src') || '';
            const m = iframeSrc.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
            return m ? `https://www.youtube.com/watch?v=${m[1]}` : iframeSrc;
        }
        return '';
    }

    // ─── Get alt text from a media-item image ───
    function detectMediaAlt(item) {
        const img = item.querySelector('img');
        return img ? (img.getAttribute('alt') || '') : '';
    }

    // ─── Rebuild full screenshots + videos arrays from the current DOM ───
    function rebuildMediaArrays(projectId) {
        const mediaGrid = document.getElementById('mediaGrid');
        if (!mediaGrid) return;
        const screenshots = [];
        const videos = [];
        mediaGrid.querySelectorAll('.media-item').forEach(item => {
            const type = detectMediaType(item);
            const src = detectMediaSrc(item);
            if (!src) return;
            if (type === 'video') {
                videos.push({ src });
            } else {
                screenshots.push({ src, alt: detectMediaAlt(item) });
            }
        });
        setPending(projectId, 'screenshots', screenshots);
        setPending(projectId, 'videos', videos);
    }

    // ─── Attach remove + drag to a single media-item ───
    let draggedMediaItem = null;

    function attachMediaItemEditing(item, projectId) {
        if (item.dataset.cmsMediaEditing) return;
        item.dataset.cmsMediaEditing = '1';

        // Remove button
        const rm = document.createElement('button');
        rm.className = 'cms-remove-media'; rm.innerHTML = ICONS.x; rm.title = 'Remove media';
        rm.addEventListener('mousedown', (e) => {
            e.preventDefault(); e.stopPropagation();
            item.remove();
            rebuildMediaArrays(projectId);
        });
        item.appendChild(rm);

        // Drag handle
        const handle = document.createElement('div');
        handle.className = 'cms-media-drag-handle'; handle.innerHTML = ICONS.grip; handle.title = 'Drag to reorder';
        item.appendChild(handle);

        const grid = item.closest('.media-grid') || item.parentElement;

        handle.addEventListener('mousedown', () => { item.setAttribute('draggable', 'true'); });
        item.addEventListener('dragstart', (e) => {
            if (!editMode) { e.preventDefault(); return; }
            draggedMediaItem = item; item.classList.add('cms-dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        item.addEventListener('dragend', () => {
            item.classList.remove('cms-dragging'); item.removeAttribute('draggable');
            if (grid) grid.querySelectorAll('.cms-drag-over').forEach(c => c.classList.remove('cms-drag-over'));
            draggedMediaItem = null;
        });
        item.addEventListener('dragover', (e) => {
            if (!draggedMediaItem || draggedMediaItem === item) return;
            e.preventDefault(); e.dataTransfer.dropEffect = 'move';
            item.classList.add('cms-drag-over');
        });
        item.addEventListener('dragleave', () => item.classList.remove('cms-drag-over'));
        item.addEventListener('drop', (e) => {
            e.preventDefault(); item.classList.remove('cms-drag-over');
            if (!draggedMediaItem || draggedMediaItem === item) return;
            const items = [...grid.querySelectorAll('.media-item')];
            const from = items.indexOf(draggedMediaItem), to = items.indexOf(item);
            if (from < to) item.after(draggedMediaItem); else item.before(draggedMediaItem);
            rebuildMediaArrays(projectId);
        });
    }

    // ─── Setup media editing (remove + drag) on all items in the grid ───
    function setupMediaEditing(projectId) {
        const mediaGrid = document.getElementById('mediaGrid');
        if (!mediaGrid) return;
        mediaGrid.querySelectorAll('.media-item').forEach(item => {
            attachMediaItemEditing(item, projectId);
        });
    }

    // ─── New Project button ───
    function addNewProjectButton() {
        const grid = document.getElementById('projectsGrid');
        if (!grid || document.querySelector('.cms-add-inline[data-for="project"]')) return;
        const btn = document.createElement('a');
        btn.className = 'cms-add-inline green'; btn.dataset.for = 'project';
        btn.href = `${CMS_URL}#new`;
        btn.innerHTML = `${ICONS.plus} New Project`;
        grid.parentNode.insertBefore(btn, grid.nextSibling);
    }

    // ─── Drag & Drop Reorder ───
    let draggedCard = null;

    function setupDragDrop() {
        const grid = document.getElementById('projectsGrid');
        if (!grid) return;

        function attachDrag(card) {
            if (card.querySelector('.cms-drag-handle')) return;
            const handle = document.createElement('div');
            handle.className = 'cms-drag-handle'; handle.innerHTML = ICONS.grip; handle.title = 'Drag to reorder';
            const imgArea = card.querySelector('.project-card-image');
            (imgArea || card).appendChild(handle);

            handle.addEventListener('mousedown', () => { card.setAttribute('draggable', 'true'); });
            card.addEventListener('dragstart', (e) => {
                if (!editMode) { e.preventDefault(); return; }
                draggedCard = card; card.classList.add('cms-dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            card.addEventListener('dragend', () => {
                card.classList.remove('cms-dragging'); card.removeAttribute('draggable');
                grid.querySelectorAll('.cms-drag-over').forEach(c => c.classList.remove('cms-drag-over'));
                draggedCard = null;
            });
            card.addEventListener('dragover', (e) => {
                if (!draggedCard || draggedCard === card) return;
                e.preventDefault(); e.dataTransfer.dropEffect = 'move';
                card.classList.add('cms-drag-over');
            });
            card.addEventListener('dragleave', () => card.classList.remove('cms-drag-over'));
            card.addEventListener('drop', (e) => {
                e.preventDefault(); card.classList.remove('cms-drag-over');
                if (!draggedCard || draggedCard === card) return;
                const cards = [...grid.querySelectorAll('.project-card')];
                const from = cards.indexOf(draggedCard), to = cards.indexOf(card);
                if (from < to) card.after(draggedCard); else card.before(draggedCard);
                setPending('__reorder', 'order', [...grid.querySelectorAll('.project-card')].map(c => c.dataset.projectId));
            });
        }

        grid.querySelectorAll('.project-card').forEach(attachDrag);
        new MutationObserver(() => grid.querySelectorAll('.project-card').forEach(attachDrag)).observe(grid, { childList: true });
    }

    // ─── Setup Card Editing ───
    function setupCardEditing() {
        const grid = document.getElementById('projectsGrid');
        if (!grid) return;

        function process() {
            grid.querySelectorAll('.project-card').forEach(card => {
                if (card.dataset.cmsSetup) return;
                card.dataset.cmsSetup = '1';
                const pid = card.dataset.projectId;
                if (!pid) return;

                const h3 = card.querySelector('.project-card-body h3');
                if (h3) makeEditable(h3, pid, 'title');
                const desc = card.querySelector('.project-card-desc');
                if (desc) makeEditable(desc, pid, 'description');

                // Language, Engine → select dropdowns; Role → editable text
                const mL = card.querySelector('.meta-language');
                if (mL) {
                    const curLang = mL.textContent.trim();
                    createLanguageSelect(mL, pid, curLang);
                }
                const mE = card.querySelector('.meta-engine');
                if (mE) {
                    const curEngine = mE.textContent.trim();
                    createEngineSelect(mE, pid, curEngine);
                }
                const mR = card.querySelector('.meta-role');
                if (mR) {
                    const curRole = mR.textContent.trim();
                    createRoleSelect(mR, pid, curRole);
                }

                const mS = card.querySelector('.meta-source');
                if (mS) createTypeSelect(mS, pid, card.dataset.type);

                const tagsC = card.querySelector('.card-tags');
                if (tagsC) {
                    const proj = projectsData.find(p => p.id === pid);
                    const curTags = proj ? [...(proj.tags || [])] : Array.from(tagsC.querySelectorAll('.card-tag')).map(t => t.textContent.trim());
                    createTagEditor(tagsC, pid, curTags);
                }

                // Datetime (editable text)
                const dateEl = card.querySelector('.project-card-date');
                if (dateEl) makeEditable(dateEl, pid, 'datetime');

                // Minisrc (card thumbnail) — editable via inline input
                const imgArea = card.querySelector('.project-card-image');
                if (imgArea && !imgArea.querySelector('.cms-media-input-wrap')) {
                    const proj = projectsData.find(p => p.id === pid);
                    const wrap = document.createElement('div');
                    wrap.className = 'cms-media-input-wrap';
                    wrap.style.cssText = 'margin-top:0.25rem;';
                    wrap.innerHTML = `<input type="text" placeholder="Card image path..." value="${proj?.minisrc || ''}" /><button type="button">Set</button>`;
                    const inp = wrap.querySelector('input'), btn = wrap.querySelector('button');
                    btn.addEventListener('click', () => {
                        const src = inp.value.trim();
                        if (!src) return;
                        setPending(pid, 'minisrc', src);
                        const img = imgArea.querySelector('img');
                        if (img) img.src = src;
                    });
                    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') btn.click(); });
                    imgArea.appendChild(wrap);
                }

            });
        }

        Promise.all([loadProjectsData(), loadCmsSettings()]).then(() => {
            process();
            setupDragDrop();
            addNewProjectButton();
            setupArchiveEditing();
            // Only observe after data is loaded so selects have full options
            new MutationObserver(() => process()).observe(grid, { childList: true });
        });
    }

    // ─── Setup Detail Page Editing ───
    function setupDetailEditing() {
        const heroContent = document.getElementById('heroContent');
        if (!heroContent) return;
        const projectId = new URLSearchParams(window.location.search).get('id');
        if (!projectId) return;

        function process() {
            if (heroContent.dataset.cmsSetup) return;
            if (heroContent.children.length === 0) return;
            heroContent.dataset.cmsSetup = '1';

            const h1 = heroContent.querySelector('h1');
            if (h1) makeEditable(h1, projectId, 'title');
            const ld = heroContent.querySelector('.project-long-desc');
            if (ld) makeEditable(ld, projectId, 'longdescription');

            heroContent.querySelectorAll('.meta-item').forEach(item => {
                const lbl = item.querySelector('.meta-label'), val = item.querySelector('.meta-value');
                if (!lbl || !val) return;
                const lt = lbl.textContent.trim().toLowerCase();
                if (lt === 'source') {
                    const proj = projectsData.find(p => p.id === projectId);
                    createTypeSelect(item, projectId, proj ? proj.type : (LABEL_TO_TYPE[val.textContent.trim()] || val.textContent.trim()));
                } else if (lt === 'period') {
                    createPeriodInput(item, projectId, val.textContent.trim());
                } else if (lt === 'language') {
                    createLanguageSelect(item, projectId, val.textContent.trim());
                } else if (lt === 'engine') {
                    createEngineSelect(item, projectId, val.textContent.trim());
                } else if (lt === 'role') {
                    createRoleSelect(item, projectId, val.textContent.trim());
                } else {
                    // duration → free text
                    const fm = { 'duration': 'duration' };
                    if (fm[lt]) makeEditable(val, projectId, fm[lt]);
                }
            });

            const socialsDiv = heroContent.querySelector('.project-socials');
            const proj = projectsData.find(p => p.id === projectId);
            createSocialEditor(socialsDiv ? socialsDiv.parentNode : heroContent, projectId, proj?.socials || []);

            // Banner image — editable via inline input
            const heroBg = document.getElementById('heroBg');
            if (heroBg && !heroBg.querySelector('.cms-media-input-wrap')) {
                const wrap = document.createElement('div');
                wrap.className = 'cms-media-input-wrap';
                wrap.innerHTML = `<input type="text" placeholder="Banner image path..." value="${proj?.banner || ''}" /><button type="button">Set</button>`;
                const inp = wrap.querySelector('input'), btn = wrap.querySelector('button');
                btn.addEventListener('click', () => {
                    const src = inp.value.trim();
                    if (!src) return;
                    setPending(projectId, 'banner', src);
                    const img = heroBg.querySelector('img');
                    if (img) img.src = src;
                });
                inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') btn.click(); });
                heroBg.appendChild(wrap);
            }
        }

        function processWork() {
            const wg = document.getElementById('workGrid');
            if (!wg || wg.dataset.cmsWorkSetup) return;
            const ws = wg.closest('#workSection');
            if (wg.children.length === 0 && ws && ws.style.display === 'none') return;
            wg.dataset.cmsWorkSetup = '1';
            wg.querySelectorAll('.work-card').forEach((c, i) => attachWorkCardEditing(c, projectId, i));
            addWorkItemUI(wg, projectId);
        }

        function processMedia() {
            const ms = document.getElementById('mediaSection');
            if (!ms || ms.dataset.cmsMediaSetup) return;
            ms.dataset.cmsMediaSetup = '1';
            addMediaUI(ms, projectId);
            setupMediaEditing(projectId);
        }

        // Need projectsData and CMS settings for dropdowns
        Promise.all([loadProjectsData(), loadCmsSettings()]).then(() => {
            const obs = new MutationObserver(() => { process(); processWork(); processMedia(); });
            obs.observe(heroContent, { childList: true });
            process();
            const wg = document.getElementById('workGrid');
            if (wg) { new MutationObserver(() => processWork()).observe(wg, { childList: true }); processWork(); }
            const ms = document.getElementById('mediaSection');
            if (ms) { new MutationObserver(() => processMedia()).observe(ms, { childList: true, subtree: true }); processMedia(); }
        });
    }

    // ─── Archive Editing ───
    function setupArchiveEditing() {
        const al = document.getElementById('archiveList');
        if (!al) return;
        function process() {
            al.querySelectorAll('.archive-item').forEach(item => {
                if (item.dataset.cmsSetup) return;
                item.dataset.cmsSetup = '1';
                const tEl = item.querySelector('h4'), dEl = item.querySelector('.archive-info > p');
                if (!tEl) return;
                const proj = projectsData.find(p => p.title === tEl.textContent.trim());
                if (!proj) return;
                makeEditable(tEl, proj.id, 'title');
                if (dEl) makeEditable(dEl, proj.id, 'description');

                // Datetime (archive year)
                const yearEl = item.querySelector('.archive-year');
                if (yearEl) makeEditable(yearEl, proj.id, 'datetime');
            });
        }
        new MutationObserver(() => process()).observe(al, { childList: true });
        process();
    }

    // ─── Save + Publish to GitHub ───
    async function saveChanges() {
        if (pendingChanges.size === 0) return;
        const ok = await initFirebase();
        if (!ok) { showToast('Firebase auth failed. Log into CMS first.', 'error'); return; }

        const { doc, getDoc, setDoc, collection, getDocs, query, orderBy } = await import('https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js');
        const saveBtn = document.querySelector('.cms-toolbar-btn.save');
        if (saveBtn) { saveBtn.textContent = 'Saving...'; saveBtn.disabled = true; }

        try {
            if (pendingChanges.has('__reorder')) {
                const order = pendingChanges.get('__reorder').order;
                await Promise.all(order.map((pid, i) => setDoc(doc(db, 'projects', pid), { order: i }, { merge: true })));
                pendingChanges.delete('__reorder');
            }

            for (const [projectId, fields] of pendingChanges) {
                const docRef = doc(db, 'projects', projectId);
                const snap = await getDoc(docRef);
                if (!snap.exists()) continue;
                const data = snap.data();

                // Collect remove-work indices to process last (in reverse order)
                const removeIndices = [];

                for (const [field, value] of Object.entries(fields)) {
                    if (field === '_addScreenshot') {
                        // Only apply _add if screenshots isn't being replaced entirely
                        if (!('screenshots' in fields)) {
                            if (!data.screenshots) data.screenshots = [];
                            value.forEach(src => data.screenshots.push({ src, alt: '' }));
                        }
                    } else if (field === '_addVideo') {
                        // Only apply _add if videos isn't being replaced entirely
                        if (!('videos' in fields)) {
                            if (!data.videos) data.videos = [];
                            value.forEach(src => data.videos.push({ src }));
                        }
                    } else if (field.startsWith('_removeWork.')) {
                        removeIndices.push(parseInt(field.split('.')[1]));
                    } else if (field === 'type' || field === 'tags' || field === 'socials') {
                        data[field] = value;
                    } else if (field.includes('.')) {
                        const parts = field.split('.');
                        let obj = data;
                        for (let i = 0; i < parts.length - 1; i++) {
                            const k = isNaN(parts[i]) ? parts[i] : parseInt(parts[i]);
                            if (obj[k] === undefined) obj[k] = isNaN(parts[i + 1]) ? {} : [];
                            obj = obj[k];
                        }
                        obj[isNaN(parts.at(-1)) ? parts.at(-1) : parseInt(parts.at(-1))] = value;
                    } else {
                        data[field] = value;
                    }
                }

                // Extend work array for new items
                const workKeys = Object.keys(fields).filter(k => k.startsWith('work.'));
                if (workKeys.length > 0) {
                    if (!data.work) data.work = [];
                    workKeys.forEach(k => {
                        const p = k.split('.'), idx = parseInt(p[1]);
                        while (data.work.length <= idx) data.work.push({ title: '', description: '' });
                        data.work[idx][p[2]] = fields[k];
                    });
                }

                // Remove work items in reverse index order so indices stay valid
                if (removeIndices.length > 0 && data.work) {
                    removeIndices.sort((a, b) => b - a).forEach(idx => {
                        if (idx < data.work.length) data.work.splice(idx, 1);
                    });
                }

                await setDoc(docRef, data);
            }

            // Visual feedback
            document.querySelectorAll('.cms-dirty').forEach(el => {
                el.classList.remove('cms-dirty'); el.classList.add('cms-saved');
                el.dataset.cmsOriginal = el.textContent.trim();
                setTimeout(() => el.classList.remove('cms-saved'), 600);
            });
            document.querySelectorAll('.media-item[data-cms-new]').forEach(i => { i.style.outline = ''; i.style.outlineOffset = ''; delete i.dataset.cmsNew; });
            document.querySelectorAll('.cms-select').forEach(s => { s.dataset.cmsOriginal = s.value; });

            pendingChanges.clear();
            updateToolbar();
            showToast('Saved to Firestore', 'success');

            // ─── Publish to GitHub ───
            if (saveBtn) saveBtn.textContent = 'Publishing...';
            await publishToGitHub(doc, getDocs, query, orderBy, collection);

        } catch (e) {
            console.error('CMS save error:', e);
            showToast('Save failed: ' + e.message, 'error');
        } finally {
            if (saveBtn) { saveBtn.textContent = 'Save'; saveBtn.disabled = false; }
        }
    }

    // ─── Generate projects.json from Firestore and push to GitHub ───
    async function publishToGitHub(doc, getDocs, query, orderBy, collection) {
        const pat = localStorage.getItem('cms_github_pat');
        if (!pat) {
            showToast('No GitHub PAT — saved but not published', 'warning');
            console.warn('CMS overlay: No GitHub PAT found — saved to Firestore but not published.');
            return;
        }

        const owner = localStorage.getItem('cms_github_owner') || 'Thovex';
        const repo = localStorage.getItem('cms_github_repo') || 'thovex.github.io';
        const branch = localStorage.getItem('cms_github_branch') || 'main';

        try {
            // Load all projects from Firestore
            const q = query(collection(db, 'projects'), orderBy('order', 'asc'));
            const snapshot = await getDocs(q);
            const allProjects = snapshot.docs.map(d => d.data());

            // Generate projects.json (same format as admin.js generateProjectsJson)
            const jsonData = allProjects.map(p => {
                const out = {};
                if (p.id) out.id = p.id;
                out.card = p.card !== false;
                if (p.title) out.title = p.title;
                if (p.language) out.language = p.language;
                if (p.engine) out.engine = p.engine;
                if (p.role) out.role = p.role;
                if (p.duration) out.duration = p.duration;
                if (p.datetime) out.datetime = p.datetime;
                if (p.minisrc) out.minisrc = p.minisrc;
                if (p.banner) out.banner = p.banner;
                if (p.type) out.type = p.type;
                if (p.description) out.description = p.description;
                if (p.longdescription) out.longdescription = p.longdescription;
                if (p.work && p.work.length > 0) out.work = p.work;
                if (p.tags && p.tags.length > 0) out.tags = p.tags;
                if (p.socials && p.socials.length > 0) out.socials = p.socials;
                if (p.screenshots && p.screenshots.length > 0) out.screenshots = p.screenshots;
                if (p.videos && p.videos.length > 0) out.videos = p.videos;
                if (p.archive) out.archive = p.archive;
                return out;
            });

            const jsonStr = JSON.stringify(jsonData, null, 4);
            const content = btoa(new TextEncoder().encode(jsonStr).reduce((s, b) => s + String.fromCharCode(b), ''));

            // Get current file SHA
            const getRes = await fetch(
                `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/projects.json?ref=${encodeURIComponent(branch)}`,
                { headers: { 'Authorization': `Bearer ${pat}`, 'Accept': 'application/vnd.github.v3+json' } }
            );
            let sha = null;
            if (getRes.ok) { sha = (await getRes.json()).sha; }

            const body = { message: 'Update projects.json via CMS overlay', content, branch };
            if (sha) body.sha = sha;

            const putRes = await fetch(
                `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/projects.json`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${pat}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                }
            );

            if (!putRes.ok) {
                const err = await putRes.json();
                console.error('GitHub publish failed:', err);
                showToast('Publish failed: ' + (err.message || 'GitHub API error'), 'error');
            } else {
                console.log('CMS overlay: Published to GitHub successfully.');
                showToast('Published! Deploy building...', 'success', 8000);
            }
        } catch (e) {
            console.error('CMS overlay: GitHub publish error:', e);
            showToast('Publish error: ' + e.message, 'error');
        }
    }

    // ─── Discard ───
    function discardChanges() {
        // Check if media was reordered or removed (requires page reload to restore)
        const hasMediaChanges = [...pendingChanges.values()].some(f => 'screenshots' in f || 'videos' in f);

        document.querySelectorAll('[data-cms-editable].cms-dirty').forEach(el => {
            el.textContent = el.dataset.cmsOriginal; el.classList.remove('cms-dirty');
        });
        document.querySelectorAll('.cms-tag-editor').forEach(e => { if (e._cmsReset) e._cmsReset(); });
        document.querySelectorAll('.cms-social-editor').forEach(e => { if (e._cmsReset) e._cmsReset(); });
        document.querySelectorAll('.media-item[data-cms-new]').forEach(i => i.remove());
        document.querySelectorAll('.work-card[data-cms-new]').forEach(c => c.remove());
        document.querySelectorAll('.cms-select').forEach(s => { s.value = s.dataset.cmsOriginal; });
        pendingChanges.clear();
        updateToolbar();

        if (hasMediaChanges) location.reload();
    }

    // ─── Toggle Edit Mode ───
    function toggleEditMode() {
        editMode = !editMode;
        document.body.classList.toggle('cms-edit-mode', editMode);
        const btn = document.querySelector('.cms-edit-toggle');
        if (btn) {
            btn.classList.toggle('active', editMode);
            btn.querySelector('.cms-label').textContent = editMode ? 'Edit: ON' : 'Edit: OFF';
        }
    }

    // ─── Inject Nav Buttons ───
    function injectNavButtons() {
        const navLinks = document.getElementById('navLinks');
        if (!navLinks || navLinks.querySelector('.cms-nav-btn')) return;

        const editBtn = document.createElement('button');
        editBtn.className = 'cms-edit-toggle';
        editBtn.innerHTML = `<span class="toggle-dot"></span> <span class="cms-label">Edit: OFF</span>`;
        editBtn.addEventListener('click', toggleEditMode);
        navLinks.appendChild(editBtn);

        const cmsLink = document.createElement('a');
        cmsLink.href = CMS_URL; cmsLink.className = 'cms-nav-btn';
        cmsLink.innerHTML = `${ICONS.terminal} <span class="cms-label">CMS</span>`;
        navLinks.appendChild(cmsLink);
    }

    // ─── Intercept card clicks in edit mode ───
    function interceptCardClicks() {
        // Block ALL click events inside cards in edit mode — this prevents navigation.
        // CMS interactive elements (select, contenteditable, etc) work via mousedown/focus, not click.
        document.addEventListener('click', (e) => {
            if (!editMode) return;
            const card = e.target.closest('.project-card');
            if (!card) return;
            // Allow actual <a> links (socials) to still work
            if (e.target.closest('.socials a')) return;
            e.stopPropagation();
            e.preventDefault();
        }, true);
    }

    // ─── Load projects.json ───
    const PROJECTS_JSON_URL = window.location.pathname.includes('/cms/') ? '../projects.json' : 'projects.json';
    async function loadProjectsData() {
        try { const r = await fetch(PROJECTS_JSON_URL); projectsData = await r.json(); } catch {}
    }

    // ─── Keyboard Shortcuts ───
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't fire shortcuts when typing in an input/textarea/contenteditable
            const targetTag = e.target.tagName;
            const isEditingField = e.target.isContentEditable || targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT';

            // Ctrl/Cmd + E — Toggle edit mode
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                toggleEditMode();
            }
            // Ctrl/Cmd + S — Save changes (only in edit mode)
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (pendingChanges.size > 0) saveChanges();
                else showToast('No changes to save', 'info');
            }
            // Escape — Discard changes (only when not editing a field)
            const shouldDiscardOnEscape = e.key === 'Escape' && !isEditingField && editMode && pendingChanges.size > 0;
            if (shouldDiscardOnEscape) {
                discardChanges();
                showToast('Changes discarded', 'warning');
            }
        });
    }

    // ─── Spotlight Search ───
    let spotlightEl = null;
    let spotlightOpen = false;
    let spotlightIdx = 0;

    function createSpotlight() {
        if (spotlightEl) return;
        const overlay = document.createElement('div');
        overlay.className = 'spotlight-overlay';
        overlay.innerHTML = `
            <div class="spotlight-box">
                <div class="spotlight-input-wrap">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input class="spotlight-input" type="text" placeholder="Search projects, pages, actions..." autocomplete="off" spellcheck="false">
                    <span class="spotlight-hint">esc</span>
                </div>
                <div class="spotlight-results"></div>
                <div class="spotlight-footer">
                    <span><kbd>↑↓</kbd> navigate</span>
                    <span><kbd>↵</kbd> open</span>
                    <span><kbd>esc</kbd> close</span>
                </div>
            </div>
        `;
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSpotlight(); });
        document.body.appendChild(overlay);
        spotlightEl = overlay;

        const input = overlay.querySelector('.spotlight-input');
        input.addEventListener('input', () => renderSpotlightResults(input.value.trim()));
        input.addEventListener('keydown', handleSpotlightNav);
    }

    function openSpotlight() {
        createSpotlight();
        spotlightOpen = true;
        spotlightEl.classList.add('active');
        const input = spotlightEl.querySelector('.spotlight-input');
        input.value = '';
        spotlightIdx = 0;
        // Ensure project data is loaded for search results
        const ready = projectsData.length > 0 ? Promise.resolve() : loadProjectsData();
        ready.then(() => renderSpotlightResults(''));
        requestAnimationFrame(() => input.focus());
    }

    function closeSpotlight() {
        if (!spotlightEl) return;
        spotlightOpen = false;
        spotlightEl.classList.remove('active');
    }

    function getSpotlightItems(query) {
        const items = [];
        const q = query.toLowerCase();
        const isAdmin = localStorage.getItem('cms_authed');
        const isCmsPage = window.location.pathname.includes('/cms/');
        const siteRoot = isCmsPage ? '../' : '';

        // Static pages
        const pages = [
            { title: 'Projects', meta: 'Home page — all projects', url: siteRoot + 'index.html', type: 'page' },
            { title: 'About / CV', meta: 'Curriculum Vitae & download', url: siteRoot + 'about.html', type: 'page' },
            { title: 'Contact', meta: 'Email & LinkedIn', url: siteRoot + 'contact.html', type: 'page' }
        ];
        pages.forEach(p => {
            if (!q || p.title.toLowerCase().includes(q) || p.meta.toLowerCase().includes(q)) items.push(p);
        });

        // Admin actions (only if CMS user)
        if (isAdmin) {
            const actions = [
                { title: 'Open CMS Dashboard', meta: 'Manage projects & settings', action: () => { window.location.href = CMS_URL; }, type: 'action' },
                { title: 'Toggle Edit Mode', meta: 'Ctrl+E — inline editing', action: () => { toggleEditMode(); }, type: 'action' },
            ];
            if (pendingChanges.size > 0) {
                actions.push({ title: 'Save Changes', meta: `${pendingChanges.size} pending`, action: () => { saveChanges(); }, type: 'action' });
                actions.push({ title: 'Discard Changes', meta: 'Revert all edits', action: () => { discardChanges(); }, type: 'action' });
            }
            actions.forEach(a => {
                if (!q || a.title.toLowerCase().includes(q) || a.meta.toLowerCase().includes(q)) items.push(a);
            });
        }

        // Projects
        const typeLabels = TYPE_LABELS;
        projectsData.forEach(p => {
            const searchable = [p.title, p.description, p.language, p.engine, p.role, typeLabels[p.type] || p.type, ...(p.tags || [])].join(' ').toLowerCase();
            if (!q || searchable.includes(q)) {
                const imgSrc = p.minisrc
                    ? (p.minisrc.startsWith('/') || p.minisrc.startsWith('http') ? p.minisrc : siteRoot + p.minisrc)
                    : null;
                items.push({
                    title: p.title,
                    meta: [p.engine, p.language, p.role].filter(Boolean).join(' · '),
                    url: p.card ? siteRoot + `project.html?id=${p.id}` : null,
                    img: imgSrc,
                    type: 'project'
                });
            }
        });

        return items;
    }

    function renderSpotlightResults(query) {
        const results = spotlightEl.querySelector('.spotlight-results');
        const items = getSpotlightItems(query);

        if (items.length === 0) {
            results.innerHTML = `<div class="spotlight-empty">No results for "${query}"</div>`;
            spotlightIdx = 0;
            return;
        }

        const SPOTLIGHT_ICONS = {
            project: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
            action: '<polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>',
            page: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>'
        };

        spotlightIdx = Math.min(spotlightIdx, items.length - 1);
        results.innerHTML = items.map((item, i) => `
            <div class="spotlight-result${i === spotlightIdx ? ' active' : ''}" data-idx="${i}">
                <div class="spotlight-result-icon">
                    ${item.img
                        ? `<img src="${item.img}" alt="" onerror="this.style.display='none'">`
                        : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${SPOTLIGHT_ICONS[item.type] || SPOTLIGHT_ICONS.page}</svg>`}
                </div>
                <div class="spotlight-result-text">
                    <div class="spotlight-result-title">${item.title}</div>
                    <div class="spotlight-result-meta">${item.meta}</div>
                </div>
                <span class="spotlight-result-badge ${item.type}">${item.type}</span>
            </div>
        `).join('');

        results.querySelectorAll('.spotlight-result').forEach(el => {
            el.addEventListener('click', () => executeSpotlightItem(items[parseInt(el.dataset.idx)]));
        });
    }

    function handleSpotlightNav(e) {
        if (!spotlightOpen) return;
        const results = spotlightEl.querySelector('.spotlight-results');
        const items = results.querySelectorAll('.spotlight-result');
        if (e.key === 'Escape') { e.preventDefault(); closeSpotlight(); return; }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            spotlightIdx = Math.min(spotlightIdx + 1, items.length - 1);
            updateSpotlightActive(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            spotlightIdx = Math.max(spotlightIdx - 1, 0);
            updateSpotlightActive(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (items[spotlightIdx]) items[spotlightIdx].click();
        }
    }

    function updateSpotlightActive(items) {
        items.forEach((el, i) => el.classList.toggle('active', i === spotlightIdx));
        if (items[spotlightIdx]) items[spotlightIdx].scrollIntoView({ block: 'nearest' });
    }

    function executeSpotlightItem(item) {
        closeSpotlight();
        if (item.action) { item.action(); return; }
        if (item.url) window.location.href = item.url;
    }

    function setupSpotlight() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K or Ctrl/Cmd + F to open spotlight
            if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'f')) {
                e.preventDefault();
                if (spotlightOpen) closeSpotlight(); else openSpotlight();
                return;
            }
            // / to open spotlight (only when not typing)
            if (e.key === '/' && !spotlightOpen) {
                const tag = e.target.tagName;
                if (e.target.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
                e.preventDefault();
                openSpotlight();
            }
        });
    }

    // ─── Konami Code Easter Egg ───
    function setupKonamiCode() {
        const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
        let pos = 0;
        document.addEventListener('keydown', (e) => {
            if (e.key === KONAMI[pos]) {
                pos++;
                if (pos === KONAMI.length) {
                    pos = 0;
                    triggerKonami();
                }
            } else {
                pos = e.key === KONAMI[0] ? 1 : 0;
            }
        });
    }

    function triggerKonami() {
        // Spawn confetti particles using theme colors
        const cs = getComputedStyle(document.documentElement);
        const colors = [
            cs.getPropertyValue('--color-cyan').trim() || '#00f0ff',
            cs.getPropertyValue('--color-green').trim() || '#3aff7f',
            cs.getPropertyValue('--color-yellow').trim() || '#ffe03a',
            cs.getPropertyValue('--color-pink').trim() || '#ff3a6e'
        ];
        for (let i = 0; i < 80; i++) {
            const p = document.createElement('div');
            p.className = 'konami-particle';
            p.style.left = Math.random() * 100 + 'vw';
            p.style.top = -(Math.random() * 20 + 10) + 'px';
            p.style.background = colors[Math.floor(Math.random() * colors.length)];
            p.style.width = (4 + Math.random() * 8) + 'px';
            p.style.height = (4 + Math.random() * 8) + 'px';
            p.style.animationDuration = (2 + Math.random() * 3) + 's';
            p.style.animationDelay = (Math.random() * 1.5) + 's';
            document.body.appendChild(p);
            setTimeout(() => p.remove(), 6000);
        }

        // Achievement popup
        const badge = document.createElement('div');
        badge.className = 'konami-achievement';
        badge.innerHTML = `
            <h2>&#127918; Achievement Unlocked</h2>
            <p>&#8593;&#8593;&#8595;&#8595;&#8592;&#8594;&#8592;&#8594; B A</p>
            <p class="konami-sub">You found the secret code! A true gamer.</p>
        `;
        document.body.appendChild(badge);
        setTimeout(() => badge.remove(), 5000);
    }

    // ─── Activate ───
    function activate() {
        injectStyles();
        createToolbar();
        injectNavButtons();
        interceptCardClicks();
        setupCardEditing();
        setupDetailEditing();
        setupKeyboardShortcuts();
        setupSpotlight();
        setupKonamiCode();

        if (!document.querySelector('.cms-nav-btn')) {
            const retry = setInterval(() => {
                injectNavButtons();
                if (document.querySelector('.cms-nav-btn')) clearInterval(retry);
            }, 200);
            setTimeout(() => clearInterval(retry), 5000);
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', activate);
    else activate();
})();
