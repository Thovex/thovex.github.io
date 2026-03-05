// ─────────────────────────────────────────────────────────────
//  CMS Admin — jessevanvliet.xyz
//  Firebase Auth (Google Sign-In + TOTP MFA) + Firestore CRUD
// ─────────────────────────────────────────────────────────────

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js';
import {
    getAuth,
    signInWithPopup,
    reauthenticateWithPopup,
    GoogleAuthProvider,
    multiFactor,
    TotpMultiFactorGenerator,
    getMultiFactorResolver,
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js';
import {
    getFirestore,
    collection,
    doc,
    getDocs,
    setDoc,
    deleteDoc,
    query,
    orderBy
} from 'https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js';

import { initStatistics, saveGA4Property } from './statistics.js';

// ─── Constants ───
const ALLOWED_EMAIL = 'thovexii@gmail.com';
const GITHUB_DEFAULTS = { owner: 'Thovex', repo: 'thovex.github.io', branch: 'main' };
const SITE_ROOT = '../';

// ─── Firebase Init ───
let app, auth, db;
let mfaResolver = null;

try {
    const configModule = await import('./firebase-config.js');
    const firebaseConfig = configModule.default;

    if (!firebaseConfig || firebaseConfig.apiKey === 'YOUR_API_KEY') {
        throw new Error('Firebase not configured');
    }

    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (e) {
    console.error('Firebase init failed:', e.message);
    showToast('Firebase not configured. Copy firebase-config.example.js → firebase-config.js and add your keys.', 'error');
}

// ─── DOM References ───
const $ = (id) => document.getElementById(id);

const screens = {
    login: $('loginScreen'),
    mfa: $('mfaScreen'),
    dashboard: $('dashboardScreen')
};

function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    if (screens[name]) screens[name].classList.add('active');
    // Trigger reveal animation on visible elements
    requestAnimationFrame(() => {
        document.querySelectorAll('.screen.active [data-reveal]').forEach(el => {
            el.classList.add('revealed');
        });
    });
}

// ─── Toast Notifications ───
function showToast(message, type = 'info') {
    const container = $('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// ─── Confirm Dialog ───
function showConfirm(title, message, { okLabel = 'Confirm', okClass = 'btn-primary' } = {}) {
    return new Promise((resolve) => {
        $('confirmTitle').textContent = title;
        $('confirmMessage').textContent = message;

        const btn = $('btnConfirmOk');
        btn.textContent = okLabel;
        btn.className = `btn ${okClass}`;

        $('confirmDialog').classList.add('active');

        const cleanup = () => $('confirmDialog').classList.remove('active');

        btn.onclick = () => { cleanup(); resolve(true); };
        $('btnConfirmCancel').onclick = () => { cleanup(); resolve(false); };
    });
}

// ─── Media Helpers ───
function getYouTubeId(url) {
    if (!url) return null;
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
}

function isVideoUrl(src) {
    if (!src) return false;
    return /\.(mp4|webm|ogg|mov)$/i.test(src) || getYouTubeId(src);
}

function isImageUrl(src) {
    if (!src) return false;
    return /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(src);
}

function resolveMediaPath(src) {
    if (!src) return '';
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) return src;
    return SITE_ROOT + src;
}

function renderMediaPreview(container, src) {
    if (!container) return;
    container.innerHTML = '';
    if (!src) return;

    const ytId = getYouTubeId(src);
    if (ytId) {
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube-nocookie.com/embed/${ytId}`;
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('loading', 'lazy');
        iframe.setAttribute('frameborder', '0');
        container.appendChild(iframe);
        return;
    }

    const resolved = resolveMediaPath(src);

    if (isVideoUrl(src)) {
        const video = document.createElement('video');
        video.src = resolved;
        video.muted = true;
        video.loop = true;
        video.setAttribute('preload', 'metadata');
        video.addEventListener('mouseenter', () => video.play());
        video.addEventListener('mouseleave', () => { video.pause(); video.currentTime = 0; });
        container.appendChild(video);
    } else if (isImageUrl(src)) {
        const img = document.createElement('img');
        img.src = resolved;
        img.alt = 'Preview';
        img.loading = 'lazy';
        img.onerror = () => { container.innerHTML = '<span class="preview-error">⚠ Image not found</span>'; };
        container.appendChild(img);
    } else if (src) {
        container.innerHTML = '<span class="preview-error">Unknown media type</span>';
    }
}

function renderSocialPreview(container, icon, url) {
    if (!container) return;
    container.innerHTML = '';
    if (!icon && !url) return;

    const preview = document.createElement('div');
    preview.className = 'social-link-preview';

    if (icon) {
        const img = document.createElement('img');
        img.src = resolveMediaPath(icon);
        img.alt = 'Icon';
        img.onerror = () => img.remove();
        preview.appendChild(img);
    } else if (url) {
        try {
            const hostname = new URL(url).hostname;
            const favicon = document.createElement('img');
            favicon.className = 'favicon';
            favicon.src = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
            favicon.alt = '';
            preview.appendChild(favicon);
        } catch {}
    }

    if (url) {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = url;
        preview.appendChild(link);
    }

    container.appendChild(preview);
}

function debounce(fn, ms = 400) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

function attachPreviewListener(input, previewContainer) {
    const update = debounce(() => renderMediaPreview(previewContainer, input.value.trim()));
    input.addEventListener('input', update);
    if (input.value.trim()) update();
}

// ─── Dynamic Settings (Languages, Types) ───
let cmsLanguages = ['C++', 'C#', 'C', 'Java', 'JavaScript', 'TypeScript', 'Python', 'GDScript', 'Lua', 'Rust', 'Go', 'Blueprint', 'Verse', 'meow-speak'];
let cmsEngines = ['Unreal', 'Unity', 'Radiance', 'UEFN', 'Godot', 'Custom', 'Real Life'];
let cmsTypes = [
    { value: 'Hobby', label: 'Hobby' },
    { value: 'BSS', label: 'Bright Star Studios' },
    { value: 'BH', label: 'Baer & Hoggo' },
    { value: 'HKU', label: 'HKU' },
    { value: 'Zloppy-Games', label: 'Zloppy Games' },
    { value: 'PixelPool', label: 'PixelPool' }
];

async function loadCmsSettings() {
    if (!db) return;
    try {
        const langDoc = await getDocs(query(collection(db, 'settings')));
        langDoc.forEach(d => {
            if (d.id === 'languages' && d.data().list) cmsLanguages = d.data().list;
            if (d.id === 'engines' && d.data().list) cmsEngines = d.data().list;
            if (d.id === 'types' && d.data().list) cmsTypes = d.data().list;
        });
    } catch (e) { console.warn('Settings load failed:', e.message); }
    renderSettingsManagers();
}

async function saveCmsLanguages() {
    if (!db) return;
    try {
        await setDoc(doc(db, 'settings', 'languages'), { list: cmsLanguages });
        showToast('Languages saved.', 'success');
    } catch (e) { showToast('Failed to save languages.', 'error'); }
}

async function saveCmsEngines() {
    if (!db) return;
    try {
        await setDoc(doc(db, 'settings', 'engines'), { list: cmsEngines });
        showToast('Engines saved.', 'success');
    } catch (e) { showToast('Failed to save engines.', 'error'); }
}

async function saveCmsTypes() {
    if (!db) return;
    try {
        await setDoc(doc(db, 'settings', 'types'), { list: cmsTypes });
        showToast('Types saved.', 'success');
    } catch (e) { showToast('Failed to save types.', 'error'); }
}

function renderSettingsManagers() {
    // Languages manager
    const langContainer = $('languagesManager');
    if (langContainer) {
        langContainer.querySelectorAll('.tag-pill').forEach(p => p.remove());
        const input = $('languageManagerInput');
        cmsLanguages.forEach(lang => {
            const pill = document.createElement('span');
            pill.className = 'tag-pill';
            pill.innerHTML = `${escapeHtml(lang)} <button type="button">&times;</button>`;
            pill.querySelector('button').addEventListener('click', () => {
                cmsLanguages = cmsLanguages.filter(l => l !== lang);
                saveCmsLanguages();
                renderSettingsManagers();
            });
            langContainer.insertBefore(pill, input);
        });
    }

    // Engines manager
    const engineContainer = $('enginesManager');
    if (engineContainer) {
        engineContainer.querySelectorAll('.tag-pill').forEach(p => p.remove());
        const input = $('engineManagerInput');
        cmsEngines.forEach(eng => {
            const pill = document.createElement('span');
            pill.className = 'tag-pill';
            pill.innerHTML = `${escapeHtml(eng)} <button type="button">&times;</button>`;
            pill.querySelector('button').addEventListener('click', () => {
                cmsEngines = cmsEngines.filter(e => e !== eng);
                saveCmsEngines();
                renderSettingsManagers();
            });
            engineContainer.insertBefore(pill, input);
        });
    }

    // Types manager
    const typeContainer = $('typesManager');
    if (typeContainer) {
        typeContainer.querySelectorAll('.tag-pill').forEach(p => p.remove());
        const input = $('typeManagerInput');
        cmsTypes.forEach(t => {
            const pill = document.createElement('span');
            pill.className = 'tag-pill';
            const display = t.value === t.label ? t.label : `${t.value}: ${t.label}`;
            pill.innerHTML = `${escapeHtml(display)} <button type="button">&times;</button>`;
            pill.querySelector('button').addEventListener('click', () => {
                cmsTypes = cmsTypes.filter(x => x.value !== t.value);
                saveCmsTypes();
                renderSettingsManagers();
            });
            typeContainer.insertBefore(pill, input);
        });
    }
}

$('languageManagerInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const val = e.target.value.trim();
        if (val && !cmsLanguages.includes(val)) {
            cmsLanguages.push(val);
            cmsLanguages.sort();
            saveCmsLanguages();
            renderSettingsManagers();
        }
        e.target.value = '';
    }
});

$('engineManagerInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const val = e.target.value.trim();
        if (val && !cmsEngines.includes(val)) {
            cmsEngines.push(val);
            cmsEngines.sort();
            saveCmsEngines();
            renderSettingsManagers();
        }
        e.target.value = '';
    }
});

$('typeManagerInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const raw = e.target.value.trim();
        if (!raw) return;
        let value, label;
        if (raw.includes(':')) {
            [value, ...label] = raw.split(':');
            value = value.trim();
            label = label.join(':').trim();
        } else {
            value = raw;
            label = raw;
        }
        if (!cmsTypes.find(t => t.value === value)) {
            cmsTypes.push({ value, label });
            saveCmsTypes();
            renderSettingsManagers();
        }
        e.target.value = '';
    }
});

// ─── Combo Box Widget ───
function initComboBox(inputEl, dropdownEl, getOptions, onAdd) {
    let isOpen = false;

    function renderDropdown(filter = '') {
        const options = getOptions();
        const lf = filter.toLowerCase();
        const filtered = lf ? options.filter(o => o.label.toLowerCase().includes(lf) || o.value.toLowerCase().includes(lf)) : options;
        dropdownEl.innerHTML = '';

        filtered.forEach(opt => {
            const div = document.createElement('div');
            div.className = 'combo-option';
            div.textContent = opt.label;
            div.addEventListener('mousedown', (e) => {
                e.preventDefault();
                inputEl.value = opt.value;
                closeDropdown();
                inputEl.dispatchEvent(new Event('change'));
            });
            dropdownEl.appendChild(div);
        });

        if (lf && !options.find(o => o.value.toLowerCase() === lf || o.label.toLowerCase() === lf)) {
            const addDiv = document.createElement('div');
            addDiv.className = 'combo-option combo-option-add';
            addDiv.textContent = `+ Add "${filter}"`;
            addDiv.addEventListener('mousedown', (e) => {
                e.preventDefault();
                if (onAdd) onAdd(filter);
                inputEl.value = filter;
                closeDropdown();
            });
            dropdownEl.appendChild(addDiv);
        }

        if (dropdownEl.children.length > 0) {
            dropdownEl.classList.add('open');
            isOpen = true;
        }
    }

    function closeDropdown() {
        dropdownEl.classList.remove('open');
        isOpen = false;
    }

    inputEl.addEventListener('focus', () => renderDropdown(inputEl.value));
    inputEl.addEventListener('input', () => renderDropdown(inputEl.value));
    inputEl.addEventListener('blur', () => setTimeout(closeDropdown, 150));
}

// ─── Period Year-Range Selector ───
function initPeriodSelector() {
    const startSel = $('periodStart');
    const endSel = $('periodEnd');
    const presentCb = $('periodPresent');
    if (!startSel || !endSel) return;

    const currentYear = new Date().getFullYear();
    const startYear = 2005;
    const endYear = currentYear + 5;

    startSel.innerHTML = '';
    endSel.innerHTML = '';

    for (let y = endYear; y >= startYear; y--) {
        startSel.add(new Option(y, y));
        endSel.add(new Option(y, y));
    }

    startSel.value = currentYear;
    endSel.value = currentYear;

    presentCb.addEventListener('change', () => {
        endSel.disabled = presentCb.checked;
    });
}

function setPeriodFromString(str) {
    const startSel = $('periodStart');
    const endSel = $('periodEnd');
    const presentCb = $('periodPresent');
    if (!str || !startSel) return;

    if (str.includes('-')) {
        const [s, e] = str.split('-').map(p => p.trim());
        startSel.value = parseInt(s) || startSel.value;
        if (e.toLowerCase() === 'present') {
            presentCb.checked = true;
            endSel.disabled = true;
        } else {
            endSel.value = parseInt(e) || endSel.value;
            presentCb.checked = false;
            endSel.disabled = false;
        }
    } else {
        const y = parseInt(str) || new Date().getFullYear();
        startSel.value = y;
        endSel.value = y;
        presentCb.checked = false;
        endSel.disabled = false;
    }
}

function getPeriodString() {
    const startSel = $('periodStart');
    const endSel = $('periodEnd');
    const presentCb = $('periodPresent');
    if (!startSel) return '';

    const s = startSel.value;
    if (presentCb.checked) {
        return `${s}-Present`;
    }
    const e = endSel.value;
    return s === e ? s : `${s}-${e}`;
}

initPeriodSelector();

// ─── File Upload via GitHub API ───
let activeUploadTarget = null;

function getGitHubConfig() {
    const pat = localStorage.getItem('cms_github_pat');
    const owner = localStorage.getItem('cms_github_owner') || GITHUB_DEFAULTS.owner;
    const repo = localStorage.getItem('cms_github_repo') || GITHUB_DEFAULTS.repo;
    const branch = localStorage.getItem('cms_github_branch') || GITHUB_DEFAULTS.branch;
    return { pat, owner, repo, branch };
}

async function uploadFileToGitHub(file, targetPath) {
    const { pat, owner, repo, branch } = getGitHubConfig();
    if (!pat) {
        showToast('Set your GitHub PAT in Settings first.', 'error');
        return null;
    }

    if (file.size > 25 * 1024 * 1024) {
        showToast('File too large (max 25MB). Use YouTube for large videos.', 'error');
        return null;
    }

    showToast(`Uploading ${file.name}...`, 'info');

    try {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const content = btoa(bytes.reduce((s, b) => s + String.fromCharCode(b), ''));

        // Check if file already exists (need SHA for update)
        const getRes = await fetch(
            `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(targetPath)}?ref=${encodeURIComponent(branch)}`,
            { headers: { 'Authorization': `Bearer ${pat}`, 'Accept': 'application/vnd.github.v3+json' } }
        );
        let sha = null;
        if (getRes.ok) {
            sha = (await getRes.json()).sha;
        }

        const body = { message: `Upload ${targetPath} via CMS`, content, branch };
        if (sha) body.sha = sha;

        const putRes = await fetch(
            `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(targetPath)}`,
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
            throw new Error(err.message || 'GitHub API error');
        }

        showToast(`Uploaded ${file.name} successfully!`, 'success');
        return targetPath;
    } catch (error) {
        console.error('Upload error:', error);
        showToast('Upload failed: ' + error.message, 'error');
        return null;
    }
}

function getProjectId() {
    const form = $('projectForm');
    return form?.elements?.id?.value?.trim() || 'unknown';
}

function getUploadPath(file, context = 'file') {
    const projectId = getProjectId();
    const ext = file.name.split('.').pop().toLowerCase();
    const folder = `res/projects/${projectId}`;

    // Auto-name based on context
    if (context === 'banner') return `${folder}/banner.${ext}`;
    if (context === 'mini') return `${folder}/mini.${ext}`;

    if (context === 'screenshot') {
        const existing = $('screenshotItems').querySelectorAll('.array-item');
        const idx = String(existing.length).padStart(2, '0');
        return `${folder}/ss_${idx}.${ext}`;
    }

    if (context === 'video') {
        const existing = $('videoItems').querySelectorAll('.array-item');
        const idx = String(existing.length).padStart(2, '0');
        return `${folder}/vid_${idx}.${ext}`;
    }

    if (context === 'icon') {
        const existing = $('socialItems').querySelectorAll('.array-item');
        const idx = String(existing.length).padStart(2, '0');
        return `${folder}/ico_${idx}.${ext}`;
    }

    // Fallback: sanitize original name
    const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    return `${folder}/${baseName}.${ext}`;
}

let activeUploadContext = 'file';

$('mediaFileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !activeUploadTarget) return;

    const projectId = getProjectId();
    if (!projectId || projectId === 'unknown') {
        showToast('Set a project ID first before uploading.', 'error');
        e.target.value = '';
        return;
    }

    const targetInput = activeUploadTarget;
    const path = getUploadPath(file, activeUploadContext);
    const result = await uploadFileToGitHub(file, path);

    if (result) {
        targetInput.value = result;
        targetInput.dispatchEvent(new Event('input'));
    }

    activeUploadTarget = null;
    activeUploadContext = 'file';
    e.target.value = '';
});

function triggerUpload(targetInput, accept, context = 'file') {
    activeUploadTarget = targetInput;
    activeUploadContext = context;
    const fileInput = $('mediaFileInput');
    fileInput.accept = accept || 'image/*,video/*';
    fileInput.click();
}

// ─── Drag to Reorder ───
function initDragReorder(item, container) {
    let draggedItem = null;

    item.addEventListener('dragstart', (e) => {
        draggedItem = item;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '');
    });

    item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        draggedItem = null;
    });

    item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const dragging = container.querySelector('.dragging');
        if (dragging && dragging !== item) {
            item.classList.add('drag-over');
        }
    });

    item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
    });

    item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
        const dragging = container.querySelector('.dragging');
        if (dragging && dragging !== item) {
            const items = [...container.children];
            const fromIdx = items.indexOf(dragging);
            const toIdx = items.indexOf(item);
            if (fromIdx < toIdx) {
                container.insertBefore(dragging, item.nextSibling);
            } else {
                container.insertBefore(dragging, item);
            }
        }
    });
}

// ─── Animated Media Tooltip ───
let tooltipEl = null;

function getOrCreateTooltip() {
    if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.className = 'media-tooltip';
        document.body.appendChild(tooltipEl);
    }
    return tooltipEl;
}

function initMediaTooltip(item, getSrc) {
    const handle = item.querySelector('.drag-handle');
    if (!handle) return;

    let showTimeout;

    item.addEventListener('mouseenter', (e) => {
        const src = getSrc();
        if (!src) return;

        showTimeout = setTimeout(() => {
            const tip = getOrCreateTooltip();
            const resolvedSrc = src.startsWith('http') ? src : SITE_ROOT + src;

            const ytId = extractYouTubeId(src);
            if (ytId) {
                tip.innerHTML = `<img src="https://img.youtube.com/vi/${ytId}/hqdefault.jpg" alt="">`;
            } else if (isVideoPath(src)) {
                tip.innerHTML = `<video src="${resolvedSrc}" autoplay muted loop style="max-width:100%;max-height:100%;border-radius:4px;"></video>`;
            } else {
                tip.innerHTML = `<img src="${resolvedSrc}" alt="" onerror="this.parentElement.innerHTML='<span>⚠ Not found</span>'">`;
            }

            tip.classList.add('visible');
            positionTooltip(tip, e);
        }, 300);
    });

    item.addEventListener('mousemove', (e) => {
        if (tooltipEl?.classList.contains('visible')) {
            positionTooltip(tooltipEl, e);
        }
    });

    item.addEventListener('mouseleave', () => {
        clearTimeout(showTimeout);
        if (tooltipEl) {
            tooltipEl.classList.remove('visible');
            tooltipEl.innerHTML = '';
        }
    });
}

function positionTooltip(tip, e) {
    const pad = 16;
    let x = e.clientX + pad;
    let y = e.clientY + pad;

    // Keep on screen
    if (x + 260 > window.innerWidth) x = e.clientX - 260 - pad;
    if (y + 180 > window.innerHeight) y = e.clientY - 180 - pad;

    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
}

function extractYouTubeId(url) {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
}

function isVideoPath(src) {
    return /\.(mp4|webm|ogg|mov)$/i.test(src);
}


// ─── Auth ───
if (auth) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            if (user.email !== ALLOWED_EMAIL) {
                showToast('Access denied. Only the authorized account may sign in.', 'error');
                localStorage.removeItem('cms_authed');
                await signOut(auth);
                return;
            }
            enterDashboard(user);
        } else {
            localStorage.removeItem('cms_authed');
            showScreen('login');
        }
    });
}

$('btnGoogleLogin').addEventListener('click', async () => {
    if (!auth) {
        showToast('Firebase not configured. See firebase-config.example.js for instructions.', 'error');
        return;
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    provider.addScope('https://www.googleapis.com/auth/analytics.readonly');

    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Capture OAuth access token for GA4 API
        storeOAuthToken(GoogleAuthProvider.credentialFromResult(result));

        if (user.email !== ALLOWED_EMAIL) {
            showToast('Access denied. Only the authorized account may sign in.', 'error');
            await signOut(auth);
        }
    } catch (error) {
        if (error.code === 'auth/multi-factor-auth-required') {
            // Try to extract access token from the error's internal data (fast path, avoids second popup)
            if (error.customData?._tokenResponse?.oauthAccessToken) {
                localStorage.setItem('cms_google_access_token', error.customData._tokenResponse.oauthAccessToken);
                localStorage.setItem('cms_google_token_time', Date.now().toString());
            }
            mfaResolver = getMultiFactorResolver(auth, error);
            showScreen('mfa');
            $('mfaCode').focus();
        } else {
            console.error('Sign-in error:', error);
            showToast('Sign-in failed: ' + error.message, 'error');
        }
    }
});

// ─── Store OAuth token helper ───
function storeOAuthToken(credential) {
    if (credential?.accessToken) {
        localStorage.setItem('cms_google_access_token', credential.accessToken);
        localStorage.setItem('cms_google_token_time', Date.now().toString());
    }
}

// ─── Refresh Analytics Token (callable from statistics module) ───
window.cmsRefreshAnalyticsToken = async () => {
    if (!auth?.currentUser) {
        showToast('Not signed in. Please log in first.', 'error');
        return false;
    }
    try {
        const provider = new GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/analytics.readonly');
        const result = await reauthenticateWithPopup(auth.currentUser, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        storeOAuthToken(credential);
        showToast('Analytics access refreshed!', 'success');
        return true;
    } catch (e) {
        console.error('Token refresh failed:', e);
        showToast('Failed to refresh analytics access: ' + e.message, 'error');
        return false;
    }
};

// ─── MFA Verification ───
$('btnMfaVerify').addEventListener('click', async () => {
    const code = $('mfaCode').value.trim();
    if (!code || !mfaResolver) return;

    try {
        const hint = mfaResolver.hints.find(h => h.factorId === TotpMultiFactorGenerator.FACTOR_ID);
        if (!hint) {
            showToast('No TOTP factor found. Please enroll first.', 'error');
            return;
        }
        const assertion = TotpMultiFactorGenerator.assertionForSignIn(hint.uid, code);
        const userCredential = await mfaResolver.resolveSignIn(assertion);
        mfaResolver = null;

        // Firebase MFA flow does NOT preserve the Google OAuth access token.
        // We need to re-authenticate to get it for GA4 API access.
        const hasToken = localStorage.getItem('cms_google_access_token');
        if (!hasToken) {
            try {
                const provider = new GoogleAuthProvider();
                provider.addScope('https://www.googleapis.com/auth/analytics.readonly');
                const reAuthResult = await reauthenticateWithPopup(userCredential.user, provider);
                const reAuthCred = GoogleAuthProvider.credentialFromResult(reAuthResult);
                storeOAuthToken(reAuthCred);
            } catch (reAuthErr) {
                console.warn('Re-auth for analytics token failed:', reAuthErr.message);
                // Non-fatal — CMS works, just analytics won't load until they re-auth
            }
        }
    } catch (error) {
        console.error('MFA error:', error);
        showToast('Invalid verification code.', 'error');
    }
});

$('mfaCode').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('btnMfaVerify').click();
});

// ─── Logout ───
$('btnLogout').addEventListener('click', async () => {
    localStorage.removeItem('cms_google_access_token');
    localStorage.removeItem('cms_google_token_time');
    localStorage.removeItem('cms_authed');
    if (auth) await signOut(auth);
    showScreen('login');
});

// ─── Dashboard Entry ───
function enterDashboard(user) {
    showScreen('dashboard');

    // Signal to public pages that admin is logged in
    localStorage.setItem('cms_authed', '1');

    const mfaEnrolled = multiFactor(user).enrolledFactors.length > 0;
    $('topbarUser').innerHTML = `
        ${user.email}
        <span class="auth-badge">${mfaEnrolled ? '🔐 MFA' : '🔓 No MFA'}</span>
    `;

    loadCmsSettings();
    loadSettings();
    loadProjects();

    // Init combo boxes
    const form = $('projectForm');
    initComboBox(
        form.elements.language,
        $('languageDropdown'),
        () => cmsLanguages.map(l => ({ value: l, label: l })),
        (val) => {
            if (!cmsLanguages.includes(val)) {
                cmsLanguages.push(val);
                cmsLanguages.sort();
                saveCmsLanguages();
                renderSettingsManagers();
            }
        }
    );
    initComboBox(
        form.elements.engine,
        $('engineDropdown'),
        () => cmsEngines.map(e => ({ value: e, label: e })),
        (val) => {
            if (!cmsEngines.includes(val)) {
                cmsEngines.push(val);
                cmsEngines.sort();
                saveCmsEngines();
                renderSettingsManagers();
            }
        }
    );
    initComboBox(
        form.elements.type,
        $('typeDropdown'),
        () => cmsTypes.map(t => ({ value: t.value, label: t.label })),
        (val) => {
            if (!cmsTypes.find(t => t.value === val)) {
                cmsTypes.push({ value: val, label: val });
                saveCmsTypes();
                renderSettingsManagers();
            }
        }
    );

    // Init upload buttons for mini/banner
    document.querySelectorAll('.btn-upload[data-upload-target]').forEach(btn => {
        const targetName = btn.dataset.uploadTarget;
        const targetInput = form.elements[targetName];
        if (targetInput) {
            const context = targetName === 'minisrc' ? 'mini' : 'banner';
            btn.addEventListener('click', () => triggerUpload(targetInput, 'image/*', context));
        }
    });

    // Restore tab from URL hash (e.g. #statistics)
    restoreTabFromHash();
}

// ─── Tabs ───
function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const tabEl = document.querySelector(`.tab[data-tab="${tabName}"]`);
    const contentEl = $('tab-' + tabName);
    if (tabEl && contentEl) {
        tabEl.classList.add('active');
        contentEl.classList.add('active');
    }
    // Init statistics when tab is shown
    if (tabName === 'statistics') {
        initStatistics();
    }
}

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        switchTab(tabName);
        history.replaceState(null, '', '#' + tabName);
    });
});

// Restore tab from URL hash on load
function restoreTabFromHash() {
    const hash = location.hash.replace('#', '');

    // Deep-link: #edit-{projectId}
    if (hash.startsWith('edit-')) {
        const projectId = hash.slice(5);
        switchTab('projects');
        // Wait for projects to load, then open editor
        let retries = 0;
        const tryOpen = () => {
            const project = projects.find(p => p.id === projectId);
            if (project) {
                openEditor(project);
                history.replaceState(null, '', '#projects');
            } else if (projects.length === 0 && retries++ < 25) {
                setTimeout(tryOpen, 200);
            }
        };
        setTimeout(tryOpen, 300);
        return;
    }

    // Deep-link: #new
    if (hash === 'new') {
        switchTab('projects');
        setTimeout(() => {
            openEditor(null);
            history.replaceState(null, '', '#projects');
        }, 300);
        return;
    }

    if (hash && document.querySelector(`.tab[data-tab="${hash}"]`)) {
        switchTab(hash);
    }
}

// Handle browser back/forward
window.addEventListener('hashchange', restoreTabFromHash);

// ─── Settings ───
function loadSettings() {
    const pat = localStorage.getItem('cms_github_pat') || '';
    const owner = localStorage.getItem('cms_github_owner') || GITHUB_DEFAULTS.owner;
    const repo = localStorage.getItem('cms_github_repo') || GITHUB_DEFAULTS.repo;
    const branch = localStorage.getItem('cms_github_branch') || GITHUB_DEFAULTS.branch;

    $('githubPat').value = pat;
    $('githubOwner').value = owner;
    $('githubRepo').value = repo;
    $('githubBranch').value = branch;

    // Load GA4 property
    $('ga4PropertyInput').value = localStorage.getItem('cms_ga4_property') || '';
}

$('btnSavePat').addEventListener('click', () => {
    localStorage.setItem('cms_github_pat', $('githubPat').value.trim());
    localStorage.setItem('cms_github_owner', $('githubOwner').value.trim());
    localStorage.setItem('cms_github_repo', $('githubRepo').value.trim());
    localStorage.setItem('cms_github_branch', $('githubBranch').value.trim());
    showToast('Settings saved.', 'success');
});

$('btnSaveGA4').addEventListener('click', () => {
    const val = $('ga4PropertyInput').value.trim();
    saveGA4Property(val);
    showToast(val ? 'GA4 property saved. Switch to Statistics tab to view data.' : 'GA4 property cleared.', 'success');
});

$('btnAutoDetectGA4').addEventListener('click', async () => {
    // Ensure we have a valid analytics token before auto-detecting
    const token = localStorage.getItem('cms_google_access_token');
    if (!token) {
        const ok = await window.cmsRefreshAnalyticsToken();
        if (!ok) return;
    }
    window.cmsAutoDetectGA4();
});

// ─── Dirty State Tracking ───
let isDirty = false;
let cleanSnapshot = '';  // JSON string of projects at last save/load

function takeSnapshot() {
    cleanSnapshot = JSON.stringify(generateProjectsJson());
}

function checkDirty() {
    const current = JSON.stringify(generateProjectsJson());
    const nowDirty = current !== cleanSnapshot;
    if (nowDirty !== isDirty) {
        isDirty = nowDirty;
        updateDirtyUI();
    }
}

function markDirty() {
    if (!isDirty) {
        isDirty = true;
        updateDirtyUI();
    }
}

function markClean() {
    isDirty = false;
    takeSnapshot();
    updateDirtyUI();
}

function updateDirtyUI() {
    const indicator = $('dirtyIndicator');
    const bar = $('dirtyBar');
    if (indicator) indicator.classList.toggle('visible', isDirty);
    if (bar) bar.classList.toggle('visible', isDirty);
}

// Browser beforeunload guard
window.addEventListener('beforeunload', (e) => {
    if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// ─── Projects CRUD ───
let projects = [];

async function loadProjects() {
    if (!db) return;

    try {
        const q = query(collection(db, 'projects'), orderBy('order', 'asc'));
        const snapshot = await getDocs(q);
        projects = snapshot.docs.map(d => ({ ...d.data(), _docId: d.id }));
        renderProjectList();
        markClean();
    } catch (error) {
        console.error('Load projects error:', error);
        showToast('Failed to load projects: ' + error.message, 'error');
    }
}

function renderProjectList() {
    const container = $('projectListContainer');
    $('projectCount').textContent = `${projects.length} project${projects.length !== 1 ? 's' : ''}`;

    if (projects.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No projects yet. Add one or import from projects.json.</p>
            </div>`;
        return;
    }

    const ssIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
    const vidIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;

    const rows = projects.map((p, i) => {
        const thumbSrc = p.minisrc ? resolveMediaPath(p.minisrc) : '';
        const thumbHtml = thumbSrc
            ? `<img class="project-row-thumb" src="${thumbSrc}" alt="" loading="lazy" onerror="this.style.display='none'">`
            : '';
        const ssCount = (p.screenshots || []).length;
        const vidCount = (p.videos || []).length;
        const mediaHtml = (ssCount || vidCount) ? `
            <span class="media-count">
                ${ssCount ? `${ssIcon} ${ssCount}` : ''}
                ${vidCount ? `${vidIcon} ${vidCount}` : ''}
            </span>` : '';

        return `
        <tr data-project-id="${p.id}" draggable="true" style="animation-delay:${i * 0.04}s">
            <td class="drag-cell"><span class="drag-handle project-drag-handle" title="Drag to reorder">⠿</span></td>
            <td class="project-title-cell">
                <div class="title-with-thumb">
                    ${thumbHtml}
                    <span>${escapeHtml(p.title || '')}</span>
                </div>
            </td>
            <td>${p.card ? '<span class="badge badge-featured">Featured</span>' : '<span class="badge badge-archive">Archive</span>'}</td>
            <td>${escapeHtml(p.engine || '')}</td>
            <td>${escapeHtml(p.language || '')}</td>
            <td>${escapeHtml(p.datetime || '')}</td>
            <td>${mediaHtml}</td>
            <td class="actions-cell">
                <button class="btn btn-small" onclick="window.cmsEditProject('${p.id}')">Edit</button>
                <button class="btn btn-small btn-danger" onclick="window.cmsDeleteProject('${p.id}')">Delete</button>
            </td>
        </tr>
    `}).join('');

    container.innerHTML = `
        <table class="project-table">
            <thead><tr>
                <th></th><th>Title</th><th>Status</th><th>Engine</th><th>Language</th><th>Period</th><th>Media</th><th>Actions</th>
            </tr></thead>
            <tbody id="projectTableBody">${rows}</tbody>
        </table>`;

    initProjectTableDrag();
}

