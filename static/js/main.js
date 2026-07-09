/* ============================================================
   PORTFOLIO — main.js  (Public Site)
   ============================================================ */

const API = {
  profile:      '/api/profile',
  skills:       '/api/skills',
  skillHistory: id => `/api/skill_history/${id}`,
  projects:     '/api/projects',
  certificates: '/api/certificates',
  achievements: '/api/achievements',
  blog:         '/api/blog',
  testimonials: '/api/testimonials',
  messages:     '/api/messages',
};

/* ── Helpers ────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const get = url => fetch(url).then(r => r.json());
const levelLabels = ['', 'Learning', 'Basic', 'Intermediate', 'Professional'];

function esc(str = '') {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/* ── Theme ──────────────────────────────────────────────────── */
function initTheme() {
  const saved = localStorage.getItem('portfolio-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  $('theme-icon').textContent = saved === 'dark' ? '☀️' : '🌙';
}

$('theme-toggle').addEventListener('click', () => {
  const curr = document.documentElement.getAttribute('data-theme');
  const next = curr === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('portfolio-theme', next);
  $('theme-icon').textContent = next === 'dark' ? '☀️' : '🌙';
});

/* ── Navbar scroll ──────────────────────────────────────────── */
window.addEventListener('scroll', () => {
  $('navbar').classList.toggle('scrolled', scrollY > 50);
  $('back-to-top').classList.toggle('visible', scrollY > 400);
  // Active nav link
  const sections = document.querySelectorAll('section[id]');
  let current = '';
  sections.forEach(s => {
    if (scrollY >= s.offsetTop - 120) current = s.id;
  });
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + current);
  });
});

$('back-to-top').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ── Mobile hamburger ───────────────────────────────────────── */
$('hamburger').addEventListener('click', () => {
  $('nav-links').classList.toggle('open');
});
document.querySelectorAll('.nav-links a').forEach(a => {
  a.addEventListener('click', () => $('nav-links').classList.remove('open'));
});

/* ── PROFILE ────────────────────────────────────────────────── */
async function loadProfile() {
  const p = await get(API.profile);
  if (!p || !p.name) return;

  // Meta / nav
  document.title = `${p.name} — Portfolio`;
  $('page-title').textContent = `${p.name} — Portfolio`;
  if ($('meta-desc')) $('meta-desc').setAttribute('content', p.bio || '');
  $('nav-logo').textContent = p.name.split(' ').map(w => w[0]).join('').slice(0,3);

  // Hero
  $('hero-name').textContent = p.name;
  $('hero-bio').textContent = p.bio || '';
  $('footer-name').textContent = p.name;

  // Profile photo
  if (p.profile_image) {
    const img = document.createElement('img');
    img.src = p.profile_image;
    img.className = 'hero-photo';
    img.alt = p.name;
    $('hero-photo').replaceWith(img);
  } else {
    $('hero-photo').textContent = p.name.split(' ').map(w => w[0]).join('').slice(0,2);
  }

  // Typed titles
  const titles = [
    p.title || 'Developer',
    'Problem Solver',
    'Open Source Enthusiast',
    'Full Stack Developer',
  ];
  if (window.Typed) {
    new Typed('#typed-el', {
      strings: titles,
      typeSpeed: 60,
      backSpeed: 40,
      backDelay: 1800,
      loop: true,
    });
  } else {
    $('typed-el').textContent = titles[0];
  }

  // Social links
  const socialLinks = [
    { key: 'github',     icon: '🐱', label: 'GitHub' },
    { key: 'linkedin',   icon: '💼', label: 'LinkedIn' },
    { key: 'leetcode',   icon: '💻', label: 'LeetCode' },
    { key: 'hackerrank', icon: '🟢', label: 'HackerRank' },
    { key: 'codeforces', icon: '🏆', label: 'Codeforces' },
  ];
  const socialHtml = socialLinks
    .filter(s => p[s.key])
    .map(s => `<a href="${esc(p[s.key])}" target="_blank" rel="noopener" class="social-link">${s.icon} ${s.label}</a>`)
    .join('');
  $('hero-social').innerHTML = socialHtml;
  $('footer-social').innerHTML = socialHtml;

  // Accent color
  if (p.accent_color) {
    document.documentElement.style.setProperty('--accent', p.accent_color);
  }

  // About section
  $('about-desc').textContent = p.about || p.bio || '';
  const infoItems = [
    { label: '🎓 College', value: p.college },
    { label: '📚 Course',  value: p.course },
    { label: '📅 Year',    value: p.year },
    { label: '📧 Email',   value: p.email },
    { label: '📞 Phone',   value: p.phone },
    { label: '📍 Location',value: p.location },
  ];
  $('about-info').innerHTML = infoItems
    .filter(i => i.value)
    .map(i => `<div class="about-info-item"><div class="label">${i.label}</div><div class="value">${esc(i.value)}</div></div>`)
    .join('');

  // Timeline (static learning journey built from profile)
  const timelineSteps = [
    { year: '2022', title: 'Started Coding', desc: 'Began learning programming with Python and HTML basics.' },
    { year: '2023', title: p.college || 'University', desc: `Enrolled in ${esc(p.course || 'Computer Science')}. Started building real projects.` },
    { year: '2024', title: 'First Web Projects', desc: 'Built full-stack web applications using Flask, HTML/CSS/JS.' },
    { year: '2025', title: 'Advanced Skills', desc: p.career_goal || 'Aiming for professional-level development and real-world impact.' },
  ];
  $('timeline').innerHTML = timelineSteps.map(s => `
    <div class="timeline-item">
      <div class="timeline-year">${s.year}</div>
      <div class="timeline-title">${s.title}</div>
      <div class="timeline-desc">${s.desc}</div>
    </div>`).join('');

  // Contact info
  const contactItems = [
    { icon: '📧', label: 'Email', value: p.email, href: `mailto:${p.email}` },
    { icon: '📞', label: 'Phone', value: p.phone, href: `tel:${p.phone}` },
    { icon: '📍', label: 'Location', value: p.location, href: null },
    { icon: '💼', label: 'LinkedIn', value: p.linkedin ? 'Connect on LinkedIn' : null, href: p.linkedin },
    { icon: '🐱', label: 'GitHub', value: p.github ? 'Follow on GitHub' : null, href: p.github },
  ];
  $('contact-info').innerHTML = contactItems
    .filter(c => c.value)
    .map(c => `
      <div class="contact-item">
        <div class="contact-icon">${c.icon}</div>
        <div>
          <div class="contact-detail">${c.label}</div>
          <div class="contact-value">
            ${c.href ? `<a href="${esc(c.href)}" target="_blank" rel="noopener" style="color:var(--text)">${esc(c.value)}</a>` : esc(c.value)}
          </div>
        </div>
      </div>`).join('');
}

