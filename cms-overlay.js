// ─────────────────────────────────────────────────────────────
//  CMS Overlay — Inline editing on the live site
//  Activates when cms_authed flag is set in localStorage.
//  Makes text fields contenteditable, saves to Firestore,
//  and offers a floating toolbar to publish changes.
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
    const LABEL_TO_TYPE = Object.fromEntries(Object.entries(TYPE_LABELS).map(([k, v]) => [v, k]));

    // ─── State ───
    let firebaseApp = null;
    let db = null;
    let projectsData = [];
    let pendingChanges = new Map();
    let firebaseReady = false;

    // ─── Inject Styles ───
    function injectStyles() {
        if (document.getElementById('cms-overlay-styles')) return;
        const style = document.createElement('style');
        style.id = 'cms-overlay-styles';
        style.textContent = `
            /* CMS Nav Button */
            .cms-nav-btn {
                display: inline-flex;
                align-items: center;
                gap: 0.4rem;
                padding: 0.3rem 0.65rem;
                font-family: var(--font-mono);
                font-size: 0.6rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                color: var(--color-cyan);
                border: 1px solid rgba(0, 240, 255, 0.2);
                background: rgba(0, 240, 255, 0.04);
                text-decoration: none;
                transition: all 0.2s ease;
                cursor: pointer;
                opacity: 0.5;
            }
            .cms-nav-btn:hover {
                opacity: 1;
                background: rgba(0, 240, 255, 0.1);
                border-color: rgba(0, 240, 255, 0.4);
                color: var(--color-cyan);
            }

            /* Editable field highlight */
            [data-cms-editable] {
                position: relative;
                transition: outline 0.15s ease, background 0.15s ease;
                outline: 1px dashed transparent;
                outline-offset: 4px;
                cursor: text;
            }
            [data-cms-editable]:hover {
                outline-color: rgba(0, 240, 255, 0.3);
            }
            [data-cms-editable]:focus {
                outline-color: var(--color-cyan);
                background: rgba(0, 240, 255, 0.03);
                outline-style: solid;
            }
            [data-cms-editable].cms-dirty {
                outline-color: rgba(255, 224, 58, 0.5);
                outline-style: dashed;
            }
            [data-cms-editable].cms-dirty:focus {
                outline-color: var(--color-yellow);
                outline-style: solid;
            }
            [data-cms-editable].cms-saved {
                animation: cms-flash-save 0.6s ease;
            }
            @keyframes cms-flash-save {
                0%   { outline-color: var(--color-green); background: rgba(58, 255, 127, 0.06); }
                100% { outline-color: transparent; background: transparent; }
            }

            /* CMS inline tag editing */
            .cms-tag-editor {
                display: flex;
                flex-wrap: wrap;
                gap: 0.3rem;
                align-items: center;
                margin-top: 0.25rem;
            }
            .cms-tag-pill {
                display: inline-flex;
                align-items: center;
                gap: 0.25rem;
                padding: 0.15rem 0.5rem;
                font-family: var(--font-mono);
                font-size: 0.55rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.06em;
                background: rgba(0, 240, 255, 0.08);
                border: 1px solid rgba(0, 240, 255, 0.2);
                color: var(--color-cyan);
            }
            .cms-tag-remove {
                cursor: pointer;
                opacity: 0.5;
                font-size: 0.7rem;
                line-height: 1;
                transition: opacity 0.15s;
            }
            .cms-tag-remove:hover { opacity: 1; color: var(--color-pink); }
            .cms-tag-input {
                border: none;
                background: transparent;
                color: var(--text-primary);
                font-family: var(--font-mono);
                font-size: 0.55rem;
                width: 70px;
                outline: none;
                padding: 0.15rem 0.3rem;
                border-bottom: 1px dashed rgba(0, 240, 255, 0.3);
            }
            .cms-tag-input::placeholder { color: var(--text-muted); opacity: 0.5; }

            /* CMS Add Button (for work items, media, etc.) */
            .cms-add-inline {
                display: inline-flex;
                align-items: center;
                gap: 0.4rem;
                padding: 0.5rem 1rem;
                font-family: var(--font-mono);
                font-size: 0.6rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                color: var(--color-cyan);
                border: 1px dashed rgba(0, 240, 255, 0.25);
                background: rgba(0, 240, 255, 0.03);
                cursor: pointer;
                transition: all 0.2s ease;
                margin-top: 0.75rem;
            }
            .cms-add-inline:hover {
                background: rgba(0, 240, 255, 0.08);
                border-color: rgba(0, 240, 255, 0.5);
                border-style: solid;
            }

            /* CMS media input (for adding screenshot/video URLs) */
            .cms-media-input-wrap {
                display: flex;
                gap: 0.5rem;
                margin-top: 0.75rem;
                align-items: center;
            }
            .cms-media-input-wrap input {
                flex: 1;
                padding: 0.4rem 0.6rem;
                font-family: var(--font-mono);
                font-size: 0.6rem;
                background: rgba(0, 240, 255, 0.03);
                border: 1px solid rgba(0, 240, 255, 0.2);
                color: var(--text-primary);
                outline: none;
            }
            .cms-media-input-wrap input:focus {
                border-color: var(--color-cyan);
            }
            .cms-media-input-wrap button {
                padding: 0.4rem 0.7rem;
                font-family: var(--font-mono);
                font-size: 0.6rem;
                font-weight: 700;
                text-transform: uppercase;
                color: var(--color-green);
                border: 1px solid rgba(58, 255, 127, 0.3);
                background: rgba(58, 255, 127, 0.05);
                cursor: pointer;
                transition: all 0.15s ease;
            }
            .cms-media-input-wrap button:hover {
                background: rgba(58, 255, 127, 0.15);
                border-color: var(--color-green);
            }

            /* Floating CMS toolbar */
            .cms-toolbar {
                position: fixed;
                bottom: 1.5rem;
                left: 50%;
                transform: translateX(-50%) translateY(100px);
                z-index: 9999;
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.6rem 1.2rem;
                background: rgba(10, 12, 18, 0.95);
                border: 1px solid rgba(0, 240, 255, 0.2);
                backdrop-filter: blur(12px);
                font-family: var(--font-mono);
                font-size: 0.65rem;
                color: var(--text-secondary);
                transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
                opacity: 0;
                pointer-events: none;
            }
            .cms-toolbar.visible {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
                pointer-events: all;
            }
            .cms-toolbar-status {
                display: flex;
                align-items: center;
                gap: 0.4rem;
                color: var(--color-yellow);
                text-transform: uppercase;
                letter-spacing: 0.08em;
                font-weight: 600;
            }
            .cms-toolbar-status .dot {
                width: 6px; height: 6px;
                background: var(--color-yellow);
                border-radius: 50%;
                animation: cms-pulse 1.5s ease infinite;
            }
            @keyframes cms-pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.3; }
            }
            .cms-toolbar-btn {
                padding: 0.35rem 0.8rem;
                font-family: var(--font-mono);
                font-size: 0.6rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                border: 1px solid;
                cursor: pointer;
                transition: all 0.2s ease;
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                gap: 0.35rem;
            }
            .cms-toolbar-btn.save {
                color: var(--color-green);
                border-color: rgba(58, 255, 127, 0.3);
                background: rgba(58, 255, 127, 0.05);
            }
            .cms-toolbar-btn.save:hover {
                background: rgba(58, 255, 127, 0.15);
                border-color: var(--color-green);
            }
            .cms-toolbar-btn.discard {
                color: var(--text-muted);
                border-color: var(--border-subtle);
                background: transparent;
            }
            .cms-toolbar-btn.discard:hover {
                color: var(--color-pink);
                border-color: rgba(255, 58, 58, 0.3);
            }
            .cms-toolbar-btn.cms-link {
                color: var(--text-muted);
                border-color: var(--border-subtle);
                background: transparent;
            }
            .cms-toolbar-btn.cms-link:hover {
                color: var(--color-cyan);
                border-color: rgba(0, 240, 255, 0.3);
            }
            .cms-toolbar-divider {
                width: 1px;
                height: 20px;
                background: var(--border-subtle);
            }

            @media (max-width: 768px) {
                .cms-toolbar {
                    bottom: 0.75rem;
                    padding: 0.5rem 0.8rem;
                    gap: 0.5rem;
                    font-size: 0.55rem;
                }
                .cms-nav-btn span.cms-label { display: none; }
            }
        `;
        document.head.appendChild(style);
    }

    // ─── SVG Icons ───
    const ICONS = {
        terminal: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
        plus: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    };

    // ─── Create Floating Toolbar ───
    function createToolbar() {
        if (document.querySelector('.cms-toolbar')) return;

        const bar = document.createElement('div');
        bar.className = 'cms-toolbar';
        bar.innerHTML = `
            <div class="cms-toolbar-status">
                <span class="dot"></span>
                <span class="cms-change-count">0 changes</span>
            </div>
            <div class="cms-toolbar-divider"></div>
            <button class="cms-toolbar-btn save" data-action="save" title="Save to Firestore">Save</button>
            <button class="cms-toolbar-btn discard" data-action="discard" title="Discard changes">Discard</button>
            <div class="cms-toolbar-divider"></div>
            <a href="${CMS_URL}" class="cms-toolbar-btn cms-link" title="Open full CMS">${ICONS.terminal} CMS</a>
        `;
        document.body.appendChild(bar);

        bar.querySelector('[data-action="save"]').addEventListener('click', saveChanges);
        bar.querySelector('[data-action="discard"]').addEventListener('click', discardChanges);
    }

    function updateToolbar() {
        const bar = document.querySelector('.cms-toolbar');
        if (!bar) return;

        let totalFields = 0;
        pendingChanges.forEach(fields => { totalFields += Object.keys(fields).length; });

        const label = bar.querySelector('.cms-change-count');
        label.textContent = `${totalFields} change${totalFields !== 1 ? 's' : ''}`;

        if (totalFields > 0) {
            bar.classList.add('visible');
        } else {
            bar.classList.remove('visible');
        }
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
            if (Object.keys(pendingChanges.get(projectId)).length === 0) {
                pendingChanges.delete(projectId);
            }
        }
        updateToolbar();
    }

    // ─── Firebase Init (lazy) ───
    // Must use the DEFAULT app name (no name) to share the auth session
    // that admin.js created. Firebase persists auth in IndexedDB keyed by app name.
    async function initFirebase() {
        if (firebaseReady) return true;
        try {
            const [{ initializeApp, getApp }, { getFirestore }, { getAuth, onAuthStateChanged }] = await Promise.all([
                import('https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js'),
                import('https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js'),
                import('https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js')
            ]);

            const configModule = await import('./cms/firebase-config.js');
            const firebaseConfig = configModule.default;
            if (!firebaseConfig || firebaseConfig.apiKey === 'YOUR_API_KEY') return false;

            // Try to get the existing default app first (admin.js may have created it),
            // otherwise initialize it ourselves with the default name.
            try {
                firebaseApp = getApp();
            } catch {
                firebaseApp = initializeApp(firebaseConfig);
            }

            db = getFirestore(firebaseApp);

            const auth = getAuth(firebaseApp);
            const user = await new Promise((resolve) => {
                const unsub = onAuthStateChanged(auth, (u) => { unsub(); resolve(u); });
                setTimeout(() => resolve(null), 8000);
            });

            if (!user || user.email !== 'thovexii@gmail.com') {
                console.warn('CMS overlay: auth check failed — user:', user?.email);
                localStorage.removeItem('cms_authed');
                return false;
            }

            firebaseReady = true;
            return true;
        } catch (e) {
            console.warn('CMS overlay: Firebase init failed', e);
            return false;
        }
    }

    // ─── Make text elements editable ───
    function makeEditable(el, projectId, field) {
        el.setAttribute('contenteditable', 'true');
        el.setAttribute('spellcheck', 'false');
        el.dataset.cmsEditable = '';
        el.dataset.cmsProjectId = projectId;
        el.dataset.cmsField = field;
        el.dataset.cmsOriginal = el.textContent.trim();

        el.addEventListener('blur', () => {
            const newVal = el.textContent.trim();
            const original = el.dataset.cmsOriginal;

            if (newVal !== original) {
                el.classList.add('cms-dirty');
                setPending(projectId, field, newVal);
            } else {
                el.classList.remove('cms-dirty');
                clearPending(projectId, field);
            }
        });

        // Single-line fields: Enter = commit
        if (!['description', 'longdescription'].includes(field) && !field.includes('.description')) {
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
            });
        }
    }

    // ─── Meta text editable (for card meta spans with SVG + text) ───
    // These spans contain an SVG icon followed by a text node.
    // We wrap the text node in a <span> and make THAT editable.
    function makeMetaEditable(metaSpan, projectId, field) {
        let textSpan = metaSpan.querySelector('.cms-meta-text');
        if (!textSpan) {
            const textContent = metaSpan.textContent.trim();
            // Remove text nodes, keep SVG
            Array.from(metaSpan.childNodes)
                .filter(n => n.nodeType === Node.TEXT_NODE)
                .forEach(n => n.remove());
            textSpan = document.createElement('span');
            textSpan.className = 'cms-meta-text';
            textSpan.textContent = textContent;
            metaSpan.appendChild(textSpan);
        }
        makeEditable(textSpan, projectId, field);
    }

    // ─── Tag editor UI ───
    function createTagEditor(container, projectId, currentTags) {
        if (container.querySelector('.cms-tag-editor')) return;

        const originalTags = [...currentTags];
        const tags = [...currentTags];

        const editor = document.createElement('div');
        editor.className = 'cms-tag-editor';

        function render() {
            editor.innerHTML = '';
            tags.forEach((tag, i) => {
                const pill = document.createElement('span');
                pill.className = 'cms-tag-pill';
                pill.innerHTML = `${tag} <span class="cms-tag-remove" data-i="${i}">×</span>`;
                pill.querySelector('.cms-tag-remove').addEventListener('click', (e) => {
                    e.stopPropagation();
                    tags.splice(i, 1);
                    render();
                    checkDirty();
                });
                editor.appendChild(pill);
            });

            const input = document.createElement('input');
            input.className = 'cms-tag-input';
            input.placeholder = '+ tag';
            input.addEventListener('keydown', (e) => {
                if ((e.key === 'Enter' || e.key === ',') && input.value.trim()) {
                    e.preventDefault();
                    const val = input.value.trim().toLowerCase().replace(/,/g, '');
                    if (val && !tags.includes(val)) {
                        tags.push(val);
                        render();
                        checkDirty();
                    }
                    input.value = '';
                }
                if (e.key === 'Backspace' && !input.value && tags.length > 0) {
                    tags.pop();
                    render();
                    checkDirty();
                }
            });
            input.addEventListener('click', (e) => e.stopPropagation());
            editor.appendChild(input);
        }

        function checkDirty() {
            const changed = JSON.stringify(tags) !== JSON.stringify(originalTags);
            if (changed) {
                setPending(projectId, 'tags', [...tags]);
                editor.style.outlineColor = 'rgba(255, 224, 58, 0.5)';
            } else {
                clearPending(projectId, 'tags');
                editor.style.outlineColor = 'transparent';
            }
        }

        render();
        container.appendChild(editor);

        // Store reset function for discard
        editor.dataset.cmsProjectId = projectId;
        editor._cmsReset = () => {
            tags.length = 0;
            tags.push(...originalTags);
            render();
            editor.style.outlineColor = 'transparent';
        };
    }

    // ─── Add Work Item UI ───
    function addWorkItemUI(workGrid, projectId) {
        if (workGrid.querySelector('.cms-add-inline[data-for="work"]')) return;

        const btn = document.createElement('button');
        btn.className = 'cms-add-inline';
        btn.dataset.for = 'work';
        btn.innerHTML = `${ICONS.plus} Add Contribution`;
        btn.addEventListener('click', () => {
            const idx = workGrid.querySelectorAll('.work-card').length;

            const card = document.createElement('div');
            card.className = 'work-card';
            card.innerHTML = `<h4>New Contribution</h4><p>Description here...</p>`;
            workGrid.insertBefore(card, btn);

            const h4 = card.querySelector('h4');
            const p = card.querySelector('p');
            makeEditable(h4, projectId, `work.${idx}.title`);
            makeEditable(p, projectId, `work.${idx}.description`);

            // Mark as new / dirty immediately
            setPending(projectId, `work.${idx}.title`, 'New Contribution');
            setPending(projectId, `work.${idx}.description`, 'Description here...');
            h4.classList.add('cms-dirty');
            p.classList.add('cms-dirty');
            h4.focus();
        });

        workGrid.appendChild(btn);
    }

    // ─── Add Media UI ───
    function addMediaUI(mediaGrid, projectId) {
        if (mediaGrid.querySelector('.cms-media-input-wrap')) return;

        const wrap = document.createElement('div');
        wrap.className = 'cms-media-input-wrap';
        wrap.innerHTML = `
            <input type="text" placeholder="res/projects/.../ss_01.png or YouTube URL" />
            <button type="button">+ Add</button>
        `;

        const input = wrap.querySelector('input');
        const addBtn = wrap.querySelector('button');

        addBtn.addEventListener('click', () => {
            const src = input.value.trim();
            if (!src) return;

            // Determine type: screenshot or video
            const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(src) ||
                            src.includes('youtube.com') || src.includes('youtu.be');

            const field = isVideo ? '_addVideo' : '_addScreenshot';

            // Build pending array addition
            if (!pendingChanges.has(projectId)) pendingChanges.set(projectId, {});
            const pending = pendingChanges.get(projectId);
            if (!pending[field]) pending[field] = [];
            pending[field].push(src);

            // Add visual preview
            const item = document.createElement('div');
            item.className = 'media-item';
            item.setAttribute('data-reveal', '');
            item.classList.add('revealed');
            if (isVideo) {
                const ytMatch = src.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
                if (ytMatch) {
                    item.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytMatch[1]}" allowfullscreen loading="lazy"></iframe>`;
                } else {
                    item.innerHTML = `<video src="${src}" controls muted loop preload="none"></video>`;
                }
                item.style.cursor = 'default';
            } else {
                item.innerHTML = `<img src="${src}" alt="New media" loading="lazy">`;
            }
            item.style.outline = '1px dashed rgba(255, 224, 58, 0.5)';
            item.style.outlineOffset = '4px';
            mediaGrid.insertBefore(item, wrap);

            input.value = '';
            updateToolbar();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addBtn.click();
        });

        mediaGrid.appendChild(wrap);
    }

    // ─── Setup Editable Fields on Index Page Cards ───
    function setupCardEditing() {
        const grid = document.getElementById('projectsGrid');
        if (!grid) return;

        function process() {
            grid.querySelectorAll('.project-card').forEach(card => {
                if (card.dataset.cmsSetup) return;
                card.dataset.cmsSetup = '1';

                const projectId = card.dataset.projectId;
                if (!projectId) return;

                // Title
                const h3 = card.querySelector('.project-card-body h3');
                if (h3) makeEditable(h3, projectId, 'title');

                // Description
                const desc = card.querySelector('.project-card-desc');
                if (desc) makeEditable(desc, projectId, 'description');

                // Meta fields (contain SVG + text)
                const metaLang = card.querySelector('.meta-language');
                if (metaLang) makeMetaEditable(metaLang, projectId, 'language');

                const metaEngine = card.querySelector('.meta-engine');
                if (metaEngine) makeMetaEditable(metaEngine, projectId, 'engine');

                const metaRole = card.querySelector('.meta-role');
                if (metaRole) makeMetaEditable(metaRole, projectId, 'role');

                const metaSource = card.querySelector('.meta-source');
                if (metaSource) makeMetaEditable(metaSource, projectId, 'type');

                // Tags — replace static tags with an editable tag editor
                const tagsContainer = card.querySelector('.card-tags');
                if (tagsContainer) {
                    const project = projectsData.find(p => p.id === projectId);
                    const currentTags = project ? [...(project.tags || [])] :
                        Array.from(tagsContainer.querySelectorAll('.card-tag')).map(t => t.textContent.trim());
                    createTagEditor(tagsContainer, projectId, currentTags);
                }

                // Prevent card click when editing
                card.addEventListener('click', (e) => {
                    if (e.target.closest('[data-cms-editable]') ||
                        e.target.closest('.cms-tag-editor') ||
                        e.target.closest('.cms-tag-input')) {
                        e.stopPropagation();
                        e.preventDefault();
                    }
                }, true);
            });
        }

        const observer = new MutationObserver(() => process());
        observer.observe(grid, { childList: true });
        // Wait for projectsData to be loaded before processing
        loadProjectsData().then(() => {
            process();
            setupArchiveEditing();
        });
    }

    // ─── Setup Editable Fields on Project Detail Page ───
    function setupDetailEditing() {
        const heroContent = document.getElementById('heroContent');
        if (!heroContent) return;

        const urlParams = new URLSearchParams(window.location.search);
        const projectId = urlParams.get('id');
        if (!projectId) return;

        function process() {
            if (heroContent.dataset.cmsSetup) return;
            if (heroContent.children.length === 0) return;
            heroContent.dataset.cmsSetup = '1';

            // Title
            const h1 = heroContent.querySelector('h1');
            if (h1) makeEditable(h1, projectId, 'title');

            // Long description
            const longDesc = heroContent.querySelector('.project-long-desc');
            if (longDesc) makeEditable(longDesc, projectId, 'longdescription');

            // Meta values (role, engine, language, duration, period, source)
            heroContent.querySelectorAll('.meta-item').forEach(item => {
                const label = item.querySelector('.meta-label');
                const value = item.querySelector('.meta-value');
                if (!label || !value) return;

                const labelText = label.textContent.trim().toLowerCase();
                const fieldMap = {
                    'role': 'role',
                    'engine': 'engine',
                    'language': 'language',
                    'duration': 'duration',
                    'period': 'datetime',
                    'source': 'type',
                };
                const field = fieldMap[labelText];
                if (field) makeEditable(value, projectId, field);
            });
        }

        function processWork() {
            const workGrid = document.getElementById('workGrid');
            if (!workGrid || workGrid.dataset.cmsWorkSetup) return;
            // Skip if no work cards and section is hidden (no work items at all)
            const workSection = workGrid.closest('#workSection');
            if (workGrid.children.length === 0 && workSection && workSection.style.display === 'none') return;
            workGrid.dataset.cmsWorkSetup = '1';

            workGrid.querySelectorAll('.work-card').forEach((card, i) => {
                const h4 = card.querySelector('h4');
                const p = card.querySelector('p');
                if (h4) makeEditable(h4, projectId, `work.${i}.title`);
                if (p) makeEditable(p, projectId, `work.${i}.description`);
            });

            // Add "Add Contribution" button
            addWorkItemUI(workGrid, projectId);
        }

        function processMedia() {
            const mediaGrid = document.getElementById('mediaGrid');
            if (!mediaGrid || mediaGrid.dataset.cmsMediaSetup) return;
            mediaGrid.dataset.cmsMediaSetup = '1';

            addMediaUI(mediaGrid, projectId);
        }

        const observer = new MutationObserver(() => {
            process();
            processWork();
            processMedia();
        });
        observer.observe(heroContent, { childList: true });
        process();

        // Also observe workGrid and mediaGrid
        const workGrid = document.getElementById('workGrid');
        if (workGrid) {
            const wObserver = new MutationObserver(() => processWork());
            wObserver.observe(workGrid, { childList: true });
            processWork();
        }

        const mediaGrid = document.getElementById('mediaGrid');
        if (mediaGrid) {
            const mObserver = new MutationObserver(() => processMedia());
            mObserver.observe(mediaGrid, { childList: true });
            processMedia();
        }
    }

    // ─── Setup Archive Editing ───
    function setupArchiveEditing() {
        const archiveList = document.getElementById('archiveList');
        if (!archiveList) return;

        function process() {
            archiveList.querySelectorAll('.archive-item').forEach(item => {
                if (item.dataset.cmsSetup) return;
                item.dataset.cmsSetup = '1';

                const titleEl = item.querySelector('h4');
                const descEl = item.querySelector('.archive-info > p');
                if (!titleEl) return;

                const title = titleEl.textContent.trim();
                const project = projectsData.find(p => p.title === title);
                if (!project) return;

                makeEditable(titleEl, project.id, 'title');
                if (descEl) makeEditable(descEl, project.id, 'description');
            });
        }

        const observer = new MutationObserver(() => process());
        observer.observe(archiveList, { childList: true });
        process();
    }

    // ─── Save Changes to Firestore ───
    async function saveChanges() {
        if (pendingChanges.size === 0) return;

        const ok = await initFirebase();
        if (!ok) {
            alert('Firebase auth failed. Please log into the CMS first.');
            return;
        }

        const { doc, getDoc, setDoc } = await import('https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js');

        const saveBtn = document.querySelector('.cms-toolbar-btn.save');
        if (saveBtn) { saveBtn.textContent = 'Saving...'; saveBtn.disabled = true; }

        try {
            for (const [projectId, fields] of pendingChanges) {
                const docRef = doc(db, 'projects', projectId);
                const snap = await getDoc(docRef);
                if (!snap.exists()) {
                    console.warn(`Project ${projectId} not found in Firestore`);
                    continue;
                }

                const data = snap.data();

                for (const [field, value] of Object.entries(fields)) {
                    // Special: _addScreenshot array — append to screenshots
                    if (field === '_addScreenshot') {
                        if (!data.screenshots) data.screenshots = [];
                        value.forEach(src => {
                            data.screenshots.push({ src, alt: '' });
                        });
                        continue;
                    }
                    // Special: _addVideo array — append to videos
                    if (field === '_addVideo') {
                        if (!data.videos) data.videos = [];
                        value.forEach(src => {
                            data.videos.push({ src });
                        });
                        continue;
                    }
                    // Special: type field — convert display label back to key
                    if (field === 'type') {
                        data.type = LABEL_TO_TYPE[value] || value;
                        continue;
                    }
                    // Special: tags — direct array replacement
                    if (field === 'tags') {
                        data.tags = value;
                        continue;
                    }
                    // Handle nested fields like work.0.title
                    if (field.includes('.')) {
                        const parts = field.split('.');
                        let obj = data;
                        for (let i = 0; i < parts.length - 1; i++) {
                            const key = isNaN(parts[i]) ? parts[i] : parseInt(parts[i]);
                            if (obj[key] === undefined) {
                                // Create missing intermediate objects/arrays
                                obj[key] = isNaN(parts[i + 1]) ? {} : [];
                            }
                            obj = obj[key];
                        }
                        const lastKey = isNaN(parts[parts.length - 1]) ? parts[parts.length - 1] : parseInt(parts[parts.length - 1]);
                        obj[lastKey] = value;
                    } else {
                        data[field] = value;
                    }
                }

                // Handle new work items — they come as work.N.title + work.N.description
                // Ensure work array is extended
                const workKeys = Object.keys(fields).filter(k => k.startsWith('work.'));
                if (workKeys.length > 0) {
                    if (!data.work) data.work = [];
                    workKeys.forEach(key => {
                        const parts = key.split('.');
                        const idx = parseInt(parts[1]);
                        while (data.work.length <= idx) {
                            data.work.push({ title: '', description: '' });
                        }
                        data.work[idx][parts[2]] = fields[key];
                    });
                }

                await setDoc(docRef, data);
            }

            // Flash green on all dirty elements
            document.querySelectorAll('.cms-dirty').forEach(el => {
                el.classList.remove('cms-dirty');
                el.classList.add('cms-saved');
                el.dataset.cmsOriginal = el.textContent.trim();
                setTimeout(() => el.classList.remove('cms-saved'), 600);
            });

            // Reset tag editors
            document.querySelectorAll('.cms-tag-editor').forEach(editor => {
                if (editor.style) editor.style.outlineColor = 'transparent';
            });

            // Reset media input outlines
            document.querySelectorAll('.media-item[style*="outline"]').forEach(item => {
                item.style.outline = '';
                item.style.outlineOffset = '';
            });

            pendingChanges.clear();
            updateToolbar();
        } catch (e) {
            console.error('CMS save error:', e);
            alert('Save failed: ' + e.message);
        } finally {
            if (saveBtn) { saveBtn.textContent = 'Save'; saveBtn.disabled = false; }
        }
    }

    // ─── Discard Changes ───
    function discardChanges() {
        document.querySelectorAll('[data-cms-editable].cms-dirty').forEach(el => {
            el.textContent = el.dataset.cmsOriginal;
            el.classList.remove('cms-dirty');
        });

        // Reset tag editors
        document.querySelectorAll('.cms-tag-editor').forEach(editor => {
            if (editor._cmsReset) editor._cmsReset();
        });

        // Remove newly added media items (those with yellow outline)
        document.querySelectorAll('.media-item[style*="outline"]').forEach(item => item.remove());

        pendingChanges.clear();
        updateToolbar();
    }

    // ─── Inject Nav Button ───
    function injectNavButton() {
        const navLinks = document.getElementById('navLinks');
        if (!navLinks || navLinks.querySelector('.cms-nav-btn')) return;

        const cmsLink = document.createElement('a');
        cmsLink.href = CMS_URL;
        cmsLink.className = 'cms-nav-btn';
        cmsLink.innerHTML = `${ICONS.terminal} <span class="cms-label">CMS</span>`;
        cmsLink.title = 'Open CMS Panel';
        navLinks.appendChild(cmsLink);
    }

    // ─── Load projects.json ───
    async function loadProjectsData() {
        try {
            const res = await fetch('projects.json');
            projectsData = await res.json();
        } catch { /* silent */ }
    }

    // ─── Activate ───
    function activate() {
        injectStyles();
        createToolbar();
        injectNavButton();
        setupCardEditing();
        setupDetailEditing();


        // Retry nav injection
        if (!document.querySelector('.cms-nav-btn')) {
            const retry = setInterval(() => {
                injectNavButton();
                if (document.querySelector('.cms-nav-btn')) clearInterval(retry);
            }, 200);
            setTimeout(() => clearInterval(retry), 5000);
        }
    }

    // ─── Boot ───
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', activate);
    } else {
        activate();
    }
})();
