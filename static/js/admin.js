/* ============================================================
   PORTFOLIO ADMIN — admin.js
   ============================================================ */

const API = {
  profile:      '/api/profile',
  skills:       '/api/skills',
  skillFn: id => `/api/skills/${id}`,
  projects:     '/api/projects',
  projFn: id  => `/api/projects/${id}`,
  certs:        '/api/certificates',
  certFn: id  => `/api/certificates/${id}`,
  achievements: '/api/achievements',
  achFn: id   => `/api/achievements/${id}`,
  testimonials: '/api/testimonials',
  testFn: id  => `/api/testimonials/${id}`,
  messages:     '/api/messages',
  msgRead: id => `/api/messages/${id}/read`,
  msgDel:  id => `/api/messages/${id}`,
  analytics:    '/api/analytics',
  activityLog:  '/api/activity_log',
  password:     '/api/settings/password',
  uploadProfile: '/api/upload/profile',
  uploadResume:  '/api/upload/resume',
  uploadCert:    '/api/upload/certificate',
  uploadProject: '/api/upload/project',
};

const $ = id => document.getElementById(id);
const esc = s => { const d = document.createElement('div'); d.textContent = String(s||''); return d.innerHTML; };
const post  = (url,data)  => fetch(url,{method:'POST',  headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(r=>r.json());
const put   = (url,data)  => fetch(url,{method:'PUT',   headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(r=>r.json());
const del   = url         => fetch(url,{method:'DELETE'}).then(r=>r.json());
const get   = url         => fetch(url).then(r=>r.json());
const levelLabels = ['','Learning','Basic','Intermediate','Professional'];

let analyticsChartRef = null;
let overviewChartRef  = null;
let quillEditor = null;

/* ── Global alert ─────────────────────────────────────────── */
function showAlert(msg, type='success', targetId='alert-global'){
  const el = $(targetId);
  if(!el) return;
  el.className = `alert alert-${type} show`;
  el.textContent = (type==='success'?'✅ ':'⚠️ ') + msg;
  setTimeout(()=>{ el.className='alert'; }, 4000);
}

/* ── Modals ───────────────────────────────────────────────── */
function openModal(id){ $(id).classList.add('open'); }
function closeModal(id){ $(id).classList.remove('open'); }

document.querySelectorAll('[data-close]').forEach(btn=>{
  btn.addEventListener('click', ()=> closeModal(btn.dataset.close));
});
document.querySelectorAll('.modal-overlay').forEach(ov=>{
  ov.addEventListener('click', e=>{ if(e.target===ov) ov.classList.remove('open'); });
});

/* ── Sidebar panel switching ─────────────────────────────── */
const panels = {
  overview:     'Overview',
  profile:      'Profile',
  skills:       'Skills',
  projects:     'Projects',
  certs:        'Certificates',
  achievements: 'Achievements',
  testimonials: 'Testimonials',
  messages:     'Messages',
  analytics:    'Analytics',
  resume:       'Resume',
  activity:     'Activity Log',
  settings:     'Settings',
};

function switchPanel(name){
  document.querySelectorAll('.sidebar-item').forEach(i=>i.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  const item = document.querySelector(`.sidebar-item[data-panel="${name}"]`);
  if(item) item.classList.add('active');
  const panel = $(`panel-${name}`);
  if(panel) panel.classList.add('active');
  $('topbar-title').textContent = panels[name] || name;
  // Lazy-load panel data
  if(name==='analytics')    loadAnalytics();
  if(name==='activity')     loadActivityLog();
  if(name==='messages')     loadMessages();
  // Close mobile sidebar
  $('sidebar').classList.remove('open');
}

document.querySelectorAll('.sidebar-item').forEach(item=>{
  item.addEventListener('click', ()=> switchPanel(item.dataset.panel));
});

// Mobile hamburger
$('menu-btn').addEventListener('click', ()=> $('sidebar').classList.toggle('open'));

/* ══════════════════════════════════════════════════════════════
   OVERVIEW / ANALYTICS CHARTS
══════════════════════════════════════════════════════════════ */
async function loadOverview(){
  const data = await get(API.analytics);
  // Stats
  $('stat-visits').textContent   = data.total_visits ?? 0;
  $('stat-projects').textContent = data.projects ?? 0;
  $('stat-skills').textContent   = data.skills ?? 0;
  $('stat-messages').textContent = data.messages ?? 0;
  $('stat-certs').textContent    = data.certificates ?? 0;

  // Unread badge
  if(data.unread_messages > 0){
    const badge = $('msg-badge');
    badge.textContent = data.unread_messages;
    badge.style.display = 'inline-flex';
  }

  // Chart
  const labels = data.daily.map(d=>d.visit_date);
  const visits = data.daily.map(d=>d.visits);
  const ctx = $('overviewChart').getContext('2d');
  if(overviewChartRef) overviewChartRef.destroy();
  overviewChartRef = new Chart(ctx,{
    type:'bar',
    data:{labels,datasets:[{label:'Visits',data:visits,backgroundColor:'rgba(108,99,255,0.6)',borderColor:'#6c63ff',borderWidth:1.5,borderRadius:4}]},
    options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{ticks:{color:'#a0a0c8'},grid:{color:'rgba(160,160,200,0.1)'}},x:{ticks:{color:'#a0a0c8',maxRotation:45},grid:{display:false}}}}
  });
}

async function loadAnalytics(){
  const data = await get(API.analytics);
  const as = $('analytics-stats');
  as.innerHTML = `
    <div class="stat-card"><div class="stat-icon purple">👁️</div><div><div class="stat-num">${data.total_visits}</div><div class="stat-label">Total Visits</div></div></div>
    <div class="stat-card"><div class="stat-icon pink">📬</div><div><div class="stat-num">${data.messages}</div><div class="stat-label">Messages</div></div></div>
    <div class="stat-card"><div class="stat-icon blue">📬</div><div><div class="stat-num">${data.unread_messages}</div><div class="stat-label">Unread</div></div></div>
  `;
  const labels = data.daily.map(d=>d.visit_date);
  const visits = data.daily.map(d=>d.visits);
  const ctx = $('analyticsChart').getContext('2d');
  if(analyticsChartRef) analyticsChartRef.destroy();
  analyticsChartRef = new Chart(ctx,{
    type:'line',
    data:{labels,datasets:[{label:'Daily Visits',data:visits,borderColor:'#6c63ff',backgroundColor:'rgba(108,99,255,0.1)',fill:true,tension:0.4,pointBackgroundColor:'#6c63ff',pointRadius:4,borderWidth:2}]},
    options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{ticks:{color:'#a0a0c8'},grid:{color:'rgba(160,160,200,0.1)'}},x:{ticks:{color:'#a0a0c8',maxRotation:45},grid:{display:false}}}}
  });
  // Top pages
  const tp = $('top-pages-list');
  tp.innerHTML = data.top_pages.map(p=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:.5rem 0;border-bottom:1px solid var(--border)">
      <span style="font-size:.88rem">${esc(p.page)}</span>
      <span style="font-weight:700;color:var(--accent)">${p.visits}</span>
    </div>`).join('');
}

/* ══════════════════════════════════════════════════════════════
   PROFILE
══════════════════════════════════════════════════════════════ */
async function loadProfile(){
  const p = await get(API.profile);
  if(!p) return;
  const fields = [
    ['name','pf-name'],['title','pf-title'],['bio','pf-bio'],['about','pf-about'],
    ['college','pf-college'],['course','pf-course'],['year','pf-year'],
    ['career_goal','pf-goal'],['interests','pf-interests'],
    ['email','pf-email'],['phone','pf-phone'],['location','pf-location'],
    ['github','pf-github'],['linkedin','pf-linkedin'],['leetcode','pf-leetcode'],
    ['hackerrank','pf-hackerrank'],['codeforces','pf-codeforces'],
  ];
  fields.forEach(([key,id])=>{ const el=$(id); if(el) el.value=p[key]||''; });
  if(p.profile_image){
    const preview = $('profile-photo-preview');
    preview.innerHTML = `<img src="${esc(p.profile_image)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />`;
  }
  if(p.accent_color) $('theme-color').value = p.accent_color;
  if(p.font_style)   $('theme-font').value  = p.font_style;
}

$('profile-form').addEventListener('submit', async e=>{
  e.preventDefault();
  const data = {
    name:$('pf-name').value, title:$('pf-title').value,
    bio:$('pf-bio').value, about:$('pf-about').value,
    college:$('pf-college').value, course:$('pf-course').value,
    year:$('pf-year').value, career_goal:$('pf-goal').value,
    interests:$('pf-interests').value, email:$('pf-email').value,
    phone:$('pf-phone').value, location:$('pf-location').value,
    github:$('pf-github').value, linkedin:$('pf-linkedin').value,
    leetcode:$('pf-leetcode').value, hackerrank:$('pf-hackerrank').value,
    codeforces:$('pf-codeforces').value,
  };
  const res = await post(API.profile, data);
  showAlert(res.success ? 'Profile saved!' : (res.error||'Error'), res.success?'success':'danger');
});

// Profile photo upload
$('profile-photo-input').addEventListener('change', async function(){
  if(!this.files[0]) return;
  const fd = new FormData();
  fd.append('file', this.files[0]);
  const res = await fetch(API.uploadProfile,{method:'POST',body:fd}).then(r=>r.json());
  if(res.success){
    $('profile-photo-preview').innerHTML = `<img src="${esc(res.path)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />`;
    showAlert('Photo updated!');
  } else { showAlert(res.error||'Upload failed','danger'); }
});

/* ══════════════════════════════════════════════════════════════
   SKILLS
══════════════════════════════════════════════════════════════ */
async function loadSkills(){
  const skills = await get(API.skills);
  const grid = $('skills-admin-grid');
  if(!skills.length){ grid.innerHTML='<p style="color:var(--text-2)">No skills yet. Add your first skill!</p>'; return; }
  grid.innerHTML = skills.map(s=>`
    <div class="entity-card">
      <div class="entity-card-header">
        <div>
          <div class="entity-card-title">
            ${(s.icon && (s.icon.startsWith('/') || s.icon.startsWith('http'))) ? `<img src="${esc(s.icon)}" style="height:1.2rem;vertical-align:text-bottom;margin-right:0.3rem">` : (s.icon ? esc(s.icon) + ' ' : '')}${esc(s.name)}
          </div>
          <div class="entity-card-meta">${esc(s.category)} · <span style="color:var(--accent)">${levelLabels[s.level]}</span></div>
          ${s.description ? `<div style="font-size:0.75rem; color:var(--text-2); margin-top:2px;">${esc(s.description)}</div>` : ''}
        </div>
        <div class="table-actions">
          <button class="btn btn-secondary btn-sm btn-icon" onclick="editSkill(${s.id})" title="Edit">✏️</button>
          <button class="btn btn-danger btn-sm btn-icon"    onclick="deleteSkill(${s.id},'${esc(s.name)}')" title="Delete">🗑️</button>
        </div>
      </div>
    </div>`).join('');
}

// Keep cached skills for edit lookup
let cachedSkills = [];
$('add-skill-btn').addEventListener('click', ()=>{
  $('skill-modal-title').textContent = 'Add Skill';
  $('skill-id').value='';
  $('sk-name').value='';$('sk-cat').value='';$('sk-level').value='2';
  $('sk-icon').value='';$('sk-desc').value='';
  $('sk-img-preview').style.display='none';
  $('sk-pct').value=50;$('sk-pct-label').textContent=50;$('sk-pct-show').textContent='50%';
  $('sk-note').value='';
  openModal('skill-modal');
});

async function editSkill(id){
  const skills = await get(API.skills);
  const s = skills.find(sk=>sk.id===id);
  if(!s) return;
  $('skill-modal-title').textContent='Edit Skill';
  $('skill-id').value=id;
  $('sk-name').value=s.name;$('sk-cat').value=s.category||'';
  $('sk-icon').value=s.icon||'';$('sk-desc').value=s.description||'';
  if (s.icon && (s.icon.startsWith('/') || s.icon.startsWith('http'))) {
      $('sk-img-preview').src = s.icon;
      $('sk-img-preview').style.display = 'block';
  } else {
      $('sk-img-preview').style.display = 'none';
  }
  $('sk-level').value=s.level;
  $('sk-pct').value=s.percentage;
  $('sk-pct-label').textContent=s.percentage;
  $('sk-pct-show').textContent=s.percentage+'%';
  $('sk-note').value='';
  openModal('skill-modal');
}

$('sk-pct').addEventListener('input', function(){ $('sk-pct-show').textContent=this.value+'%'; });

$('sk-img-file').addEventListener('change', async function(){
  if(!this.files[0]) return;
  const fd=new FormData(); fd.append('file',this.files[0]);
  const res=await fetch('/api/upload/skill',{method:'POST',body:fd}).then(r=>r.json());
  if(res.success){ $('sk-icon').value=res.path;$('sk-img-preview').src=res.path;$('sk-img-preview').style.display='block'; }
});

$('sk-icon').addEventListener('input', function(){
    if(this.value && (this.value.startsWith('/') || this.value.startsWith('http'))){
        $('sk-img-preview').src=this.value;
        $('sk-img-preview').style.display='block';
    } else {
        $('sk-img-preview').style.display='none';
    }
});

$('skill-form').addEventListener('submit', async e=>{
  e.preventDefault();
  const id = $('skill-id').value;
  const data = { name:$('sk-name').value, category:$('sk-cat').value, description:$('sk-desc').value, icon:$('sk-icon').value, level:+$('sk-level').value, percentage:+$('sk-pct').value, note:$('sk-note').value };
  const res = id ? await put(API.skillFn(id),data) : await post(API.skills,data);
  if(res.success){ closeModal('skill-modal'); loadSkills(); showAlert('Skill saved!'); }
  else showAlert(res.error||'Error','danger');
});

async function deleteSkill(id, name){
  if(!confirm(`Delete skill "${name}"?`)) return;
  const res = await del(API.skillFn(id));
  if(res.success){ loadSkills(); showAlert('Skill deleted.'); }
  else showAlert('Error','danger');
}

/* ══════════════════════════════════════════════════════════════
   PROJECTS
══════════════════════════════════════════════════════════════ */
async function loadProjects(){
  const projects = await get(API.projects);
  const grid = $('projects-admin-grid');
  if(!projects.length){ grid.innerHTML='<p style="color:var(--text-2)">No projects yet.</p>'; return; }
  grid.innerHTML = projects.map(p=>`
    <div class="entity-card">
      <div class="entity-card-header">
        <div>
          <div class="entity-card-title">${esc(p.title)} ${p.featured?'⭐':''}</div>
          <div class="entity-card-meta">${esc(p.category)} · ${esc(p.difficulty)}</div>
        </div>
        <div class="table-actions">
          <button class="btn btn-secondary btn-sm btn-icon" onclick="editProject(${p.id})">✏️</button>
          <button class="btn btn-danger btn-sm btn-icon"    onclick="deleteProject(${p.id},'${esc(p.title)}')">🗑️</button>
        </div>
      </div>
      <div style="font-size:.82rem;color:var(--text-2);margin-bottom:.5rem">${esc((p.description||'').slice(0,80))}${(p.description||'').length>80?'…':''}</div>
      <div style="display:flex;flex-wrap:wrap;gap:.3rem">
        ${p.technologies.split(',').map(t=>t.trim()).filter(Boolean).map(t=>`<span style="font-size:.7rem;padding:.15rem .5rem;background:rgba(108,99,255,.15);color:#a78bfa;border-radius:50px">${esc(t)}</span>`).join('')}
      </div>
    </div>`).join('');
}

$('add-project-btn').addEventListener('click', ()=>{
  $('project-modal-title').textContent='Add Project';
  $('project-id').value='';
  ['pj-title','pj-desc','pj-tech','pj-cat','pj-github','pj-demo','pj-video','pj-img'].forEach(id=>{const el=$(id);if(el)el.value='';});
  $('pj-featured').checked=false;$('pj-diff').value='Intermediate';
  $('pj-img-preview').style.display='none';
  openModal('project-modal');
});

async function editProject(id){
  const projs = await get(API.projects);
  const p = projs.find(x=>x.id===id);
  if(!p) return;
  $('project-modal-title').textContent='Edit Project';
  $('project-id').value=id;
  $('pj-title').value=p.title;$('pj-desc').value=p.description||'';
  $('pj-tech').value=p.technologies;$('pj-cat').value=p.category||'';
  $('pj-diff').value=p.difficulty||'Intermediate';
  $('pj-featured').checked=!!p.featured;
  $('pj-github').value=p.github_link||'';$('pj-demo').value=p.demo_link||'';
  $('pj-video').value=p.video_link||'';$('pj-img').value=p.image||'';
  if(p.image){ $('pj-img-preview').src=p.image;$('pj-img-preview').style.display='block'; }
  else $('pj-img-preview').style.display='none';
  openModal('project-modal');
}

$('pj-img-file').addEventListener('change', async function(){
  if(!this.files[0]) return;
  const fd=new FormData(); fd.append('file',this.files[0]);
  const res=await fetch(API.uploadProject,{method:'POST',body:fd}).then(r=>r.json());
  if(res.success){ $('pj-img').value=res.path;$('pj-img-preview').src=res.path;$('pj-img-preview').style.display='block'; }
});

$('pj-img').addEventListener('input', function(){ if(this.value){$('pj-img-preview').src=this.value;$('pj-img-preview').style.display='block';}else{$('pj-img-preview').style.display='none';} });

$('project-form').addEventListener('submit', async e=>{
  e.preventDefault();
  const id=$('project-id').value;
  const data={title:$('pj-title').value,description:$('pj-desc').value,technologies:$('pj-tech').value,
    category:$('pj-cat').value,difficulty:$('pj-diff').value,featured:$('pj-featured').checked?1:0,
    github_link:$('pj-github').value,demo_link:$('pj-demo').value,video_link:$('pj-video').value,image:$('pj-img').value};
  const res=id ? await put(API.projFn(id),data) : await post(API.projects,data);
  if(res.success){closeModal('project-modal');loadProjects();showAlert('Project saved!');}
  else showAlert(res.error||'Error','danger');
});

async function deleteProject(id,name){
  if(!confirm(`Delete project "${name}"?`)) return;
  const res=await del(API.projFn(id));
  if(res.success){loadProjects();showAlert('Project deleted.');}
}

/* ══════════════════════════════════════════════════════════════
   CERTIFICATES
══════════════════════════════════════════════════════════════ */
async function loadCerts(){
  const certs = await get(API.certs);
  const grid = $('certs-admin-grid');
  if(!certs.length){grid.innerHTML='<p style="color:var(--text-2)">No certificates yet.</p>';return;}
  grid.innerHTML=certs.map(c=>`
    <div class="entity-card">
      <div class="entity-card-header">
        <div>
          <div class="entity-card-title">${esc(c.name)}</div>
          <div class="entity-card-meta">${esc(c.organization)} · ${esc(c.date)}</div>
        </div>
        <div class="table-actions">
          <button class="btn btn-secondary btn-sm btn-icon" onclick="editCert(${c.id})">✏️</button>
          <button class="btn btn-danger btn-sm btn-icon"    onclick="deleteCert(${c.id},'${esc(c.name)}')">🗑️</button>
        </div>
      </div>
      ${c.verify_link?`<a href="${esc(c.verify_link)}" target="_blank" style="font-size:.78rem;color:var(--accent)">🔗 Verify</a>`:''}
    </div>`).join('');
}

$('add-cert-btn').addEventListener('click',()=>{
  $('cert-modal-title').textContent='Add Certificate';
  $('cert-id').value='';
  ['ct-name','ct-org','ct-date','ct-verify','ct-img'].forEach(id=>{const el=$(id);if(el)el.value='';});
  openModal('cert-modal');
});

async function editCert(id){
  const certs=await get(API.certs);
  const c=certs.find(x=>x.id===id);if(!c)return;
  $('cert-modal-title').textContent='Edit Certificate';
  $('cert-id').value=id;
  $('ct-name').value=c.name;$('ct-org').value=c.organization||'';
  $('ct-date').value=c.date||'';$('ct-verify').value=c.verify_link||'';
  $('ct-img').value=c.image||'';
  openModal('cert-modal');
}

$('ct-img-file').addEventListener('change',async function(){
  if(!this.files[0])return;
  const fd=new FormData();fd.append('file',this.files[0]);
  const res=await fetch(API.uploadCert,{method:'POST',body:fd}).then(r=>r.json());
  if(res.success){$('ct-img').value=res.path;}
});

$('cert-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const id=$('cert-id').value;
  const data={name:$('ct-name').value,organization:$('ct-org').value,date:$('ct-date').value,verify_link:$('ct-verify').value,image:$('ct-img').value};
  const res=id?await put(API.certFn(id),data):await post(API.certs,data);
  if(res.success){closeModal('cert-modal');loadCerts();showAlert('Certificate saved!');}
  else showAlert(res.error||'Error','danger');
});