function initProjectTableDrag() {
    const tbody = $('projectTableBody');
    if (!tbody) return;

    let draggedRow = null;

    tbody.querySelectorAll('tr[draggable]').forEach(row => {
        row.addEventListener('dragstart', (e) => {
            draggedRow = row;
            row.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', '');
        });

        row.addEventListener('dragend', () => {
            row.classList.remove('dragging');
            tbody.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            draggedRow = null;
        });

        row.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (draggedRow && draggedRow !== row) {
                row.classList.add('drag-over');
            }
        });

        row.addEventListener('dragleave', () => {
            row.classList.remove('drag-over');
        });

        row.addEventListener('drop', async (e) => {
            e.preventDefault();
            row.classList.remove('drag-over');
            if (!draggedRow || draggedRow === row) return;

            const rows = [...tbody.children];
            const fromIdx = rows.indexOf(draggedRow);
            const toIdx = rows.indexOf(row);
            if (fromIdx < toIdx) {
                tbody.insertBefore(draggedRow, row.nextSibling);
            } else {
                tbody.insertBefore(draggedRow, row);
            }

            // Persist new order to Firestore
            await saveProjectOrder();
        });
    });
}

async function saveProjectOrder() {
    const tbody = $('projectTableBody');
    if (!tbody || !db) return;

    const rows = [...tbody.querySelectorAll('tr[data-project-id]')];
    try {
        const updates = rows.map((row, i) => {
            const id = row.dataset.projectId;
            return setDoc(doc(db, 'projects', id), { order: i }, { merge: true });
        });
        await Promise.all(updates);

        // Update local projects array order
        const orderMap = {};
        rows.forEach((row, i) => { orderMap[row.dataset.projectId] = i; });
        projects.sort((a, b) => (orderMap[a.id] ?? 999) - (orderMap[b.id] ?? 999));
        projects.forEach((p, i) => { p.order = i; });

        showToast('Order saved.', 'success');
        markDirty();  // Order changed, not yet published
    } catch (err) {
        console.error('Save order error:', err);
        showToast('Failed to save order.', 'error');
    }
}

