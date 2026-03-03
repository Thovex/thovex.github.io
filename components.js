// ─────────────────────────────────────────────
//  Shared Components · jessevanvliet.xyz
//  Nav, Footer, Mobile Nav, Copyright, Reveal
// ─────────────────────────────────────────────

const SITE = {
    brand: 'jessevanvliet<span>.</span>xyz',
    email: 'jjvanvliet@protonmail.com',
    linkedin: 'https://www.linkedin.com/in/jesse-j-van-vliet/',
    nav: [
        { label: 'Projects', href: 'index.html' },
        { label: 'About',    href: 'about.html' },
        { label: 'Contact',  href: 'contact.html' }
    ]
};

// ─── Determine active page ───
function getActivePage() {
    const path = window.location.pathname;
    if (path.includes('about'))   return 'about.html';
    if (path.includes('contact')) return 'contact.html';
    if (path.includes('project') && !path.includes('projects')) return ''; // detail, no highlight
    return 'index.html';
}

// ─── Inject Nav ───
function injectNav() {
    const placeholder = document.getElementById('nav-placeholder');
    if (!placeholder) return;

    const activePage = getActivePage();
    const links = SITE.nav.map(n =>
        `<a href="${n.href}"${n.href === activePage ? ' class="active"' : ''}>${n.label}</a>`
    ).join('\n                ');

    placeholder.outerHTML = `
    <nav class="nav">
        <div class="nav-inner">
            <a href="index.html" class="nav-brand">${SITE.brand}</a>
            <div class="nav-links" id="navLinks">
                ${links}
            </div>
            <div class="nav-toggle" id="navToggle">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    </nav>`;
}

// ─── Inject Footer ───
function injectFooter() {
    const placeholder = document.getElementById('footer-placeholder');
    if (!placeholder) return;

    placeholder.outerHTML = `
    <footer class="footer">
        <div class="footer-inner">
            <div class="footer-left">&copy; ${new Date().getFullYear()} Jesse van Vliet</div>
            <div class="footer-links">
                <a href="${SITE.linkedin}" target="_blank" rel="noopener">LinkedIn</a>
                <a href="mailto:${SITE.email}">Email</a>
                <a href="about.html">CV</a>
            </div>
        </div>
    </footer>`;
}

// ─── Mobile Nav Toggle ───
function initMobileNav() {
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    if (!navToggle || !navLinks) return;

    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navLinks.classList.toggle('open');
    });

    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            navLinks.classList.remove('open');
        });
    });
}

// ─── Scroll Reveal ───
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

function initScrollReveal() {
    document.querySelectorAll('[data-reveal]').forEach(el => {
        if (!el.classList.contains('revealed')) {
            revealObserver.observe(el);
        }
    });
}

// ─── Boot ───
document.addEventListener('DOMContentLoaded', () => {
    injectNav();
    injectFooter();
    initMobileNav();
    initScrollReveal();
});