async function deleteCert(id,name){
  if(!confirm(`Delete certificate "${name}"?`))return;
  const res=await del(API.certFn(id));
  if(res.success){loadCerts();showAlert('Certificate deleted.');}
}

/* ══════════════════════════════════════════════════════════════
   ACHIEVEMENTS
══════════════════════════════════════════════════════════════ */
async function loadAchievements(){
  const ach=await get(API.achievements);
  const grid=$('ach-admin-grid');
  if(!ach.length){grid.innerHTML='<p style="color:var(--text-2)">No achievements yet.</p>';return;}
  grid.innerHTML=ach.map(a=>`
    <div class="entity-card">
      <div class="entity-card-header">
        <div>
          <div class="entity-card-title">${esc(a.icon)} ${esc(a.title)}</div>
          <div class="entity-card-meta">${esc(a.category)} · ${esc(a.date)}</div>
        </div>
        <div class="table-actions">
          <button class="btn btn-secondary btn-sm btn-icon" onclick="editAch(${a.id})">✏️</button>
          <button class="btn btn-danger btn-sm btn-icon"    onclick="deleteAch(${a.id},'${esc(a.title)}')">🗑️</button>
        </div>
      </div>
      <div style="font-size:.82rem;color:var(--text-2)">${esc(a.description)}</div>
    </div>`).join('');
}