// ─── Project Editor ───
let editingProjectId = null;
let editorSnapshot = '';  // snapshot of form state when opened

function getEditorFormState() {
    const form = $('projectForm');
    if (!form) return '';
    return JSON.stringify({
        id: form.elements.id.value,
        title: form.elements.title.value,
        language: form.elements.language.value,
        engine: form.elements.engine.value,
        role: form.elements.role.value,
        type: form.elements.type.value,
        duration: form.elements.duration.value,
        card: form.elements.card.checked,
        minisrc: form.elements.minisrc.value,
        banner: form.elements.banner.value,
        description: form.elements.description.value,
        longdescription: form.elements.longdescription.value,
        archive: form.elements.archive.value,
        period: getPeriodString(),
        tags: collectTags(),
        work: collectWorkItems(),
        socials: collectSocialItems(),
        screenshots: collectScreenshotItems(),
        videos: collectVideoItems()
    });
}

function isEditorDirty() {
    return getEditorFormState() !== editorSnapshot;
}

function openEditor(project = null) {
    editingProjectId = project ? project.id : null;
    $('editorTitle').textContent = project ? 'Edit Project' : 'Add Project';
    const form = $('projectForm');

    // Reset form
    form.reset();
    $('workItems').innerHTML = '';
    $('socialItems').innerHTML = '';
    $('screenshotItems').innerHTML = '';
    $('videoItems').innerHTML = '';
    $('miniPreview').innerHTML = '';
    $('bannerPreview').innerHTML = '';
    clearTags();

    // Reset period to current year
    const currentYear = new Date().getFullYear();
    $('periodStart').value = currentYear;
    $('periodEnd').value = currentYear;
    $('periodPresent').checked = false;
    $('periodEnd').disabled = false;

    if (project) {
        form.elements.id.value = project.id || '';
        form.elements.title.value = project.title || '';
        form.elements.language.value = project.language || '';
        form.elements.engine.value = project.engine || '';
        form.elements.role.value = project.role || '';
        form.elements.type.value = project.type || '';
        form.elements.duration.value = project.duration || '';
        form.elements.card.checked = project.card !== false;
        form.elements.minisrc.value = project.minisrc || '';
        form.elements.banner.value = project.banner || '';
        form.elements.description.value = project.description || '';
        form.elements.longdescription.value = project.longdescription || '';
        form.elements.archive.value = project.archive || '';

        // Set period selector
        setPeriodFromString(project.datetime || '');

        // Render image previews
        if (project.minisrc) renderMediaPreview($('miniPreview'), project.minisrc);
        if (project.banner) renderMediaPreview($('bannerPreview'), project.banner);

        (project.tags || []).forEach(t => addTag(t));
        (project.work || []).forEach(w => addWorkItem(w));
        (project.socials || []).forEach(s => addSocialItem(s));
        (project.screenshots || []).forEach(s => addScreenshotItem(s));
        (project.videos || []).forEach(v => addVideoItem(v));
    }

    // Attach preview listeners for mini/banner
    attachPreviewListener(form.elements.minisrc, $('miniPreview'));
    attachPreviewListener(form.elements.banner, $('bannerPreview'));

    $('editorModal').classList.add('active');

    // Take snapshot of editor state after a tick (so combos etc are settled)
    requestAnimationFrame(() => {
        editorSnapshot = getEditorFormState();
    });
}