/* ── SKILLS ─────────────────────────────────────────────────── */
let allSkills = [];
let skillHistoryChart = null;

async function loadSkills() {
  allSkills = await get(API.skills);
  const grid = $('skills-grid');
  if (!allSkills.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🔧</div><p>No skills added yet.</p></div>';
    return;
  }

  grid.innerHTML = allSkills.map(s => `
    <div class="skill-card" data-aos="fade-up">
      <div class="skill-icon" style="font-size: 2rem; margin-bottom: 0.5rem; min-height: 2.5rem; display: flex; align-items: center;">
        ${(s.icon && (s.icon.startsWith('/') || s.icon.startsWith('http'))) ? `<img src="${esc(s.icon)}" style="max-height: 2.5rem; max-width: 100%; object-fit: contain;">` : (s.icon ? esc(s.icon) : '⚡')}
      </div>
      <div class="skill-header">
        <span class="skill-name">${esc(s.name)}</span>
      </div>
      <span class="skill-level-badge level-${s.level}">${levelLabels[s.level] || 'Basic'}</span>
      ${s.description ? `<p class="skill-desc" style="font-size: 0.85rem; color: var(--text-2); margin-top: 0.75rem; line-height: 1.4;">${esc(s.description)}</p>` : ''}
    </div>`).join('');

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
  const categories = [...new Set(allProjects.flatMap(p => p.technologies.split(',').map(t => t.trim()).filter(Boolean)))];
  const categories2 = [...new Set(allProjects.map(p => p.category).filter(Boolean))];
  const all = [...new Set([...categories2, ...categories])].slice(0, 10);
  const container = $('project-filters');
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
  allBtn.addEventListener('click', () => {
    activeFilter = 'all';
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    allBtn.classList.add('active');
    renderProjects();
  });
}