$('add-ach-btn').addEventListener('click',()=>{
  $('ach-modal-title').textContent='Add Achievement';
  $('ach-id').value='';
  ['ac-title','ac-icon','ac-desc','ac-date','ac-cat'].forEach(id=>{const el=$(id);if(el)el.value='';});
  $('ac-icon').value='🏆';
  openModal('ach-modal');
});

async function editAch(id){
  const ach=await get(API.achievements);
  const a=ach.find(x=>x.id===id);if(!a)return;
  $('ach-modal-title').textContent='Edit Achievement';
  $('ach-id').value=id;
  $('ac-title').value=a.title;$('ac-icon').value=a.icon||'🏆';
  $('ac-desc').value=a.description||'';$('ac-date').value=a.date||'';
  $('ac-cat').value=a.category||'';
  openModal('ach-modal');
}

$('ach-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const id=$('ach-id').value;
  const data={title:$('ac-title').value,icon:$('ac-icon').value,description:$('ac-desc').value,date:$('ac-date').value,category:$('ac-cat').value};
  const res=id?await put(API.achFn(id),data):await post(API.achievements,data);
  if(res.success){closeModal('ach-modal');loadAchievements();showAlert('Achievement saved!');}
  else showAlert(res.error||'Error','danger');
});

async function deleteAch(id,name){
  if(!confirm(`Delete "${name}"?`))return;
  const res=await del(API.achFn(id));
  if(res.success){loadAchievements();showAlert('Deleted.');}
}