async function closeEditor(skipDirtyCheck = false) {
    if (!skipDirtyCheck && isEditorDirty()) {
        const confirmed = await showConfirm(
            'Unsaved Changes',
            'You have unsaved changes in this editor. Discard them?',
            { okLabel: 'Discard', okClass: 'btn-danger' }
        );
        if (!confirmed) return;
    }
    $('editorModal').classList.remove('active');
    editingProjectId = null;
}

$('btnAddProject').addEventListener('click', () => openEditor());
$('btnCloseEditor').addEventListener('click', () => closeEditor());
$('btnCancelEditor').addEventListener('click', () => closeEditor());

// Auto-open new project editor if navigated with #new
if (window.location.hash === '#new') {
    // Wait for projects to load first, then open
    const waitAndOpen = setInterval(() => {
        if (projects.length > 0 || document.querySelector('#projectTableBody')) {
            clearInterval(waitAndOpen);
            openEditor();
            history.replaceState(null, '', window.location.pathname);
        }
    }, 300);
    setTimeout(() => clearInterval(waitAndOpen), 10000);
}

// Close modal on overlay click
$('editorModal').addEventListener('click', (e) => {
    if (e.target === $('editorModal')) closeEditor();
});

// ─── Save Project ───
$('btnSaveProject').addEventListener('click', async () => {
    const form = $('projectForm');
    const id = form.elements.id.value.trim();
    const title = form.elements.title.value.trim();

    if (!id || !title) {
        showToast('ID and Title are required.', 'error');
        return;
    }

    const projectData = {
        id,
        title,
        language: form.elements.language.value.trim(),
        engine: form.elements.engine.value.trim(),
        role: form.elements.role.value.trim(),
        type: form.elements.type.value.trim(),
        duration: form.elements.duration.value.trim(),
        datetime: getPeriodString(),
        card: form.elements.card.checked,
        minisrc: form.elements.minisrc.value.trim(),
        banner: form.elements.banner.value.trim(),
        description: form.elements.description.value.trim(),
        longdescription: form.elements.longdescription.value.trim(),
        archive: form.elements.archive.value.trim(),
        tags: collectTags(),
        work: collectWorkItems(),
        socials: collectSocialItems(),
        screenshots: collectScreenshotItems(),
        videos: collectVideoItems(),
        order: editingProjectId
            ? (projects.find(p => p.id === editingProjectId)?.order ?? projects.length)
            : projects.length
    };

    // Remove empty optional fields
    if (!projectData.archive) delete projectData.archive;
    if (!projectData.longdescription) delete projectData.longdescription;
    if (!projectData.minisrc) delete projectData.minisrc;
    if (!projectData.banner) delete projectData.banner;

    try {
        // If editing and ID changed, delete old doc
        if (editingProjectId && editingProjectId !== id) {
            await deleteDoc(doc(db, 'projects', editingProjectId));
        }

        await setDoc(doc(db, 'projects', id), projectData);
        showToast(`Project "${title}" saved.`, 'success');
        closeEditor(true);  // skip dirty check, we just saved
        await loadProjects();
        markDirty();  // Firestore changed but not yet published to GitHub
    } catch (error) {
        console.error('Save error:', error);
        showToast('Failed to save: ' + error.message, 'error');
    }
});

