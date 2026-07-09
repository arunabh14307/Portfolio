import os
import json
import hashlib
from datetime import datetime, timedelta
from functools import wraps
from flask import (Flask, render_template, request, redirect, url_for,
                   session, jsonify, send_from_directory, abort)
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from database import get_db, init_db, log_activity

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'portfolio-secret-key-2025-change-in-prod')

# ── File upload config ────────────────────────────────────────────────────────
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'static', 'uploads')
ALLOWED_IMAGE = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'}
ALLOWED_DOC   = {'pdf', 'doc', 'docx'}
ALLOWED_RESUME = {'pdf', 'doc', 'docx'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename, allowed):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed

# ── Auth helpers ──────────────────────────────────────────────────────────────
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'admin_logged_in' not in session:
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated

def get_ip_hash():
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    return hashlib.md5(ip.encode()).hexdigest()[:16]

# ── DB row → dict ─────────────────────────────────────────────────────────────
def row_to_dict(row):
    return dict(row) if row else None

def rows_to_list(rows):
    return [dict(r) for r in rows]

# ════════════════════════════════════════════════════════════════════════════
# PUBLIC ROUTES
# ════════════════════════════════════════════════════════════════════════════

@app.route('/')
def index():
    try:
        db = get_db()
        # Record analytics
        today = datetime.now().strftime('%Y-%m-%d')
        ip_hash = get_ip_hash()
        # One unique visit per IP per day per page
        existing = db.execute(
            "SELECT id FROM analytics WHERE visit_date=? AND page=? AND ip_hash=?",
            (today, '/', ip_hash)).fetchone()
        if not existing:
            db.execute("INSERT INTO analytics (visit_date, page, ip_hash) VALUES (?,?,?)",
                       (today, '/', ip_hash))
            db.commit()
        db.close()
    except Exception:
        # Analytics writes fail silently on Vercel (read-only filesystem)
        pass
    return render_template('index.html')


@app.route('/blog/<int:post_id>')
def blog_post(post_id):
    db = get_db()
    post = db.execute("SELECT * FROM blog_posts WHERE id=? AND published=1", (post_id,)).fetchone()
    db.close()
    if not post:
        abort(404)
    return render_template('blog_post.html', post=dict(post))


@app.route('/resume/download')
def resume_download():
    db = get_db()
    profile = db.execute("SELECT resume_file FROM profile LIMIT 1").fetchone()
    db.close()
    if profile and profile['resume_file']:
        filename = os.path.basename(profile['resume_file'])
        return send_from_directory(UPLOAD_FOLDER, filename, as_attachment=True)
    abort(404)


@app.route('/certificates/<int:cert_id>/preview')
def certificate_preview(cert_id):
    db = get_db()
    cert = db.execute("SELECT * FROM certificates WHERE id=?", (cert_id,)).fetchone()
    db.close()
    if not cert:
        abort(404)
    # Prefer image, fall back to file_path
    file_path = cert['image'] or cert['file_path']
    if not file_path:
        abort(404)
    filename = os.path.basename(file_path)
    return send_from_directory(UPLOAD_FOLDER, filename, as_attachment=False)


@app.route('/certificates/<int:cert_id>/download')
def certificate_download(cert_id):
    db = get_db()
    cert = db.execute("SELECT * FROM certificates WHERE id=?", (cert_id,)).fetchone()
    db.close()
    if not cert:
        abort(404)
    file_path = cert['file_path'] or cert['image']
    if not file_path:
        abort(404)
    filename = os.path.basename(file_path)
    return send_from_directory(UPLOAD_FOLDER, filename, as_attachment=True)