/* ══════════════════════════════════════════════════════════════
   TESTIMONIALS
══════════════════════════════════════════════════════════════ */
async function loadTestimonials(){
  const tests=await get(API.testimonials);
  const grid=$('test-admin-grid');
  if(!tests.length){grid.innerHTML='<p style="color:var(--text-2)">No testimonials yet.</p>';return;}
  grid.innerHTML=tests.map(t=>`
    <div class="entity-card">
      <div class="entity-card-header">
        <div>
          <div class="entity-card-title">${esc(t.name)} ${'⭐'.repeat(t.rating||5)}</div>
          <div class="entity-card-meta">${esc(t.role)} @ ${esc(t.organization)}</div>
        </div>
        <div class="table-actions">
          <button class="btn btn-secondary btn-sm btn-icon" onclick="editTest(${t.id})">✏️</button>
          <button class="btn btn-danger btn-sm btn-icon"    onclick="deleteTest(${t.id},'${esc(t.name)}')">🗑️</button>
        </div>
      </div>
      <div style="font-size:.82rem;color:var(--text-2);font-style:italic">"${esc((t.content||'').slice(0,80))}${(t.content||'').length>80?'…':''}"</div>
    </div>`).join('');
}

$('add-test-btn').addEventListener('click',()=>{
  $('test-modal-title').textContent='Add Testimonial';
  $('test-id').value='';
  ['ts-name','ts-role','ts-org','ts-content'].forEach(id=>{const el=$(id);if(el)el.value='';});
  $('ts-rating').value='5';
  openModal('test-modal');
});