// ─── Delete Project ───
window.cmsDeleteProject = async (id) => {
    const project = projects.find(p => p.id === id);
    const confirmed = await showConfirm(
        'Delete Project',
        `Are you sure you want to delete "${project?.title || id}"?`,
        { okLabel: 'Delete', okClass: 'btn-danger' }
    );
    if (!confirmed) return;

    try {
        await deleteDoc(doc(db, 'projects', id));
        showToast('Project deleted.', 'success');
        await loadProjects();
        markDirty();  // Unpublished deletion
    } catch (error) {
        showToast('Failed to delete: ' + error.message, 'error');
    }
};

// ─── Edit Project ───
window.cmsEditProject = (id) => {
    const project = projects.find(p => p.id === id);
    if (project) openEditor(project);
};

// ─── Tags ───
const tagsData = [];

function addTag(tag) {
    if (!tag || tagsData.includes(tag)) return;
    tagsData.push(tag);
    renderTags();
}

function removeTag(tag) {
    const idx = tagsData.indexOf(tag);
    if (idx !== -1) { tagsData.splice(idx, 1); renderTags(); }
}

function clearTags() {
    tagsData.length = 0;
    renderTags();
}

function collectTags() { return [...tagsData]; }

function renderTags() {
    const container = $('tagsContainer');
    const input = $('tagInput');
    container.querySelectorAll('.tag-pill').forEach(p => p.remove());

    tagsData.forEach(tag => {
        const pill = document.createElement('span');
        pill.className = 'tag-pill';
        pill.innerHTML = `${escapeHtml(tag)} <button type="button">&times;</button>`;
        pill.querySelector('button').addEventListener('click', () => removeTag(tag));
        container.insertBefore(pill, input);
    });
}

