document.addEventListener('DOMContentLoaded', () => {
    const data = window.CV_DATA;
    if (!data) return;

    renderSkills(data.skills);
    renderExperience(data.experience);
    renderEducation(data.education);
    renderProjects(data);
    initCopyEmail();
    initPrintButton();
});

async function renderProjects(data) {
    const selectedContainer = document.getElementById('selectedWork');
    const olderContainer = document.getElementById('olderProjects');
    if (!selectedContainer && !olderContainer) return;

    try {
        const response = await fetch('projects.json');
        const projects = await response.json();
        const byId = new Map(projects.map((project) => [project.id, project]));

        if (selectedContainer) {
            selectedContainer.innerHTML = data.selectedProjectIds
                .map((id) => byId.get(id))
                .filter(Boolean)
                .map(renderWorkItem)
                .join('');
        }

        if (olderContainer) {
            olderContainer.innerHTML = data.olderProjectIds
                .map((id) => byId.get(id))
                .filter(Boolean)
                .map(renderOlderProject)
                .join('');
        }
    } catch (error) {
        console.error('Could not load projects.json', error);
    }
}

function renderWorkItem(project) {
    const socials = (project.socials || [])
        .map((social) => `<a href="${escapeAttr(social.url)}" target="_blank" rel="noopener">${escapeHtml(social.info || 'Link')}</a>`)
        .join('');
    const links = [
        `<a class="button project-detail-button" href="project.html?id=${escapeAttr(project.id)}">Project details</a>`,
        socials
    ].filter(Boolean).join('');
    const thumbnail = renderWorkThumbnail(project);

    return `
        <article class="work-item">
            <p class="row-date">${escapeHtml(formatPeriod(project.datetime || project.duration || ''))}</p>
            <div class="work-item-body${thumbnail ? '' : ' work-item-body-no-thumb'}">
                <div class="work-item-copy">
                    <h3>${escapeHtml(project.title)}</h3>
                    ${renderChips([typeLabel(project.type), project.language, project.engine])}
                    <p>${escapeHtml(project.description || '')}</p>
                    <div class="inline-links">${links}</div>
                </div>
                ${thumbnail}
            </div>
        </article>
    `;
}

function renderWorkThumbnail(project) {
    const media = getProjectPreviewMedia(project);
    if (!media) return '';

    const label = `View ${project.title || 'project'} details`;
    const mediaHtml = media.kind === 'video'
        ? `<video src="${escapeAttr(media.src)}" muted playsinline preload="metadata" aria-hidden="true"></video>`
        : `<img src="${escapeAttr(media.src)}" alt="${escapeAttr(media.alt)}" loading="lazy">`;

    return `
        <a class="work-thumb" href="project.html?id=${escapeAttr(project.id)}" aria-label="${escapeAttr(label)}">
            ${mediaHtml}
        </a>
    `;
}

function getProjectPreviewMedia(project) {
    const screenshot = (project.screenshots || [])[0];
    if (screenshot?.src) {
        return {
            kind: 'image',
            src: screenshot.src,
            alt: screenshot.alt || `${project.title || 'Project'} screenshot`
        };
    }

    if (project.minisrc) {
        return {
            kind: 'image',
            src: project.minisrc,
            alt: `${project.title || 'Project'} thumbnail`
        };
    }

    const video = (project.videos || [])[0];
    if (video?.src && /\.(mp4|webm|ogg|mov)$/i.test(video.src)) {
        return {
            kind: 'video',
            src: video.src,
            alt: video.alt || `${project.title || 'Project'} video preview`
        };
    }

    return null;
}

function renderOlderProject(project) {
    return `
        <article class="older-item">
            <p class="row-date">${escapeHtml(formatPeriod(project.datetime || ''))}</p>
            <div class="older-body">
                <h3>${escapeHtml(project.title)}</h3>
                ${renderChips([project.language, project.engine, typeLabel(project.type)])}
                <p>${escapeHtml(project.description || project.longdescription || '')}</p>
            </div>
        </article>
    `;
}

function renderSkills(groups) {
    const container = document.getElementById('skillGroups');
    if (!container) return;
    container.innerHTML = groups.map((group) => `
        <section class="skill-group" aria-label="${escapeAttr(group.label)}">
            <h3>${escapeHtml(group.label)}</h3>
            <ul class="skill-tags">
                ${group.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
        </section>
    `).join('');
}

function renderExperience(items) {
    const container = document.getElementById('experienceList');
    if (!container) return;
    container.innerHTML = items.map((item) => `
        <article class="timeline-item">
            <p class="row-date">${escapeHtml(formatPeriod(item.period))}</p>
            <div class="timeline-body">
                <h3>${escapeHtml(item.title)}</h3>
                ${renderExperienceMeta(item.meta)}
                <p class="organization">${escapeHtml(item.organization)}</p>
                <ul>${item.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul>
                ${renderChips(item.tech || [], 'tech-line')}
            </div>
        </article>
    `).join('');
}

function renderExperienceMeta(meta) {
    if (Array.isArray(meta)) {
        return renderChips(meta.filter(Boolean), 'experience-meta');
    }
    return meta ? `<p>${escapeHtml(meta)}</p>` : '';
}

function renderEducation(items) {
    const container = document.getElementById('educationList');
    if (!container) return;
    container.innerHTML = items.map((item) => `
        <article class="education-item">
            <p class="row-date">${escapeHtml(formatPeriod(item.period))}</p>
            <div class="education-body">
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.organization)}</p>
            </div>
        </article>
    `).join('');
}

function renderChips(items, className = '') {
    const values = (items || []).filter(Boolean);
    if (!values.length) return '';
    return `
        <div class="meta-chips ${escapeAttr(className)}">
            ${values.map((value) => `<span>${escapeHtml(value)}</span>`).join('')}
        </div>
    `;
}

function formatPeriod(value) {
    return String(value || '')
        .replace(/\bnow\b/i, 'Present')
        .replace(/\s*-\s*/g, ' - ')
        .replace(/\s+/g, ' ')
        .trim();
}

function initCopyEmail() {
    document.querySelectorAll('[data-copy-email]').forEach((button) => {
        button.addEventListener('click', async () => {
            const email = button.dataset.copyEmail;
            const status = button.parentElement.querySelector('.copy-status');
            try {
                if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(email);
                } else {
                    fallbackCopy(email);
                }
                if (status) status.textContent = 'Email copied';
            } catch {
                if (status) status.textContent = 'Could not copy automatically';
            }
        });
    });
}

function fallbackCopy(text) {
    const input = document.createElement('textarea');
    input.value = text;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    input.remove();
}

function initPrintButton() {
    document.querySelectorAll('[data-print-page]').forEach((button) => {
        button.addEventListener('click', () => window.print());
    });
}

function typeLabel(type) {
    return {
        BSS: 'Bright Star Studios',
        'Zloppy-Games': 'Zloppy Games',
        BH: 'Baer & Hoggo',
        HKU: 'University',
        Hobby: 'Hobby',
        PixelPool: 'PixelPool'
    }[type] || type || 'Project';
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeAttr(value) {
    return escapeHtml(value);
}