async function editTest(id){
  const tests=await get(API.testimonials);
  const t=tests.find(x=>x.id===id);if(!t)return;
  $('test-modal-title').textContent='Edit Testimonial';
  $('test-id').value=id;
  $('ts-name').value=t.name;$('ts-role').value=t.role||'';
  $('ts-org').value=t.organization||'';$('ts-content').value=t.content||'';
  $('ts-rating').value=t.rating||5;
  openModal('test-modal');
}

$('test-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const id=$('test-id').value;
  const data={name:$('ts-name').value,role:$('ts-role').value,organization:$('ts-org').value,content:$('ts-content').value,rating:+$('ts-rating').value};
  const res=id?await put(API.testFn(id),data):await post(API.testimonials,data);
  if(res.success){closeModal('test-modal');loadTestimonials();showAlert('Testimonial saved!');}
  else showAlert(res.error||'Error','danger');
});

async function deleteTest(id,name){
  if(!confirm(`Delete testimonial from "${name}"?`))return;
  const res=await del(API.testFn(id));
  if(res.success){loadTestimonials();showAlert('Deleted.');}
}

/* ══════════════════════════════════════════════════════════════
   MESSAGES
══════════════════════════════════════════════════════════════ */
async function loadMessages(){
  const msgs=await get(API.messages);
  const list=$('messages-list');
  if(!msgs.length){list.innerHTML='<div class="admin-card" style="color:var(--text-2);text-align:center;padding:3rem">📬 No messages yet.</div>';return;}
  list.innerHTML=msgs.map(m=>`
    <div class="msg-card ${!m.read?'unread':''}">
      <div class="msg-header">
        <div>
          <div class="msg-sender">${esc(m.name)}</div>
          <div class="msg-email"><a href="mailto:${esc(m.email)}" style="color:var(--accent)">${esc(m.email)}</a></div>
        </div>
        <div style="text-align:right">
          <div class="msg-date">${m.date?m.date.slice(0,10):''}</div>
          <div class="table-actions" style="margin-top:.4rem">
            ${!m.read?`<button class="btn btn-success btn-sm btn-icon" onclick="markRead(${m.id})" title="Mark Read">✔</button>`:''}
            <button class="btn btn-danger btn-sm btn-icon" onclick="deleteMsg(${m.id})" title="Delete">🗑️</button>
          </div>
        </div>
      </div>
      <div class="msg-body">${esc(m.message)}</div>
    </div>`).join('');
}