$('tagInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const val = e.target.value.trim().replace(/,/g, '');
        if (val) { addTag(val); e.target.value = ''; }
    }
});

$('btnAddTag').addEventListener('click', () => {
    const input = $('tagInput');
    const val = input.value.trim();
    if (val) { addTag(val); input.value = ''; }
    input.focus();
});

// ─── Dynamic Array Items ───
function addWorkItem(data = {}) {
    const container = $('workItems');
    const item = document.createElement('div');
    item.className = 'array-item';
    const title = typeof data === 'string' ? data : (data.title || '');
    const desc = typeof data === 'string' ? '' : (data.description || '');
    item.innerHTML = `
        <div class="array-item-fields">
            <input type="text" placeholder="Title" value="${escapeAttr(title)}">
            <textarea placeholder="Description (optional)">${escapeHtml(desc)}</textarea>
        </div>
        <button type="button" class="btn-remove-item">&times;</button>
    `;
    item.querySelector('.btn-remove-item').addEventListener('click', () => item.remove());
    container.appendChild(item);
}

function collectWorkItems() {
    return [...$('workItems').querySelectorAll('.array-item')].map(item => {
        const title = item.querySelector('input').value.trim();
        const desc = item.querySelector('textarea').value.trim();
        if (!title) return null;
        return desc ? { title, description: desc } : title;
    }).filter(Boolean);
}

