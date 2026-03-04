// ─────────────────────────────────────────────────────────────
//  CMS Admin — jessevanvliet.xyz
//  Firebase Auth (Google Sign-In + TOTP MFA) + Firestore CRUD
// ─────────────────────────────────────────────────────────────

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js';
import {
    getAuth,
    signInWithPopup,
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
    // Initial render
    if (input.value.trim()) update();
}

// ─── Auth ───
if (auth) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            if (user.email !== ALLOWED_EMAIL) {
                showToast('Access denied. Only the authorized account may sign in.', 'error');
                await signOut(auth);
                return;
            }
            enterDashboard(user);
        } else {
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
    provider.setCustomParameters({ login_hint: ALLOWED_EMAIL });

    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        if (user.email !== ALLOWED_EMAIL) {
            showToast('Access denied. Only the authorized account may sign in.', 'error');
            await signOut(auth);
        }
    } catch (error) {
        if (error.code === 'auth/multi-factor-auth-required') {
            mfaResolver = getMultiFactorResolver(auth, error);
            showScreen('mfa');
            $('mfaCode').focus();
        } else {
            console.error('Sign-in error:', error);
            showToast('Sign-in failed: ' + error.message, 'error');
        }
    }
});

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
        await mfaResolver.resolveSignIn(assertion);
        mfaResolver = null;
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
    if (auth) await signOut(auth);
    showScreen('login');
});

// ─── Dashboard Entry ───
function enterDashboard(user) {
    showScreen('dashboard');

    const mfaEnrolled = multiFactor(user).enrolledFactors.length > 0;
    $('topbarUser').innerHTML = `
        ${user.email}
        <span class="auth-badge">${mfaEnrolled ? '🔐 MFA' : '🔓 No MFA'}</span>
    `;

    loadSettings();
    loadProjects();
}

// ─── Tabs ───
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        $('tab-' + tab.dataset.tab).classList.add('active');
    });
});

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
}

$('btnSavePat').addEventListener('click', () => {
    localStorage.setItem('cms_github_pat', $('githubPat').value.trim());
    localStorage.setItem('cms_github_owner', $('githubOwner').value.trim());
    localStorage.setItem('cms_github_repo', $('githubRepo').value.trim());
    localStorage.setItem('cms_github_branch', $('githubBranch').value.trim());
    showToast('Settings saved.', 'success');
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
        <tr style="animation-delay:${i * 0.04}s">
            <td class="order-cell">
                <input type="number" value="${p.order ?? i}" min="0" data-id="${p.id}" class="order-input">
            </td>
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
                <th>Order</th><th>Title</th><th>Status</th><th>Engine</th><th>Language</th><th>Period</th><th>Media</th><th>Actions</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;

    container.querySelectorAll('.order-input').forEach(input => {
        input.addEventListener('change', async (e) => {
            const id = e.target.dataset.id;
            const newOrder = parseInt(e.target.value, 10);
            if (isNaN(newOrder)) return;

            try {
                await setDoc(doc(db, 'projects', id), { order: newOrder }, { merge: true });
                showToast('Order updated.', 'success');
                await loadProjects();
            } catch (err) {
                showToast('Failed to update order.', 'error');
            }
        });
    });
}

// ─── Project Editor ───
let editingProjectId = null;

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

    if (project) {
        form.elements.id.value = project.id || '';
        form.elements.title.value = project.title || '';
        form.elements.language.value = project.language || '';
        form.elements.engine.value = project.engine || '';
        form.elements.role.value = project.role || '';
        form.elements.type.value = project.type || 'Hobby';
        form.elements.duration.value = project.duration || '';
        form.elements.datetime.value = project.datetime || '';
        form.elements.card.checked = project.card !== false;
        form.elements.minisrc.value = project.minisrc || '';
        form.elements.banner.value = project.banner || '';
        form.elements.description.value = project.description || '';
        form.elements.longdescription.value = project.longdescription || '';
        form.elements.archive.value = project.archive || '';

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
}

function closeEditor() {
    $('editorModal').classList.remove('active');
    editingProjectId = null;
}

$('btnAddProject').addEventListener('click', () => openEditor());
$('btnCloseEditor').addEventListener('click', closeEditor);
$('btnCancelEditor').addEventListener('click', closeEditor);

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
        type: form.elements.type.value,
        duration: form.elements.duration.value.trim(),
        datetime: form.elements.datetime.value.trim(),
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
        closeEditor();
        await loadProjects();
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
            <input type="text" placeholder="Icon path (e.g. res/ico_github.png)" value="${escapeAttr(data.icon || '')}">
            <div class="array-item-preview social-preview-target"></div>
        </div>
        <button type="button" class="btn-remove-item">&times;</button>
    `;
    item.querySelector('.btn-remove-item').addEventListener('click', () => item.remove());

    // Social preview
    const inputs = item.querySelectorAll('input');
    const previewTarget = item.querySelector('.social-preview-target');
    const updatePreview = debounce(() => {
        renderSocialPreview(previewTarget, inputs[2].value.trim(), inputs[1].value.trim());
    });
    inputs[1].addEventListener('input', updatePreview);
    inputs[2].addEventListener('input', updatePreview);

    container.appendChild(item);

    // Initial preview
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
    item.className = 'array-item';
    item.innerHTML = `
        <div class="array-item-fields">
            <input type="text" placeholder="Image path (e.g. res/projects/xxx/ss_1.png)" value="${escapeAttr(data.src || '')}">
            <input type="text" placeholder="Alt text" value="${escapeAttr(data.alt || '')}">
            <div class="array-item-preview ss-preview-target"></div>
        </div>
        <button type="button" class="btn-remove-item">&times;</button>
    `;
    item.querySelector('.btn-remove-item').addEventListener('click', () => item.remove());

    // Screenshot preview
    const srcInput = item.querySelector('input');
    const previewTarget = item.querySelector('.ss-preview-target');
    const updatePreview = debounce(() => renderMediaPreview(previewTarget, srcInput.value.trim()));
    srcInput.addEventListener('input', updatePreview);

    container.appendChild(item);

    // Initial preview
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
    item.className = 'array-item';
    item.innerHTML = `
        <div class="array-item-fields">
            <input type="text" placeholder="Video URL or path (supports YouTube)" value="${escapeAttr(data.src || '')}">
            <div class="array-item-preview vid-preview-target"></div>
        </div>
        <button type="button" class="btn-remove-item">&times;</button>
    `;
    item.querySelector('.btn-remove-item').addEventListener('click', () => item.remove());

    // Video preview
    const srcInput = item.querySelector('input');
    const previewTarget = item.querySelector('.vid-preview-target');
    const updatePreview = debounce(() => renderMediaPreview(previewTarget, srcInput.value.trim()));
    srcInput.addEventListener('input', updatePreview);

    container.appendChild(item);

    // Initial preview
    if (data.src) renderMediaPreview(previewTarget, data.src);
}

function collectVideoItems() {
    return [...$('videoItems').querySelectorAll('.array-item')].map(item => {
        const src = item.querySelector('input').value.trim();
        if (!src) return null;
        return { src };
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
    } catch (error) {
        console.error('GitHub commit error:', error);
        showToast('Commit failed: ' + error.message, 'error');
    }
});

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