@app.route('/static/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

# ════════════════════════════════════════════════════════════════════════════
# ADMIN AUTH
# ════════════════════════════════════════════════════════════════════════════

@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if 'admin_logged_in' in session:
        return redirect(url_for('admin_dashboard'))
    error = None
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        db = get_db()
        user = db.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
        db.close()
        if user and check_password_hash(user['password_hash'], password):
            session['admin_logged_in'] = True
            session['admin_user'] = username
            log_activity('LOGIN', f'Admin "{username}" logged in')
            return redirect(url_for('admin_dashboard'))
        else:
            error = 'Invalid username or password.'
    return render_template('login.html', error=error)


@app.route('/admin/logout')
def admin_logout():
    user = session.get('admin_user', 'admin')
    session.clear()
    log_activity('LOGOUT', f'Admin "{user}" logged out')
    return redirect(url_for('admin_login'))


@app.route('/admin/dashboard')
@login_required
def admin_dashboard():
    return render_template('dashboard.html')

# ════════════════════════════════════════════════════════════════════════════
# API — PROFILE
# ════════════════════════════════════════════════════════════════════════════

@app.route('/api/profile', methods=['GET'])
def api_get_profile():
    db = get_db()
    profile = db.execute("SELECT * FROM profile LIMIT 1").fetchone()
    db.close()
    return jsonify(row_to_dict(profile) or {})


@app.route('/api/profile', methods=['POST'])
@login_required
def api_update_profile():
    data = request.get_json(force=True)
    allowed = ['name','title','bio','about','education','college','course','year',
               'career_goal','interests','email','phone','location',
               'linkedin','github','leetcode','hackerrank','codeforces',
               'accent_color','font_style']
    db = get_db()
    for field in allowed:
        if field in data:
            db.execute(f"UPDATE profile SET {field}=?", (data[field],))
    db.commit()
    db.close()
    log_activity('PROFILE_UPDATE', 'Profile information updated')
    return jsonify({'success': True})

# ════════════════════════════════════════════════════════════════════════════
# API — SKILLS
# ════════════════════════════════════════════════════════════════════════════

@app.route('/api/skills', methods=['GET'])
def api_get_skills():
    db = get_db()
    skills = db.execute("SELECT * FROM skills ORDER BY percentage DESC").fetchall()
    db.close()
    return jsonify(rows_to_list(skills))


@app.route('/api/skills', methods=['POST'])
@login_required
def api_add_skill():
    data = request.get_json(force=True)
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Name required'}), 400
    level = int(data.get('level', 2))
    pct   = int(data.get('percentage', 50))
    cat   = data.get('category', 'General')
    desc  = data.get('description', '')
    icon  = data.get('icon', '')
    now   = datetime.now().isoformat()
    db = get_db()
    cur = db.execute("INSERT INTO skills (name, level, percentage, category, description, icon, last_updated) VALUES (?,?,?,?,?,?,?)",
                     (name, level, pct, cat, desc, icon, now))
    skill_id = cur.lastrowid
    db.execute("INSERT INTO skill_history (skill_id, level, percentage, note, recorded_date) VALUES (?,?,?,?,?)",
               (skill_id, level, pct, 'Initial entry', now))
    db.commit()
    db.close()
    log_activity('SKILL_ADD', f'Added skill: {name}')
    return jsonify({'success': True, 'id': skill_id})


@app.route('/api/skills/<int:skill_id>', methods=['PUT'])
@login_required
def api_update_skill(skill_id):
    data = request.get_json(force=True)
    now = datetime.now().isoformat()
    db = get_db()
    skill = db.execute("SELECT * FROM skills WHERE id=?", (skill_id,)).fetchone()
    if not skill:
        db.close()
        return jsonify({'error': 'Not found'}), 404
    name  = data.get('name', skill['name'])
    level = int(data.get('level', skill['level']))
    pct   = int(data.get('percentage', skill['percentage']))
    cat   = data.get('category', skill['category'])
    desc  = data.get('description', skill['description'] if 'description' in skill.keys() else '')
    icon  = data.get('icon', skill['icon'] if 'icon' in skill.keys() else '')
    note  = data.get('note', '')
    db.execute("UPDATE skills SET name=?, level=?, percentage=?, category=?, description=?, icon=?, last_updated=? WHERE id=?",
               (name, level, pct, cat, desc, icon, now, skill_id))
    # Record history if level/pct changed
    if level != skill['level'] or pct != skill['percentage']:
        db.execute("INSERT INTO skill_history (skill_id, level, percentage, note, recorded_date) VALUES (?,?,?,?,?)",
                   (skill_id, level, pct, note, now))
    db.commit()
    db.close()
    log_activity('SKILL_UPDATE', f'Updated skill: {name}')
    return jsonify({'success': True})


@app.route('/api/skills/<int:skill_id>', methods=['DELETE'])
@login_required
def api_delete_skill(skill_id):
    db = get_db()
    skill = db.execute("SELECT name FROM skills WHERE id=?", (skill_id,)).fetchone()
    db.execute("DELETE FROM skills WHERE id=?", (skill_id,))
    db.commit()
    db.close()
    if skill:
        log_activity('SKILL_DELETE', f'Deleted skill: {skill["name"]}')
    return jsonify({'success': True})


@app.route('/api/skill_history/<int:skill_id>', methods=['GET'])
def api_skill_history(skill_id):
    db = get_db()
    history = db.execute(
        "SELECT * FROM skill_history WHERE skill_id=? ORDER BY recorded_date ASC", (skill_id,)).fetchall()
    db.close()
    return jsonify(rows_to_list(history))

# ════════════════════════════════════════════════════════════════════════════
# API — PROJECTS
# ════════════════════════════════════════════════════════════════════════════

@app.route('/api/projects', methods=['GET'])
def api_get_projects():
    db = get_db()
    projects = db.execute("SELECT * FROM projects ORDER BY featured DESC, created_at DESC").fetchall()
    db.close()
    return jsonify(rows_to_list(projects))


@app.route('/api/projects', methods=['POST'])
@login_required
def api_add_project():
    data = request.get_json(force=True)
    title = data.get('title', '').strip()
    if not title:
        return jsonify({'error': 'Title required'}), 400
    db = get_db()
    cur = db.execute('''INSERT INTO projects (title, description, technologies, category, difficulty,
                        github_link, demo_link, video_link, image, featured)
                        VALUES (?,?,?,?,?,?,?,?,?,?)''',
                     (title, data.get('description',''), data.get('technologies',''),
                      data.get('category','General'), data.get('difficulty','Intermediate'),
                      data.get('github_link',''), data.get('demo_link',''),
                      data.get('video_link',''), data.get('image',''),
                      int(data.get('featured', 0))))
    db.commit()
    db.close()
    log_activity('PROJECT_ADD', f'Added project: {title}')
    return jsonify({'success': True, 'id': cur.lastrowid})


@app.route('/api/projects/<int:proj_id>', methods=['PUT'])
@login_required
def api_update_project(proj_id):
    data = request.get_json(force=True)
    db = get_db()
    p = db.execute("SELECT * FROM projects WHERE id=?", (proj_id,)).fetchone()
    if not p:
        db.close()
        return jsonify({'error': 'Not found'}), 404
    db.execute('''UPDATE projects SET title=?, description=?, technologies=?, category=?,
                  difficulty=?, github_link=?, demo_link=?, video_link=?, image=?, featured=?
                  WHERE id=?''',
               (data.get('title', p['title']), data.get('description', p['description']),
                data.get('technologies', p['technologies']), data.get('category', p['category']),
                data.get('difficulty', p['difficulty']), data.get('github_link', p['github_link']),
                data.get('demo_link', p['demo_link']), data.get('video_link', p['video_link']),
                data.get('image', p['image']), int(data.get('featured', p['featured'])), proj_id))
    db.commit()
    db.close()
    log_activity('PROJECT_UPDATE', f'Updated project: {data.get("title", p["title"])}')
    return jsonify({'success': True})


@app.route('/api/projects/<int:proj_id>', methods=['DELETE'])
@login_required
def api_delete_project(proj_id):
    db = get_db()
    p = db.execute("SELECT title FROM projects WHERE id=?", (proj_id,)).fetchone()
    db.execute("DELETE FROM projects WHERE id=?", (proj_id,))
    db.commit()
    db.close()
    if p:
        log_activity('PROJECT_DELETE', f'Deleted project: {p["title"]}')
    return jsonify({'success': True})

# ════════════════════════════════════════════════════════════════════════════
# API — CERTIFICATES
# ════════════════════════════════════════════════════════════════════════════

@app.route('/api/certificates', methods=['GET'])
def api_get_certs():
    db = get_db()
    certs = db.execute("SELECT * FROM certificates ORDER BY date DESC").fetchall()
    db.close()
    return jsonify(rows_to_list(certs))


@app.route('/api/certificates', methods=['POST'])
@login_required
def api_add_cert():
    data = request.get_json(force=True)
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Name required'}), 400
    db = get_db()
    cur = db.execute("INSERT INTO certificates (name, organization, date, file_path, verify_link, image) VALUES (?,?,?,?,?,?)",
                     (name, data.get('organization',''), data.get('date',''),
                      data.get('file_path',''), data.get('verify_link',''), data.get('image','')))
    db.commit()
    db.close()
    log_activity('CERT_ADD', f'Added certificate: {name}')
    return jsonify({'success': True, 'id': cur.lastrowid})


@app.route('/api/certificates/<int:cert_id>', methods=['PUT'])
@login_required
def api_update_cert(cert_id):
    data = request.get_json(force=True)
    db = get_db()
    c = db.execute("SELECT * FROM certificates WHERE id=?", (cert_id,)).fetchone()
    if not c:
        db.close()
        return jsonify({'error': 'Not found'}), 404
    db.execute("UPDATE certificates SET name=?, organization=?, date=?, file_path=?, verify_link=?, image=? WHERE id=?",
               (data.get('name', c['name']), data.get('organization', c['organization']),
                data.get('date', c['date']), data.get('file_path', c['file_path']),
                data.get('verify_link', c['verify_link']), data.get('image', c['image']), cert_id))
    db.commit()
    db.close()
    log_activity('CERT_UPDATE', f'Updated certificate: {data.get("name", c["name"])}')
    return jsonify({'success': True})


@app.route('/api/certificates/<int:cert_id>', methods=['DELETE'])
@login_required
def api_delete_cert(cert_id):
    db = get_db()
    c = db.execute("SELECT name FROM certificates WHERE id=?", (cert_id,)).fetchone()
    db.execute("DELETE FROM certificates WHERE id=?", (cert_id,))
    db.commit()
    db.close()
    if c:
        log_activity('CERT_DELETE', f'Deleted certificate: {c["name"]}')
    return jsonify({'success': True})

# ════════════════════════════════════════════════════════════════════════════
# API — ACHIEVEMENTS
# ════════════════════════════════════════════════════════════════════════════

@app.route('/api/achievements', methods=['GET'])
def api_get_achievements():
    db = get_db()
    ach = db.execute("SELECT * FROM achievements ORDER BY date DESC").fetchall()
    db.close()
    return jsonify(rows_to_list(ach))


@app.route('/api/achievements', methods=['POST'])
@login_required
def api_add_achievement():
    data = request.get_json(force=True)
    title = data.get('title', '').strip()
    if not title:
        return jsonify({'error': 'Title required'}), 400
    db = get_db()
    cur = db.execute("INSERT INTO achievements (title, description, icon, date, category) VALUES (?,?,?,?,?)",
                     (title, data.get('description',''), data.get('icon','🏆'),
                      data.get('date',''), data.get('category','General')))
    db.commit()
    db.close()
    log_activity('ACH_ADD', f'Added achievement: {title}')
    return jsonify({'success': True, 'id': cur.lastrowid})


@app.route('/api/achievements/<int:ach_id>', methods=['PUT'])
@login_required
def api_update_achievement(ach_id):
    data = request.get_json(force=True)
    db = get_db()
    a = db.execute("SELECT * FROM achievements WHERE id=?", (ach_id,)).fetchone()
    if not a:
        db.close()
        return jsonify({'error': 'Not found'}), 404
    db.execute("UPDATE achievements SET title=?, description=?, icon=?, date=?, category=? WHERE id=?",
               (data.get('title', a['title']), data.get('description', a['description']),
                data.get('icon', a['icon']), data.get('date', a['date']),
                data.get('category', a['category']), ach_id))
    db.commit()
    db.close()
    log_activity('ACH_UPDATE', f'Updated achievement: {data.get("title", a["title"])}')
    return jsonify({'success': True})


@app.route('/api/achievements/<int:ach_id>', methods=['DELETE'])
@login_required
def api_delete_achievement(ach_id):
    db = get_db()
    a = db.execute("SELECT title FROM achievements WHERE id=?", (ach_id,)).fetchone()
    db.execute("DELETE FROM achievements WHERE id=?", (ach_id,))
    db.commit()
    db.close()
    if a:
        log_activity('ACH_DELETE', f'Deleted achievement: {a["title"]}')
    return jsonify({'success': True})

# ════════════════════════════════════════════════════════════════════════════
# API — BLOG
# ════════════════════════════════════════════════════════════════════════════

@app.route('/api/blog', methods=['GET'])
def api_get_blog():
    admin_mode = 'admin_logged_in' in session
    db = get_db()
    if admin_mode:
        posts = db.execute("SELECT * FROM blog_posts ORDER BY publish_date DESC").fetchall()
    else:
        posts = db.execute("SELECT * FROM blog_posts WHERE published=1 ORDER BY publish_date DESC").fetchall()
    db.close()
    return jsonify(rows_to_list(posts))


@app.route('/api/blog', methods=['POST'])
@login_required
def api_add_blog():
    data = request.get_json(force=True)
    title = data.get('title', '').strip()
    if not title:
        return jsonify({'error': 'Title required'}), 400
    now = datetime.now().isoformat()
    db = get_db()
    cur = db.execute("INSERT INTO blog_posts (title, content, summary, tags, cover_image, publish_date, published) VALUES (?,?,?,?,?,?,?)",
                     (title, data.get('content',''), data.get('summary',''),
                      data.get('tags',''), data.get('cover_image',''), now,
                      int(data.get('published', 0))))
    db.commit()
    db.close()
    log_activity('BLOG_ADD', f'Added blog post: {title}')
    return jsonify({'success': True, 'id': cur.lastrowid})


@app.route('/api/blog/<int:post_id>', methods=['PUT'])
@login_required
def api_update_blog(post_id):
    data = request.get_json(force=True)
    db = get_db()
    p = db.execute("SELECT * FROM blog_posts WHERE id=?", (post_id,)).fetchone()
    if not p:
        db.close()
        return jsonify({'error': 'Not found'}), 404
    db.execute("UPDATE blog_posts SET title=?, content=?, summary=?, tags=?, cover_image=?, published=? WHERE id=?",
               (data.get('title', p['title']), data.get('content', p['content']),
                data.get('summary', p['summary']), data.get('tags', p['tags']),
                data.get('cover_image', p['cover_image']), int(data.get('published', p['published'])), post_id))
    db.commit()
    db.close()
    log_activity('BLOG_UPDATE', f'Updated blog post: {data.get("title", p["title"])}')
    return jsonify({'success': True})


@app.route('/api/blog/<int:post_id>', methods=['DELETE'])
@login_required
def api_delete_blog(post_id):
    db = get_db()
    p = db.execute("SELECT title FROM blog_posts WHERE id=?", (post_id,)).fetchone()
    db.execute("DELETE FROM blog_posts WHERE id=?", (post_id,))
    db.commit()
    db.close()
    if p:
        log_activity('BLOG_DELETE', f'Deleted blog post: {p["title"]}')
    return jsonify({'success': True})

# ════════════════════════════════════════════════════════════════════════════
# API — MESSAGES (CONTACT FORM)
# ════════════════════════════════════════════════════════════════════════════

@app.route('/api/messages', methods=['POST'])
def api_send_message():
    data = request.get_json(force=True)
    name    = data.get('name', '').strip()
    email   = data.get('email', '').strip()
    message = data.get('message', '').strip()
    if not name or not email or not message:
        return jsonify({'error': 'All fields are required'}), 400
    now = datetime.now().isoformat()
    db = get_db()
    db.execute("INSERT INTO messages (name, email, message, date) VALUES (?,?,?,?)",
               (name, email, message, now))
    db.commit()
    db.close()
    return jsonify({'success': True, 'message': 'Message sent successfully!'})


@app.route('/api/messages', methods=['GET'])
@login_required
def api_get_messages():
    db = get_db()
    msgs = db.execute("SELECT * FROM messages ORDER BY date DESC").fetchall()
    db.close()
    return jsonify(rows_to_list(msgs))


@app.route('/api/messages/<int:msg_id>/read', methods=['POST'])
@login_required
def api_mark_read(msg_id):
    db = get_db()
    db.execute("UPDATE messages SET read=1 WHERE id=?", (msg_id,))
    db.commit()
    db.close()
    return jsonify({'success': True})


@app.route('/api/messages/<int:msg_id>', methods=['DELETE'])
@login_required
def api_delete_message(msg_id):
    db = get_db()
    db.execute("DELETE FROM messages WHERE id=?", (msg_id,))
    db.commit()
    db.close()
    log_activity('MSG_DELETE', f'Deleted message #{msg_id}')
    return jsonify({'success': True})

# ════════════════════════════════════════════════════════════════════════════
# API — ANALYTICS
# ════════════════════════════════════════════════════════════════════════════

@app.route('/api/analytics', methods=['GET'])
@login_required
def api_analytics():
    db = get_db()
    # Total visits
    total = db.execute("SELECT COUNT(*) as c FROM analytics").fetchone()['c']
    # Last 30 days
    thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    daily = db.execute(
        "SELECT visit_date, COUNT(*) as visits FROM analytics WHERE visit_date>=? GROUP BY visit_date ORDER BY visit_date",
        (thirty_days_ago,)).fetchall()
    # Top pages
    top_pages = db.execute(
        "SELECT page, COUNT(*) as visits FROM analytics GROUP BY page ORDER BY visits DESC LIMIT 10").fetchall()
    # Messages count
    msg_count = db.execute("SELECT COUNT(*) as c FROM messages").fetchone()['c']
    unread = db.execute("SELECT COUNT(*) as c FROM messages WHERE read=0").fetchone()['c']
    # Skills count
    skills_count = db.execute("SELECT COUNT(*) as c FROM skills").fetchone()['c']
    projects_count = db.execute("SELECT COUNT(*) as c FROM projects").fetchone()['c']
    blog_count = db.execute("SELECT COUNT(*) as c FROM blog_posts WHERE published=1").fetchone()['c']
    certs_count = db.execute("SELECT COUNT(*) as c FROM certificates").fetchone()['c']
    db.close()
    return jsonify({
        'total_visits': total,
        'daily': rows_to_list(daily),
        'top_pages': rows_to_list(top_pages),
        'messages': msg_count,
        'unread_messages': unread,
        'skills': skills_count,
        'projects': projects_count,
        'blog_posts': blog_count,
        'certificates': certs_count,
    })

# ════════════════════════════════════════════════════════════════════════════
# API — TESTIMONIALS
# ════════════════════════════════════════════════════════════════════════════

@app.route('/api/testimonials', methods=['GET'])
def api_get_testimonials():
    db = get_db()
    t = db.execute("SELECT * FROM testimonials ORDER BY id DESC").fetchall()
    db.close()
    return jsonify(rows_to_list(t))


@app.route('/api/testimonials', methods=['POST'])
def api_add_testimonial():
    data = request.get_json(force=True)
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Name required'}), 400
    db = get_db()
    cur = db.execute("INSERT INTO testimonials (name, role, organization, content, avatar, rating) VALUES (?,?,?,?,?,?)",
                     (name, data.get('role',''), data.get('organization',''),
                      data.get('content',''), data.get('avatar',''),
                      int(data.get('rating', 5))))
    db.commit()
    db.close()
    log_activity('TEST_ADD', f'Added testimonial from: {name}')
    return jsonify({'success': True, 'id': cur.lastrowid})


@app.route('/api/testimonials/<int:t_id>', methods=['PUT'])
@login_required
def api_update_testimonial(t_id):
    data = request.get_json(force=True)
    db = get_db()
    t = db.execute("SELECT * FROM testimonials WHERE id=?", (t_id,)).fetchone()
    if not t:
        db.close()
        return jsonify({'error': 'Not found'}), 404
    db.execute("UPDATE testimonials SET name=?, role=?, organization=?, content=?, avatar=?, rating=? WHERE id=?",
               (data.get('name', t['name']), data.get('role', t['role']),
                data.get('organization', t['organization']), data.get('content', t['content']),
                data.get('avatar', t['avatar']), int(data.get('rating', t['rating'])), t_id))
    db.commit()
    db.close()
    return jsonify({'success': True})


@app.route('/api/testimonials/<int:t_id>', methods=['DELETE'])
@login_required
def api_delete_testimonial(t_id):
    db = get_db()
    db.execute("DELETE FROM testimonials WHERE id=?", (t_id,))
    db.commit()
    db.close()
    return jsonify({'success': True})

# ════════════════════════════════════════════════════════════════════════════
# API — FILE UPLOADS
# ════════════════════════════════════════════════════════════════════════════

def save_upload(file, allowed_exts, subfolder=''):
    if file and allowed_file(file.filename, allowed_exts):
        filename = secure_filename(file.filename)
        # Prepend timestamp to avoid collisions
        ts = datetime.now().strftime('%Y%m%d_%H%M%S_')
        filename = ts + filename
        dest = os.path.join(UPLOAD_FOLDER, subfolder)
        os.makedirs(dest, exist_ok=True)
        path = os.path.join(dest, filename)
        file.save(path)
        rel = f'/static/uploads/{subfolder}/{filename}' if subfolder else f'/static/uploads/{filename}'
        return rel.replace('\\', '/')
    return None


@app.route('/api/upload/profile', methods=['POST'])
@login_required
def api_upload_profile():
    f = request.files.get('file')
    path = save_upload(f, ALLOWED_IMAGE, 'profiles')
    if not path:
        return jsonify({'error': 'Invalid file'}), 400
    db = get_db()
    db.execute("UPDATE profile SET profile_image=?", (path,))
    db.commit()
    db.close()
    log_activity('UPLOAD_PROFILE', 'Profile image updated')
    return jsonify({'success': True, 'path': path})


@app.route('/api/upload/resume', methods=['POST'])
@login_required
def api_upload_resume():
    f = request.files.get('file')
    path = save_upload(f, ALLOWED_RESUME, 'resumes')
    if not path:
        return jsonify({'error': 'Invalid file'}), 400
    db = get_db()
    db.execute("UPDATE profile SET resume_file=?", (path,))
    db.commit()
    db.close()
    log_activity('UPLOAD_RESUME', 'Resume updated')
    return jsonify({'success': True, 'path': path})


@app.route('/api/upload/certificate', methods=['POST'])
@login_required
def api_upload_cert_file():
    f = request.files.get('file')
    path = save_upload(f, ALLOWED_IMAGE | ALLOWED_DOC, 'certificates')
    if not path:
        return jsonify({'error': 'Invalid file'}), 400
    return jsonify({'success': True, 'path': path})


@app.route('/api/upload/project', methods=['POST'])
@login_required
def api_upload_project_img():
    f = request.files.get('file')
    path = save_upload(f, ALLOWED_IMAGE, 'projects')
    if not path:
        return jsonify({'error': 'Invalid file'}), 400
    return jsonify({'success': True, 'path': path})

@app.route('/api/upload/skill', methods=['POST'])
@login_required
def api_upload_skill_icon():
    f = request.files.get('file')
    path = save_upload(f, ALLOWED_IMAGE, 'skills')
    if not path:
        return jsonify({'error': 'Invalid file'}), 400
    return jsonify({'success': True, 'path': path})

# ════════════════════════════════════════════════════════════════════════════
# API — ACTIVITY LOG
# ════════════════════════════════════════════════════════════════════════════

@app.route('/api/activity_log', methods=['GET'])
@login_required
def api_activity_log():
    db = get_db()
    logs = db.execute("SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 200").fetchall()
    db.close()
    return jsonify(rows_to_list(logs))

# ════════════════════════════════════════════════════════════════════════════
# API — SETTINGS (Change Password)
# ════════════════════════════════════════════════════════════════════════════

@app.route('/api/settings/password', methods=['POST'])
@login_required
def api_change_password():
    data = request.get_json(force=True)
    current = data.get('current_password', '')
    new_pw  = data.get('new_password', '')
    if not current or not new_pw or len(new_pw) < 6:
        return jsonify({'error': 'Invalid input. New password must be at least 6 characters.'}), 400
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE username=?", (session.get('admin_user', 'admin'),)).fetchone()
    if not user or not check_password_hash(user['password_hash'], current):
        db.close()
        return jsonify({'error': 'Current password is incorrect.'}), 403
    db.execute("UPDATE users SET password_hash=? WHERE id=?",
               (generate_password_hash(new_pw), user['id']))
    db.commit()
    db.close()
    log_activity('PASSWORD_CHANGE', 'Admin password changed')
    return jsonify({'success': True})

# ════════════════════════════════════════════════════════════════════════════
# MAIN
# ════════════════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)