function addSocialItem(data = {}) {
    const container = $('socialItems');
    const item = document.createElement('div');
    item.className = 'array-item';
    item.innerHTML = `
        <div class="array-item-fields">
            <input type="text" placeholder="Label (e.g. github.com)" value="${escapeAttr(data.info || '')}">
            <input type="text" placeholder="URL" value="${escapeAttr(data.url || '')}">
            <div class="input-with-upload">
                <input type="text" placeholder="Icon path (e.g. res/ico_github.png)" value="${escapeAttr(data.icon || '')}">
                <button type="button" class="btn btn-small btn-upload" title="Upload icon">↑</button>
            </div>
            <div class="array-item-preview social-preview-target"></div>
        </div>
        <button type="button" class="btn-remove-item">&times;</button>
    `;
    item.querySelector('.btn-remove-item').addEventListener('click', () => item.remove());

    // Upload button for icon
    const inputs = item.querySelectorAll('input');
    item.querySelector('.btn-upload').addEventListener('click', () => triggerUpload(inputs[2], 'image/*', 'icon'));

    // Social preview
    const previewTarget = item.querySelector('.social-preview-target');
    const updatePreview = debounce(() => {
        renderSocialPreview(previewTarget, inputs[2].value.trim(), inputs[1].value.trim());
    });
    inputs[1].addEventListener('input', updatePreview);
    inputs[2].addEventListener('input', updatePreview);

    container.appendChild(item);
    if (data.icon || data.url) {
        renderSocialPreview(previewTarget, data.icon || '', data.url || '');
    }
}

function collectSocialItems() {
    return [...$('socialItems').querySelectorAll('.array-item')].map(item => {
        const inputs = item.querySelectorAll('input');
        const info = inputs[0].value.trim();
        const url = inputs[1].value.trim();
        const icon = inputs[2].value.trim();
        if (!info && !url) return null;
        const obj = { info, url };
        if (icon) obj.icon = icon;
        return obj;
    }).filter(Boolean);
}

function addScreenshotItem(data = {}) {
    const container = $('screenshotItems');
    const item = document.createElement('div');
    item.className = 'array-item draggable-item';
    item.draggable = true;
    item.innerHTML = `
        <span class="drag-handle" title="Drag to reorder">⠿</span>
        <div class="array-item-fields">
            <div class="input-with-upload">
                <input type="text" placeholder="Image path (e.g. res/projects/xxx/ss_01.png)" value="${escapeAttr(data.src || '')}">
                <button type="button" class="btn btn-small btn-upload" title="Upload image">↑</button>
            </div>
            <input type="text" placeholder="Alt text (describe what's shown)" value="${escapeAttr(data.alt || '')}">
            <div class="array-item-preview ss-preview-target"></div>
        </div>
        <button type="button" class="btn-remove-item">&times;</button>
    `;
    item.querySelector('.btn-remove-item').addEventListener('click', () => item.remove());

    // Upload button
    const srcInput = item.querySelector('input');
    item.querySelector('.btn-upload').addEventListener('click', () => triggerUpload(srcInput, 'image/*', 'screenshot'));

    // Screenshot preview
    const previewTarget = item.querySelector('.ss-preview-target');
    const updatePreview = debounce(() => renderMediaPreview(previewTarget, srcInput.value.trim()));
    srcInput.addEventListener('input', updatePreview);

    // Hover tooltip
    initMediaTooltip(item, () => srcInput.value.trim());

    initDragReorder(item, container);
    container.appendChild(item);
    if (data.src) renderMediaPreview(previewTarget, data.src);
}

function collectScreenshotItems() {
    return [...$('screenshotItems').querySelectorAll('.array-item')].map(item => {
        const inputs = item.querySelectorAll('input');
        const src = inputs[0].value.trim();
        const alt = inputs[1].value.trim();
        if (!src) return null;
        return { src, alt };
    }).filter(Boolean);
}

function addVideoItem(data = {}) {
    const container = $('videoItems');
    const item = document.createElement('div');
    item.className = 'array-item draggable-item';
    item.draggable = true;
    item.innerHTML = `
        <span class="drag-handle" title="Drag to reorder">⠿</span>
        <div class="array-item-fields">
            <div class="input-with-upload">
                <input type="text" placeholder="Video URL or path (supports YouTube)" value="${escapeAttr(data.src || '')}">
                <button type="button" class="btn btn-small btn-upload" title="Upload video">↑</button>
            </div>
            <input type="text" placeholder="Alt text (describe the video)" value="${escapeAttr(data.alt || '')}">
            <div class="array-item-preview vid-preview-target"></div>
        </div>
        <button type="button" class="btn-remove-item">&times;</button>
    `;
    item.querySelector('.btn-remove-item').addEventListener('click', () => item.remove());

    // Upload button
    const srcInput = item.querySelector('input');
    item.querySelector('.btn-upload').addEventListener('click', () => triggerUpload(srcInput, 'video/*', 'video'));

    // Video preview
    const previewTarget = item.querySelector('.vid-preview-target');
    const updatePreview = debounce(() => renderMediaPreview(previewTarget, srcInput.value.trim()));
    srcInput.addEventListener('input', updatePreview);

    // Hover tooltip
    initMediaTooltip(item, () => srcInput.value.trim());

    initDragReorder(item, container);
    container.appendChild(item);
    if (data.src) renderMediaPreview(previewTarget, data.src);
}

