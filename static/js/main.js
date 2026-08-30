/* ============================================================
   PORTFOLIO — main.js  (Public Site)
   ============================================================ */

const API = {
  profile:      '/api/profile',
  skills:       '/api/skills',
  projects:     '/api/projects',
  certificates: '/api/certificates',
  achievements: '/api/achievements',
  blog:         '/api/blog',
  messages:     '/api/messages',
};

/* ── Helpers ────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const get = url => fetch(url).then(r => r.json());

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

  // Meta / nav
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
      if (photoEl.tagName.toLowerCase() === 'img') {
        photoEl.src = p.profile_image;
        photoEl.alt = p.name;
      } else {
        const img = document.createElement('img');
        img.src = p.profile_image;
        img.className = 'hero-photo';
        img.alt = p.name;
        img.id = 'hero-photo';
        photoEl.replaceWith(img);
      }
    }
  }

  // Typed titles
  const titles = [
    p.title || 'B.Tech CSE Student | AI/ML & Full-Stack Developer',
    'AI/ML & Full-Stack Developer',
    'Problem Solver & Builder',
    'Open Source & Tech Enthusiast',
  ];
  if (window.Typed) {
    new Typed('#typed-el', {
      strings: titles,
      typeSpeed: 55,
      backSpeed: 35,
      backDelay: 2000,
      loop: true,
    });
  } else if ($('typed-el')) {
    $('typed-el').textContent = titles[0];
  }

  // Resume button in Hero
  const resumeBtn = $('hero-resume-btn');
  if (resumeBtn) {
    if (p.resume_file) {
      resumeBtn.href = '/resume/download';
      resumeBtn.setAttribute('target', '_blank');
      resumeBtn.removeAttribute('onclick');
    } else {
      resumeBtn.href = '#contact';
    }
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
  if ($('hero-social')) $('hero-social').innerHTML = socialHtml;
  if ($('footer-social')) $('footer-social').innerHTML = socialHtml;

  // Accent color
  if (p.accent_color) {
    document.documentElement.style.setProperty('--accent', p.accent_color);
  }

  // About section
  if ($('about-desc')) $('about-desc').textContent = p.about || p.bio || '';
  const infoItems = [
    { label: '🎓 College', value: p.college || 'Lovely Professional University' },
    { label: '📚 Course',  value: p.course || 'B.Tech — Computer Science & Engineering' },
    { label: '📅 Year',    value: p.year || '2025 – Present' },
    { label: '📍 Location',value: p.location || 'India' },
  ];
  if ($('about-info')) {
    $('about-info').innerHTML = infoItems
      .filter(i => i.value)
      .map(i => `<div class="about-info-item"><div class="label">${i.label}</div><div class="value">${esc(i.value)}</div></div>`)
      .join('');
  }

  // Timeline (Learning journey)
  const timelineSteps = [
    { year: '2022', title: 'Foundations & Programming', desc: 'Started learning core programming principles with C++, Python, and algorithm design.' },
    { year: '2023', title: 'B.Tech CSE at LPU', desc: 'Commenced B.Tech in Computer Science & Engineering at Lovely Professional University. Built foundational software projects.' },
    { year: '2024', title: 'Web & Hardware Innovations', desc: 'Developed full-stack web applications and Arduino-based water monitoring embedded systems.' },
    { year: '2025 – Present', title: 'AI/ML & Advanced Systems', desc: 'Specializing in Computer Vision, Privacy-Preserving Facial Authentication (FaceVault AI), and scalable systems.' },
  ];
  if ($('timeline')) {
    $('timeline').innerHTML = timelineSteps.map(s => `
      <div class="timeline-item">
        <div class="timeline-year">${s.year}</div>
        <div class="timeline-title">${s.title}</div>
        <div class="timeline-desc">${s.desc}</div>
      </div>`).join('');
  }

  // Contact info
  const contactItems = [
    { icon: '📍', label: 'Location', value: p.location || 'India', href: null },
    { icon: '✉️', label: 'Email', value: p.email || 'arunabh14307@gmail.com', href: `mailto:${p.email || 'arunabh14307@gmail.com'}` },
    { icon: '💼', label: 'LinkedIn', value: 'Connect on LinkedIn', href: p.linkedin || 'https://www.linkedin.com/in/arunabh-singh-3a2629383/' },
    { icon: '🐱', label: 'GitHub', value: 'Follow on GitHub', href: p.github || 'https://github.com/arunabh14307' },
  ];
  if ($('contact-info')) {
    $('contact-info').innerHTML = contactItems
      .filter(c => c.value && c.href !== '')
      .map(c => `
        <div class="contact-item">
          <div class="contact-icon">${c.icon}</div>
          <div>
            <div class="contact-detail">${c.label}</div>
            <div class="contact-value">
              ${c.href ? `<a href="${esc(c.href)}" ${c.href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''} style="color:var(--text)">${esc(c.value)}</a>` : esc(c.value)}
            </div>
          </div>
        </div>`).join('');
  }
}

/* ── SKILLS ─────────────────────────────────────────────────── */
let allSkills = [];