async function markRead(id){
  await post(API.msgRead(id),{});
  loadMessages();
}

async function deleteMsg(id){
  if(!confirm('Delete this message?'))return;
  await del(API.msgDel(id));
  loadMessages();
}

/* ══════════════════════════════════════════════════════════════
   ACTIVITY LOG
══════════════════════════════════════════════════════════════ */
async function loadActivityLog(){
  const logs=await get(API.activityLog);
  const tbody=$('activity-table-body');
  if(!logs.length){tbody.innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--text-2)">No activity logged yet.</td></tr>';return;}
  tbody.innerHTML=logs.map((l,i)=>`
    <tr class="log-row">
      <td style="color:var(--text-2);font-size:.75rem">${logs.length-i}</td>
      <td class="log-action">${esc(l.action)}</td>
      <td class="log-details">${esc(l.details)}</td>
      <td style="color:var(--text-2);font-size:.78rem">${l.timestamp?l.timestamp.slice(0,19).replace('T',' '):''}</td>
    </tr>`).join('');
}

/* ══════════════════════════════════════════════════════════════
   RESUME UPLOAD
══════════════════════════════════════════════════════════════ */
$('resume-file-input').addEventListener('change',async function(){
  if(!this.files[0])return;
  const fd=new FormData();fd.append('file',this.files[0]);
  const status=$('resume-status');
  status.textContent='Uploading…';
  const res=await fetch(API.uploadResume,{method:'POST',body:fd}).then(r=>r.json());
  if(res.success){status.textContent='✅ Resume uploaded: '+res.path;showAlert('Resume updated!');}
  else{status.textContent='❌ '+res.error;showAlert(res.error||'Upload failed','danger');}
});

/* ══════════════════════════════════════════════════════════════
   SETTINGS — Change Password
══════════════════════════════════════════════════════════════ */
$('pw-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const newPw=$('pw-new').value;const conf=$('pw-confirm').value;
  if(newPw!==conf){showAlert('Passwords do not match','danger','pw-alert');return;}
  const res=await post(API.password,{current_password:$('pw-current').value,new_password:newPw});
  if(res.success){showAlert('Password changed!','success','pw-alert');$('pw-form').reset();}
  else showAlert(res.error||'Error','danger','pw-alert');
});

/* ══════════════════════════════════════════════════════════════
   INIT — load all data
══════════════════════════════════════════════════════════════ */
(async function init(){
  await loadOverview();
  loadProfile();
  loadSkills();
  loadProjects();
  loadCerts();
  loadAchievements();
  loadTestimonials();
  // Messages loaded lazily when panel opened
  // Activity log loaded lazily
  // Analytics loaded lazily


})();