function renderProjects() {
  const grid = $('projects-grid');
  let filtered = allProjects;

  if (activeFilter !== 'all') {
    filtered = filtered.filter(p =>
      p.category === activeFilter ||
      p.technologies.split(',').map(t=>t.trim()).includes(activeFilter)
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
    // Primary link: prefer GitHub, then Demo
    const primaryLink = p.github_link || p.demo_link || '';
    const primaryLabel = p.github_link ? '🐱 GitHub' : (p.demo_link ? '🚀 Live Demo' : '🔗 View Project');
    return `
      <div class="project-card-wrapper card">
        ${p.featured ? '<span class="project-featured-badge">⭐ Featured</span>' : ''}
        ${imgHtml}
        <div class="project-body">
          <div class="project-meta">
            <span class="tag">${esc(p.category)}</span>
            <span class="tag">${esc(p.difficulty)}</span>
          </div>
          <h3 class="project-title">
            ${primaryLink
              ? `<a href="${esc(primaryLink)}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;">${esc(p.title)}</a>`
              : esc(p.title)}
          </h3>
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



$('project-search').addEventListener('input', e => {
  searchQuery = e.target.value;
  renderProjects();
});

/* ── CERTIFICATES ───────────────────────────────────────────── */
async function loadCertificates() {
  const certs = await get(API.certificates);
  const grid = $('certs-grid');
  if (!certs.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🎓</div><p>No certificates added yet.</p></div>';
    return;
  }
  grid.innerHTML = certs.map(c => {
    const hasImage = c.image && !c.image.toLowerCase().endsWith('.pdf');
    const hasFile  = c.file_path || c.image;

    // Preview always opens lightbox if image exists, else opens verify_link URL
    let previewBtn = '';
    if (hasImage) {
      previewBtn = `<button class="btn btn-outline btn-sm" onclick="openLightbox('${esc(c.image)}','${esc(c.name)}')">👁 Preview</button>`;
    } else if (c.verify_link) {
      previewBtn = `<a href="${esc(c.verify_link)}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">👁 Preview</a>`;
    } else if (c.file_path) {
      previewBtn = `<a href="/certificates/${c.id}/preview" target="_blank" class="btn btn-outline btn-sm">👁 Preview</a>`;
    } else {
      previewBtn = `<button class="btn btn-outline btn-sm" style="opacity:.4;cursor:default" disabled>👁 Preview</button>`;
    }

    return `
    <div class="card cert-card" data-aos="fade-up">
      <div class="cert-img-wrap" style="cursor:${hasImage ? 'pointer' : 'default'}"
           onclick="${hasImage ? `openLightbox('${esc(c.image)}','${esc(c.name)}')` : 'void(0)'}">
        ${hasImage
          ? `<img src="${esc(c.image)}" alt="${esc(c.name)}" style="width:100%;height:100%;object-fit:contain;background:#fff;padding:4px;" loading="lazy" />`
          : '<span style="font-size:3rem">🏅</span>'}
      </div>
      <div class="cert-body">
        <div class="cert-org">${esc(c.organization)}</div>
        <div class="cert-name">${esc(c.name)}</div>
        <div class="cert-date">${esc(c.date)}</div>
        <div class="cert-actions" style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.75rem">
          ${previewBtn}
        </div>
      </div>
    </div>`;
  }).join('');
}

function openLightbox(src, name) {
  if (!src) return;
  const img = $('lightbox-img');
  img.src = '';
  img.alt = name || 'Certificate';
  img.src = src;
  $('lightbox').classList.add('open');
}
$('lightbox-close').addEventListener('click', () => $('lightbox').classList.remove('open'));
$('lightbox').addEventListener('click', e => { if (e.target === $('lightbox')) $('lightbox').classList.remove('open'); });

/* ── ACHIEVEMENTS ───────────────────────────────────────────── */
async function loadAchievements() {
  const ach = await get(API.achievements);
  const grid = $('achievements-grid');
  if (!ach.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🏆</div><p>No achievements added yet.</p></div>';
    return;
  }
  grid.innerHTML = ach.map(a => `
    <div class="card ach-card" data-aos="zoom-in">
      <div class="ach-icon">${esc(a.icon)}</div>
      <div class="ach-title">${esc(a.title)}</div>
      <div class="ach-desc">${esc(a.description)}</div>
      <div class="ach-date">${esc(a.date)}</div>
    </div>`).join('');
}

/* ── BLOG ───────────────────────────────────────────────────── */
async function loadBlog() {
  const posts = await get(API.blog);
  const grid = $('blog-grid');
  if (!posts.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><p>No blog posts yet.</p></div>';
    return;
  }
  grid.innerHTML = posts.map(p => {
    const tags = p.tags ? p.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const date = p.publish_date ? p.publish_date.slice(0,10) : '';
    return `
      <div class="card blog-card" data-aos="fade-up">
        <div class="blog-img">${p.cover_image ? `<img src="${esc(p.cover_image)}" alt="${esc(p.title)}" style="width:100%;height:100%;object-fit:cover;" />` : '📝'}</div>
        <div class="blog-body">
          <div class="blog-tags">${tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
          <h3 class="blog-title">${esc(p.title)}</h3>
          <p class="blog-summary">${esc(p.summary || '')}</p>
          <div class="blog-footer">
            <span class="blog-date">📅 ${date}</span>
            <a href="/blog/${p.id}" class="blog-read-more btn btn-primary btn-sm">Read More →</a>
          </div>
        </div>
      </div>`;
  }).join('');
}

/* ── TESTIMONIALS ───────────────────────────────────────────── */
let testimonials = [];
let carouselIdx = 0;

async function loadTestimonials() {
  testimonials = await get(API.testimonials);
  if (!testimonials.length) {
    document.getElementById('testimonials').style.display = 'none';
    return;
  }
  const track = $('testimonials-track');
  track.innerHTML = testimonials.map(t => {
    const initials = t.name.split(' ').map(w=>w[0]).join('').slice(0,2);
    return `
      <div class="testimonial-slide">
        <div class="card testimonial-card">
          <div class="testimonial-avatar">${t.avatar ? `<img src="${esc(t.avatar)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />` : initials}</div>
          <div class="testimonial-stars">${'⭐'.repeat(Math.min(t.rating||5, 5))}</div>
          <p class="testimonial-content">"${esc(t.content)}"</p>
          <div class="testimonial-name">${esc(t.name)}</div>
          <div class="testimonial-role">${esc(t.role)} ${t.organization ? '@ ' + esc(t.organization) : ''}</div>
        </div>
      </div>`;
  }).join('');

  // Dots
  $('carousel-dots').innerHTML = testimonials.map((_, i) =>
    `<div class="carousel-dot ${i===0?'active':''}" data-idx="${i}" onclick="goToSlide(${i})"></div>`
  ).join('');

  $('carousel-prev').addEventListener('click', () => goToSlide(carouselIdx - 1));
  $('carousel-next').addEventListener('click', () => goToSlide(carouselIdx + 1));

  // Auto-play
  setInterval(() => goToSlide(carouselIdx + 1), 5000);
}

function goToSlide(idx) {
  carouselIdx = ((idx % testimonials.length) + testimonials.length) % testimonials.length;
  $('testimonials-track').style.transform = `translateX(-${carouselIdx * 100}%)`;
  document.querySelectorAll('.carousel-dot').forEach((d, i) => d.classList.toggle('active', i === carouselIdx));
}

/* ── CONTACT FORM ───────────────────────────────────────────── */
$('contact-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('contact-submit');
  const msg = $('form-msg');
  btn.disabled = true;
  btn.textContent = 'Sending…';
  msg.style.display = 'none';

  try {
    const res = await fetch(API.messages, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:    $('contact-name').value,
        email:   $('contact-email').value,
        message: $('contact-msg').value,
      })
    });
    const data = await res.json();
    if (data.success) {
      msg.className = 'form-msg success';
      msg.textContent = '✅ ' + data.message;
      msg.style.display = 'block';
      $('contact-form').reset();
    } else {
      throw new Error(data.error || 'Error');
    }
  } catch (err) {
    msg.className = 'form-msg error';
    msg.textContent = '❌ ' + (err.message || 'Failed to send. Please try again.');
    msg.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = '✉ Send Message';
  }
});

/* ── REVIEW FORM ────────────────────────────────────────────── */
$('review-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('review-submit');
  const msg = $('review-form-msg');
  btn.disabled = true;
  btn.textContent = 'Submitting…';
  msg.style.display = 'none';

  try {
    const res = await fetch(API.testimonials, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:         $('review-name').value,
        role:         $('review-role').value,
        rating:       $('review-rating').value,
        content:      $('review-msg').value,
        organization: '',
        avatar:       ''
      })
    });
    const data = await res.json();
    if (data.success) {
      msg.className = 'form-msg success';
      msg.textContent = '✅ Review submitted successfully!';
      msg.style.display = 'block';
      $('review-form').reset();
      // Reload testimonials to show the new review instantly
      await loadTestimonials();
      document.getElementById('testimonials').style.display = 'block';
    } else {
      throw new Error(data.error || 'Error');
    }
  } catch (err) {
    msg.className = 'form-msg error';
    msg.textContent = '❌ ' + (err.message || 'Failed to submit. Please try again.');
    msg.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit Review';
  }
});


/* ── AOS ────────────────────────────────────────────────────── */
function initAOS() {
  if (window.AOS) {
    AOS.init({ duration: 700, once: true, offset: 80 });
  } else {
    // Fallback — reveal all immediately
    document.querySelectorAll('[data-aos]').forEach(el => el.classList.add('aos-animate'));
  }
}

/* ── INIT ───────────────────────────────────────────────────── */
(async function init() {
  initTheme();

  await loadProfile();
  // Load all sections in parallel
  await Promise.all([
    loadSkills(),
    loadProjects(),
    loadCertificates(),
    loadAchievements(),
    loadTestimonials(),
  ]);

  initAOS();
})();
