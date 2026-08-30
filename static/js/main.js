/* ============================================================
   PORTFOLIO — main.js  (Public Site)
   ============================================================ */

const API = {
  profile:      '/api/profile',
  skills:       '/api/skills',
  projects:     '/api/projects',
  certificates: '/api/certificates',
  achievements: '/api/achievements',
};

/* ── Helpers ────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const get = async (url) => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
};

function esc(str = '') {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/* ── Theme ──────────────────────────────────────────────────── */
function initTheme() {
  const saved = localStorage.getItem('portfolio-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  if ($('theme-icon')) $('theme-icon').textContent = saved === 'dark' ? '☀️' : '🌙';
}

if ($('theme-toggle')) {
  $('theme-toggle').addEventListener('click', () => {
    const curr = document.documentElement.getAttribute('data-theme');
    const next = curr === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('portfolio-theme', next);
    if ($('theme-icon')) $('theme-icon').textContent = next === 'dark' ? '☀️' : '🌙';
  });
}

/* ── Navbar scroll ──────────────────────────────────────────── */
window.addEventListener('scroll', () => {
  if ($('navbar')) $('navbar').classList.toggle('scrolled', scrollY > 50);
  if ($('back-to-top')) $('back-to-top').classList.toggle('visible', scrollY > 400);

  // Active nav link
  const sections = document.querySelectorAll('section[id]');
  let current = '';
  sections.forEach(s => {
    if (scrollY >= s.offsetTop - 140) current = s.id;
  });
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + current);
  });
});

if ($('back-to-top')) {
  $('back-to-top').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ── Mobile hamburger ───────────────────────────────────────── */
if ($('hamburger')) {
  $('hamburger').addEventListener('click', () => {
    if ($('nav-links')) $('nav-links').classList.toggle('open');
  });
}
document.querySelectorAll('.nav-links a').forEach(a => {
  a.addEventListener('click', () => {
    if ($('nav-links')) $('nav-links').classList.remove('open');
  });
});

/* ── PROFILE ────────────────────────────────────────────────── */
async function loadProfile() {
  const p = await get(API.profile);
  if (!p || !p.name) return;

  // Title / Nav
  document.title = `${p.name} — Portfolio`;
  if ($('page-title')) $('page-title').textContent = `${p.name} — Portfolio`;
  if ($('meta-desc')) $('meta-desc').setAttribute('content', p.bio || '');
  if ($('nav-logo')) $('nav-logo').textContent = p.name.split(' ').map(w => w[0]).join('').slice(0, 3);

  // Hero
  if ($('hero-name')) $('hero-name').textContent = p.name;
  if ($('hero-bio')) $('hero-bio').textContent = p.bio || '';
  if ($('footer-name')) $('footer-name').textContent = p.name;

  // Profile photo
  if (p.profile_image) {
    const photoEl = $('hero-photo');
    if (photoEl) {
      photoEl.src = p.profile_image;
      photoEl.alt = p.name;
    }
  }

  // Resume buttons (Hero and Navbar)
  const resumeBtn = $('hero-resume-btn');
  const navResume = $('nav-resume-link');
  const resumeUrl = p.resume_file || '/static/CV_Arunabh_Singh_Final.pdf';
  if (resumeBtn) {
    resumeBtn.href = resumeUrl;
    resumeBtn.setAttribute('target', '_blank');
  }
  if (navResume) {
    navResume.href = resumeUrl;
    navResume.setAttribute('target', '_blank');
  }

  // Social links
  const socialLinks = [
    { key: 'github',     icon: '🐱', label: 'GitHub' },
    { key: 'linkedin',   icon: '💼', label: 'LinkedIn' },
    { key: 'email',      icon: '✉️', label: 'Email', customHref: p.email ? `mailto:${p.email}` : null },
    { key: 'leetcode',   icon: '💻', label: 'LeetCode' },
    { key: 'hackerrank', icon: '🟢', label: 'HackerRank' },
  ];
  const socialHtml = socialLinks
    .filter(s => s.customHref || p[s.key])
    .map(s => {
      const url = s.customHref || p[s.key];
      return `<a href="${esc(url)}" target="_blank" rel="noopener" class="social-link">${s.icon} ${s.label}</a>`;
    })
    .join('');
  if ($('hero-social') && socialHtml) $('hero-social').innerHTML = socialHtml;
  if ($('footer-social') && socialHtml) $('footer-social').innerHTML = socialHtml;

  // Accent color
  if (p.accent_color) {
    document.documentElement.style.setProperty('--accent', p.accent_color);
  }

  // About section
  if ($('about-desc') && p.about) $('about-desc').textContent = p.about;
}

/* ── PROJECTS FILTERING & SEARCH ────────────────────────────── */
let activeFilter = 'all';
let searchQuery = '';

function setupProjectFilters() {
  const filterBtns = document.querySelectorAll('.project-filters .filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-filter') || 'all';
      filterProjectCards();
    });
  });

  const searchInput = $('project-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = (e.target.value || '').toLowerCase().trim();
      filterProjectCards();
    });
  }
}

function filterProjectCards() {
  const cards = document.querySelectorAll('#projects-grid .project-card-wrapper');
  cards.forEach(card => {
    const title = (card.querySelector('.project-title')?.textContent || '').toLowerCase();
    const desc = (card.querySelector('.project-desc')?.textContent || '').toLowerCase();
    const cat = (card.getAttribute('data-category') || '').toLowerCase();
    const tech = (card.getAttribute('data-tech') || '').toLowerCase();

    const matchesFilter = (activeFilter === 'all') || (cat === activeFilter.toLowerCase()) || (tech.includes(activeFilter.toLowerCase()));
    const matchesSearch = !searchQuery || title.includes(searchQuery) || desc.includes(searchQuery) || tech.includes(searchQuery);

    if (matchesFilter && matchesSearch) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

/* ── CERTIFICATES LIGHTBOX ──────────────────────────────────── */
function openLightbox(src, name) {
  if (!src) return;
  const img = $('lightbox-img');
  if (!img) return;
  img.src = src;
  img.alt = name || 'Certificate';
  if ($('lightbox')) $('lightbox').classList.add('open');
}

if ($('lightbox-close')) {
  $('lightbox-close').addEventListener('click', () => {
    if ($('lightbox')) $('lightbox').classList.remove('open');
  });
}
if ($('lightbox')) {
  $('lightbox').addEventListener('click', e => {
    if (e.target === $('lightbox')) $('lightbox').classList.remove('open');
  });
}

/* ── TYPED.JS ───────────────────────────────────────────────── */
function initTyped() {
  const titles = [
    'B.Tech CSE Student | AI/ML & Full-Stack Developer',
    'AI/ML & Full-Stack Developer',
    'Problem Solver & Builder',
    'Open Source & Tech Enthusiast',
  ];
  if (window.Typed && $('typed-el')) {
    new Typed('#typed-el', {
      strings: titles,
      typeSpeed: 55,
      backSpeed: 35,
      backDelay: 2000,
      loop: true,
    });
  }
}

/* ── AOS ANIMATIONS ─────────────────────────────────────────── */
function initAOS() {
  if (window.AOS) {
    AOS.init({ duration: 700, once: true, offset: 80 });
  } else {
    document.querySelectorAll('[data-aos]').forEach(el => el.classList.add('aos-animate'));
  }
}

/* ── INIT ───────────────────────────────────────────────────── */
(async function init() {
  initTheme();
  setupProjectFilters();
  initTyped();
  initAOS();

  // Enhance dynamically if API is available
  await loadProfile();
})();