function collectVideoItems() {
    return [...$('videoItems').querySelectorAll('.array-item')].map(item => {
        const inputs = item.querySelectorAll('input');
        const src = inputs[0].value.trim();
        const alt = inputs[1]?.value.trim() || '';
        if (!src) return null;
        const obj = { src };
        if (alt) obj.alt = alt;
        return obj;
    }).filter(Boolean);
}

$('btnAddWork').addEventListener('click', () => addWorkItem());
$('btnAddSocial').addEventListener('click', () => addSocialItem());
$('btnAddScreenshot').addEventListener('click', () => addScreenshotItem());
$('btnAddVideo').addEventListener('click', () => addVideoItem());

// ─── Import JSON ───
$('btnImportJson').addEventListener('click', () => $('jsonFileInput').click());

$('jsonFileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!Array.isArray(data)) throw new Error('Expected an array of projects');

        const confirmed = await showConfirm(
            'Import Projects',
            `Import ${data.length} projects from file? This will merge with existing data.`,
            { okLabel: 'Import' }
        );
        if (!confirmed) return;

        for (let i = 0; i < data.length; i++) {
            const project = { ...data[i], order: i };
            const id = project.id || `project-${i}`;
            project.id = id;
            await setDoc(doc(db, 'projects', id), project);
        }

        showToast(`Imported ${data.length} projects.`, 'success');
        await loadProjects();
        markDirty();
    } catch (error) {
        showToast('Import failed: ' + error.message, 'error');
    }

    e.target.value = '';
});

// ─── Seed from live projects.json ───
$('btnSeedFirestore').addEventListener('click', async () => {
    const confirmed = await showConfirm(
        'Seed from projects.json',
        'Fetch the live projects.json and import all projects to Firestore?',
        { okLabel: 'Seed' }
    );
    if (!confirmed) return;

    try {
        const res = await fetch('../projects.json');
        const data = await res.json();

        for (let i = 0; i < data.length; i++) {
            const project = { ...data[i], order: i };
            const id = project.id || `project-${i}`;
            project.id = id;
            await setDoc(doc(db, 'projects', id), project);
        }

        showToast(`Seeded ${data.length} projects from projects.json.`, 'success');
        await loadProjects();
        markDirty();
    } catch (error) {
        showToast('Seed failed: ' + error.message, 'error');
    }
});

// ─── Clear All ───
$('btnClearAll').addEventListener('click', async () => {
    const confirmed = await showConfirm(
        'Clear All Projects',
        'This will permanently delete ALL projects from the CMS. Are you sure?',
        { okLabel: 'Delete All', okClass: 'btn-danger' }
    );
    if (!confirmed) return;

    try {
        for (const p of projects) {
            await deleteDoc(doc(db, 'projects', p.id));
        }
        showToast('All projects cleared.', 'success');
        await loadProjects();
    } catch (error) {
        showToast('Clear failed: ' + error.message, 'error');
    }
});

// ─── Publish: Generate JSON ───
function generateProjectsJson() {
    return projects.map(p => {
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
}

// ─── Download JSON ───
$('btnDownloadJson').addEventListener('click', () => {
    const data = generateProjectsJson();
    const json = JSON.stringify(data, null, 4);

    const preview = $('publishPreview');
    preview.style.display = 'block';
    preview.querySelector('pre').textContent = json;

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'projects.json';
    a.click();
    URL.revokeObjectURL(url);

    showToast('projects.json downloaded.', 'success');
});

// ─── Commit to GitHub ───
$('btnCommitGithub').addEventListener('click', async () => {
    const pat = localStorage.getItem('cms_github_pat');
    if (!pat) {
        showToast('Set your GitHub PAT in Settings first.', 'error');
        return;
    }

    const owner = localStorage.getItem('cms_github_owner') || GITHUB_DEFAULTS.owner;
    const repo = localStorage.getItem('cms_github_repo') || GITHUB_DEFAULTS.repo;
    const branch = localStorage.getItem('cms_github_branch') || GITHUB_DEFAULTS.branch;

    const confirmed = await showConfirm(
        'Commit to GitHub',
        `Push projects.json to ${owner}/${repo} (${branch})?`,
        { okLabel: 'Push', okClass: 'btn-success' }
    );
    if (!confirmed) return;

    try {
        const data = generateProjectsJson();
        const jsonStr = JSON.stringify(data, null, 4);
        const content = btoa(new TextEncoder().encode(jsonStr).reduce((s, b) => s + String.fromCharCode(b), ''));

        const getRes = await fetch(
            `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/projects.json?ref=${encodeURIComponent(branch)}`,
            { headers: { 'Authorization': `Bearer ${pat}`, 'Accept': 'application/vnd.github.v3+json' } }
        );

        let sha = null;
        if (getRes.ok) {
            const fileData = await getRes.json();
            sha = fileData.sha;
        }

        const body = {
            message: 'Update projects.json via CMS',
            content,
            branch
        };
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
            throw new Error(err.message || 'GitHub API error');
        }

        showToast('Committed to GitHub! Deploy will start automatically.', 'success');
        markClean();
    } catch (error) {
        console.error('GitHub commit error:', error);
        showToast('Commit failed: ' + error.message, 'error');
    }
});

// ─── Dirty Bar Actions ───
$('btnDirtyRevert')?.addEventListener('click', async () => {
    const confirmed = await showConfirm(
        'Revert Changes',
        'Reload all projects from Firestore? Any unpublished changes in the ordering or data will be refreshed from the database.',
        { okLabel: 'Revert', okClass: 'btn-danger' }
    );
    if (!confirmed) return;
    await loadProjects();
    showToast('Reverted to last saved state.', 'info');
});

$('btnDirtyDownload')?.addEventListener('click', () => {
    $('btnDownloadJson').click();
});

$('btnDirtyCommit')?.addEventListener('click', () => {
    $('btnCommitGithub').click();
});

// Guard logout when dirty
$('btnLogout').addEventListener('click', async (e) => {
    if (isDirty) {
        e.stopImmediatePropagation();
        const confirmed = await showConfirm(
            'Unpublished Changes',
            'You have unpublished changes. If you log out now, your Firestore data is saved but not published to GitHub. Continue?',
            { okLabel: 'Logout Anyway', okClass: 'btn-danger' }
        );
        if (!confirmed) return;
        isDirty = false;  // Clear so beforeunload doesn't double-prompt
        localStorage.removeItem('cms_google_access_token');
        localStorage.removeItem('cms_google_token_time');
        if (auth) await signOut(auth);
        showScreen('login');
    }
}, true);  // capture phase to intercept before the existing handler

// ─── Scroll Reveal ───
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('[data-reveal]').forEach(el => {
    revealObserver.observe(el);
});

// Trigger reveal for login screen elements on load
requestAnimationFrame(() => {
    document.querySelectorAll('.screen.active [data-reveal]').forEach(el => {
        el.classList.add('revealed');
    });
});

// ─── Utility ───
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escapeAttr(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

document.addEventListener('DOMContentLoaded', function() {
    var btnBack = document.getElementById('btnBackToMain');
    if (btnBack) {
        btnBack.addEventListener('click', function() {
            window.location.href = '/'; // Change to your main page path if needed
        });
    }
});