async function loadSkills() {
  allSkills = await get(API.skills);
  const grid = $('skills-grid');
  if (!grid) return;

  if (!allSkills.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🔧</div><p>No skills added yet.</p></div>';
    return;
  }

  const categoryIcons = {
    'Programming': '💻',
    'Web Development': '🌐',
    'AI / Machine Learning': '🤖',
    'Database': '🗄️',
    'Tools': '🛠️'
  };

  // Desired category ordering
  const orderedCategories = ['Programming', 'Web Development', 'AI / Machine Learning', 'Database', 'Tools'];
  
  // Group skills
  const grouped = {};
  orderedCategories.forEach(cat => { grouped[cat] = []; });

  allSkills.forEach(s => {
    const cat = s.category || 'General';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  });

  // Render categorized cards
  grid.innerHTML = Object.entries(grouped)
    .filter(([_, skills]) => skills.length > 0)
    .map(([category, skills]) => `
      <div class="skill-category-card" data-aos="fade-up">
        <div class="skill-cat-header">
          <span class="skill-cat-icon">${categoryIcons[category] || '⚡'}</span>
          <h3 class="skill-cat-title">${esc(category)}</h3>
        </div>
        <div class="skill-items-list">
          ${skills.map(s => {
            const hasIcon = s.icon && (s.icon.startsWith('/') || s.icon.startsWith('http'));
            const iconEl = hasIcon 
              ? `<img src="${esc(s.icon)}" class="skill-pill-icon" alt="${esc(s.name)}" />`
              : `<span style="font-size:1rem">${esc(s.icon || '⚡')}</span>`;
            return `
              <div class="skill-pill" title="${esc(s.description || s.name)}">
                ${iconEl}
                <span>${esc(s.name)}</span>
              </div>`;
          }).join('')}
        </div>
      </div>
    `).join('');
}

/* ── PROJECTS ───────────────────────────────────────────────── */
let allProjects = [];
let activeFilter = 'all';
let searchQuery  = '';

async function loadProjects() {
  allProjects = await get(API.projects);
  buildFilterButtons();
  renderProjects();
}

function buildFilterButtons() {
  const container = $('project-filters');
  if (!container) return;
  
  const categories = [...new Set(allProjects.map(p => p.category).filter(Boolean))];
  const all = [...new Set(categories)];

  container.innerHTML = '<button class="filter-btn active" data-filter="all">All</button>';

  all.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.filter = cat;
    btn.textContent = cat;
    btn.addEventListener('click', () => {
      activeFilter = cat;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProjects();
    });
    container.appendChild(btn);
  });

  const allBtn = container.querySelector('[data-filter="all"]');
  if (allBtn) {
    allBtn.addEventListener('click', () => {
      activeFilter = 'all';
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      allBtn.classList.add('active');
      renderProjects();
    });
  }
}

function renderProjects() {
  const grid = $('projects-grid');
  if (!grid) return;

  let filtered = allProjects;

  if (activeFilter !== 'all') {
    filtered = filtered.filter(p =>
      p.category === activeFilter ||
      p.technologies.split(',').map(t => t.trim()).includes(activeFilter)
    );
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      p.technologies.toLowerCase().includes(q)
    );
  }

  if (!filtered.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">📂</div><p>No projects match your search.</p></div>';
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const techs = p.technologies.split(',').map(t => t.trim()).filter(Boolean);
    const imgHtml = p.image
      ? `<img src="${esc(p.image)}" class="project-img" alt="${esc(p.title)}" loading="lazy" />`
      : `<div class="project-img-placeholder">💻</div>`;

    return `
      <div class="project-card-wrapper card" data-aos="fade-up">
        ${p.featured ? '<span class="project-featured-badge">⭐ Featured</span>' : ''}
        ${imgHtml}
        <div class="project-body">
          <div class="project-meta">
            <span class="tag">${esc(p.category)}</span>
            <span class="tag">${esc(p.difficulty)}</span>
          </div>
          <h3 class="project-title">${esc(p.title)}</h3>
          <p class="project-desc">${esc(p.description || '')}</p>
          <div class="project-tech">${techs.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
          <div class="project-links">
            ${p.github_link ? `<a href="${esc(p.github_link)}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">🐱 GitHub</a>` : ''}
            ${p.demo_link   ? `<a href="${esc(p.demo_link)}"   target="_blank" rel="noopener" class="btn btn-primary btn-sm">🚀 Live Demo</a>` : ''}
            ${p.video_link  ? `<a href="${esc(p.video_link)}"  target="_blank" rel="noopener" class="btn btn-outline btn-sm">🎬 Video</a>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}

if ($('project-search')) {
  $('project-search').addEventListener('input', e => {
    searchQuery = e.target.value;
    renderProjects();
  });
}

/* ── CERTIFICATES ───────────────────────────────────────────── */
async function loadCertificates() {
  const certs = await get(API.certificates);
  const grid = $('certs-grid');
  if (!grid) return;

  if (!certs.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🎓</div><p>No certificates added yet.</p></div>';
    return;
  }
  grid.innerHTML = certs.map(c => {
    const hasImage = c.image && !c.image.toLowerCase().endsWith('.pdf');

    let viewBtn = '';
    if (hasImage) {
      viewBtn = `<button class="btn btn-outline btn-sm" onclick="openLightbox('${esc(c.image)}','${esc(c.name)}')">👁 View Certificate</button>`;
    } else if (c.file_path) {
      viewBtn = `<a href="/certificates/${c.id}/preview" target="_blank" class="btn btn-outline btn-sm">👁 View Certificate</a>`;
    }

    let verifyBtn = '';
    if (c.verify_link && c.verify_link.trim().startsWith('http')) {
      verifyBtn = `<a href="${esc(c.verify_link)}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">🔗 Verify Credential</a>`;
    }

    return `
    <div class="card cert-card" data-aos="fade-up">
      <div class="cert-img-wrap" style="cursor:${hasImage ? 'pointer' : 'default'}"
           onclick="${hasImage ? `openLightbox('${esc(c.image)}','${esc(c.name)}')` : 'void(0)'}">
        ${hasImage
          ? `<img src="${esc(c.image)}" alt="${esc(c.name)}" style="width:100%;height:100%;object-fit:contain;background:#fff;padding:6px;" loading="lazy" />`
          : '<span style="font-size:3rem">🏅</span>'}
      </div>
      <div class="cert-body">
        <div class="cert-org">${esc(c.organization)}</div>
        <h3 class="cert-name">${esc(c.name)}</h3>
        <div class="cert-date">${esc(c.date)}</div>
        <div class="cert-actions" style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.85rem">
          ${viewBtn}
          ${verifyBtn}
        </div>
      </div>
    </div>`;
  }).join('');
}

function openLightbox(src, name) {
  if (!src) return;
  const img = $('lightbox-img');
  if (!img) return;
  img.src = '';
  img.alt = name || 'Certificate';
  img.src = src;
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

/* ── ACHIEVEMENTS ───────────────────────────────────────────── */
async function loadAchievements() {
  const ach = await get(API.achievements);
  const grid = $('achievements-grid');
  if (!grid) return;

  if (!ach.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🏆</div><p>No achievements added yet.</p></div>';
    return;
  }
  grid.innerHTML = ach.map(a => `
    <div class="card ach-card" data-aos="zoom-in">
      <div class="ach-icon">${esc(a.icon)}</div>
      <h3 class="ach-title">${esc(a.title)}</h3>
      <div class="ach-desc">${esc(a.description)}</div>
      <div class="ach-date">${esc(a.date)}</div>
    </div>`).join('');
}

/* ── AOS ────────────────────────────────────────────────────── */
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

  await loadProfile();
  await Promise.all([
    loadSkills(),
    loadProjects(),
    loadCertificates(),
    loadAchievements(),
  ]);

  initAOS();
})();
