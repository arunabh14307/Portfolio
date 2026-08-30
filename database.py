import sqlite3
import os
from werkzeug.security import generate_password_hash
from datetime import datetime

# On Vercel the filesystem is read-only; DB lives in the same dir as this file.
# We resolve to an absolute path so it works both locally and on Vercel.
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'portfolio.db')

def get_db():
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            conn.execute("PRAGMA journal_mode=WAL")
        except Exception:
            pass
        return conn
    except Exception:
        # Fallback to read-only URI if filesystem is read-only (Vercel)
        db_uri = f"file:{os.path.abspath(DB_PATH).replace('\\', '/')}?mode=ro"
        conn = sqlite3.connect(db_uri, uri=True)
        conn.row_factory = sqlite3.Row
        return conn

def init_db():
    conn = get_db()
    c = conn.cursor()

    # Users
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL
    )''')

    # Profile
    c.execute('''CREATE TABLE IF NOT EXISTS profile (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT DEFAULT 'Your Name',
        title TEXT DEFAULT 'Full Stack Developer',
        bio TEXT DEFAULT 'Welcome to my portfolio! I am a passionate developer.',
        about TEXT DEFAULT 'I am a dedicated developer with a passion for building great software.',
        education TEXT DEFAULT 'B.Tech Computer Science',
        college TEXT DEFAULT 'Your University',
        course TEXT DEFAULT 'Computer Science & Engineering',
        year TEXT DEFAULT '3rd Year',
        career_goal TEXT DEFAULT 'To become a skilled full-stack developer and contribute to impactful projects.',
        interests TEXT DEFAULT 'Coding, Open Source, Machine Learning, Cybersecurity',
        email TEXT DEFAULT 'your.email@example.com',
        phone TEXT DEFAULT '+91 0000000000',
        location TEXT DEFAULT 'India',
        linkedin TEXT DEFAULT '',
        github TEXT DEFAULT '',
        leetcode TEXT DEFAULT '',
        hackerrank TEXT DEFAULT '',
        codeforces TEXT DEFAULT '',
        profile_image TEXT DEFAULT '',
        resume_file TEXT DEFAULT '',
        accent_color TEXT DEFAULT '#6c63ff',
        font_style TEXT DEFAULT 'Inter'
    )''')

    # Skills
    c.execute('''CREATE TABLE IF NOT EXISTS skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        level INTEGER DEFAULT 2,
        percentage INTEGER DEFAULT 50,
        category TEXT DEFAULT 'General',
        description TEXT DEFAULT '',
        icon TEXT DEFAULT '',
        last_updated TEXT DEFAULT CURRENT_TIMESTAMP
    )''')

    # Skill history
    c.execute('''CREATE TABLE IF NOT EXISTS skill_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        skill_id INTEGER NOT NULL,
        level INTEGER,
        percentage INTEGER,
        note TEXT DEFAULT '',
        recorded_date TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
    )''')

    # Projects
    c.execute('''CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        technologies TEXT DEFAULT '',
        category TEXT DEFAULT 'General',
        difficulty TEXT DEFAULT 'Intermediate',
        github_link TEXT DEFAULT '',
        demo_link TEXT DEFAULT '',
        video_link TEXT DEFAULT '',
        image TEXT DEFAULT '',
        featured INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )''')

    # Certificates
    c.execute('''CREATE TABLE IF NOT EXISTS certificates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        organization TEXT DEFAULT '',
        date TEXT DEFAULT '',
        file_path TEXT DEFAULT '',
        verify_link TEXT DEFAULT '',
        image TEXT DEFAULT ''
    )''')

    # Achievements
    c.execute('''CREATE TABLE IF NOT EXISTS achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        icon TEXT DEFAULT '🏆',
        date TEXT DEFAULT '',
        category TEXT DEFAULT 'General'
    )''')

    # Blog posts
    c.execute('''CREATE TABLE IF NOT EXISTS blog_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT DEFAULT '',
        summary TEXT DEFAULT '',
        tags TEXT DEFAULT '',
        cover_image TEXT DEFAULT '',
        publish_date TEXT DEFAULT CURRENT_TIMESTAMP,
        published INTEGER DEFAULT 0
    )''')

    # Messages
    c.execute('''CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        message TEXT NOT NULL,
        date TEXT DEFAULT CURRENT_TIMESTAMP,
        read INTEGER DEFAULT 0
    )''')

    # Analytics
    c.execute('''CREATE TABLE IF NOT EXISTS analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visit_date TEXT DEFAULT CURRENT_DATE,
        page TEXT DEFAULT '/',
        ip_hash TEXT DEFAULT ''
    )''')

    # Testimonials
    c.execute('''CREATE TABLE IF NOT EXISTS testimonials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        role TEXT DEFAULT '',
        organization TEXT DEFAULT '',
        content TEXT DEFAULT '',
        avatar TEXT DEFAULT '',
        rating INTEGER DEFAULT 5
    )''')

    # Activity log
    c.execute('''CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        details TEXT DEFAULT '',
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    )''')

    conn.commit()

    # ── Seed default admin ─────────────────────────────────────────
    existing = c.execute("SELECT id FROM users WHERE username='admin'").fetchone()
    if not existing:
        c.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)",
                  ('admin', generate_password_hash('admin123')))
        conn.commit()

    # ── Seed default profile ───────────────────────────────────────
    profile_count = c.execute("SELECT COUNT(*) FROM profile").fetchone()[0]
    if profile_count == 0:
        c.execute("""
            INSERT INTO profile (
                name, title, bio, about, education, college, course, year, email, location, linkedin, github, profile_image
            ) VALUES (
                'Arunabh Singh',
                'B.Tech CSE Student | AI/ML & Full-Stack Developer',
                'I build practical AI-powered applications, web solutions, and real-world technology projects.',
                'I am a B.Tech Computer Science and Engineering student with a strong interest in Artificial Intelligence, Machine Learning, Web Development, and practical technology solutions. I enjoy building real-world projects that combine software, AI, and hardware to solve meaningful problems. I continuously improve my technical skills through projects, certifications, hackathons, and hands-on learning.',
                'B.Tech — Computer Science & Engineering',
                'Lovely Professional University',
                'Computer Science & Engineering',
                '2025 – Present',
                'arunabh14307@gmail.com',
                'India',
                'https://www.linkedin.com/in/arunabh-singh-3a2629383/',
                'https://github.com/arunabh14307',
                '/static/uploads/profiles/20260325_115555_WhatsApp_Image_2026-03-25_at_11.55.36_AM.jpeg'
            )
        """)
        conn.commit()

    # ── Seed skills ────────────────────────────────────────────────
    skill_count = c.execute("SELECT COUNT(*) FROM skills").fetchone()[0]
    if skill_count == 0:
        sample_skills = [
            ('C++', 3, 85, 'Programming', 'Foundational, high-performance programming language used for systems and algorithms.', '/static/uploads/skills/20260327_013759_cc.png'),
            ('Python', 3, 90, 'Programming', 'Core language for AI/ML, backend scripting, and automation.', '/static/uploads/skills/20260408_101717_download_1.jpg'),
            ('JavaScript', 3, 80, 'Programming', 'Dynamic scripting language for frontend and interactive web applications.', '/static/uploads/skills/20260408_101907_JavaScript-logo.png'),
            ('HTML', 3, 90, 'Web Development', 'Semantic markup and standard web document structure.', '/static/uploads/skills/20260327_012315_html.jpg'),
            ('CSS', 3, 85, 'Web Development', 'Modern responsive layouts, flexbox, grid, and CSS styling.', '/static/uploads/skills/20260327_012315_html.jpg'),
            ('JavaScript (Web)', 3, 80, 'Web Development', 'DOM manipulation, modern ES6+, and asynchronous APIs.', '/static/uploads/skills/20260408_101907_JavaScript-logo.png'),
            ('React', 2, 70, 'Web Development', 'Component-based UI library for responsive, scalable frontend applications.', ''),
            ('MySQL', 3, 80, 'Database', 'Relational database management, querying, and schema design.', '/static/uploads/skills/20260408_102116_mysql-1-logo-png-transparent.png'),
            ('MongoDB', 2, 70, 'Database', 'Document-oriented NoSQL database for flexible and scalable data storage.', ''),
            ('Git', 3, 85, 'Tools', 'Distributed version control system for source code tracking and collaboration.', '/static/uploads/skills/20260408_101803_github-6980894_960_720.webp'),
            ('GitHub', 3, 85, 'Tools', 'Cloud-based platform for version control, repository hosting, and code collaboration.', '/static/uploads/skills/20260408_101803_github-6980894_960_720.webp'),
            ('VS Code', 3, 90, 'Tools', 'Modern code editor and development environment.', '')
        ]
        now = datetime.now().isoformat()
        for s in sample_skills:
            c.execute("INSERT INTO skills (name, level, percentage, category, description, icon, last_updated) VALUES (?,?,?,?,?,?,?)",
                      (s[0], s[1], s[2], s[3], s[4], s[5], now))
        conn.commit()

    # ── Seed projects ──────────────────────────────────────────────
    proj_count = c.execute("SELECT COUNT(*) FROM projects").fetchone()[0]
    if proj_count == 0:
        sample_projects = [
            ('FaceVault AI', 'A secure facial authentication system focused on privacy-preserving biometric verification, secure facial embeddings, and reliable user authentication.',
             'Python, Computer Vision, Deep Learning', 'AI / Machine Learning', 'Advanced', '', '', '', '/static/uploads/project/facial_recognition.png', 1),
            ('Facial Recognition System', 'A computer vision-based facial recognition application designed to detect and identify human faces using image processing and recognition techniques.',
             'Python, OpenCV, Computer Vision', 'Computer Vision', 'Intermediate', '', '', '', '/static/uploads/project/facial_recognition.png', 1),
            ('Water Quality Monitoring System', 'An Arduino-based monitoring system that uses a turbidity sensor to monitor water clarity and detect changes in water quality.',
             'Arduino Uno, Turbidity Sensor, Embedded Systems', 'Embedded Systems', 'Intermediate', '', '', '', '/static/uploads/project/port.jpg', 0),
            ('Vendor Cart', 'A web-based vendor shopping/cart management application designed to provide a simple and user-friendly interface for managing products and cart operations.',
             'HTML, CSS, JavaScript', 'Web Development', 'Intermediate', '', '', '', '/static/uploads/project/vendor.png', 0),
        ]
        for p in sample_projects:
            c.execute('''INSERT INTO projects (title, description, technologies, category, difficulty,
                         github_link, demo_link, video_link, image, featured) VALUES (?,?,?,?,?,?,?,?,?,?)''', p)
        conn.commit()

    # ── Seed achievements ──────────────────────────────────────────
    ach_count = c.execute("SELECT COUNT(*) FROM achievements").fetchone()[0]
    if ach_count == 0:
        sample_ach = [
            ('Innovation & Tech Hackathon', 'Runner-Up', '🏆', 'Hackathon', 'Competition'),
            ('Google Arcade', 'Google Arcade Achievement', '☁️', 'Achievement', 'Badges'),
            ('Community Development Program', 'Environmental Awareness Initiative', '🌱', 'Initiative', 'Leadership & Community'),
            ('Plantation Drive', 'Environmental Awareness & Plantation Initiative', '🌳', 'Initiative', 'Leadership & Community')
        ]
        for a in sample_ach:
            c.execute("INSERT INTO achievements (title, description, icon, date, category) VALUES (?,?,?,?,?)", a)
        conn.commit()

    # ── Seed testimonials ──────────────────────────────────────────
    test_count = c.execute("SELECT COUNT(*) FROM testimonials").fetchone()[0]
    if test_count == 0:
        sample_test = [
            ('Prof. Sharma', 'Faculty Mentor', 'XYZ University', 'An exceptional student with great problem-solving skills and dedication to learning.', '', 5),
            ('Rahul Verma', 'Team Member', 'Hackathon Team', 'Great to work with! Brings creative ideas and follow-through to every project.', '', 5),
            ('Priya Nair', 'Internship Mentor', 'ABC Tech', 'Shows strong technical aptitude and learns very quickly. A joy to mentor.', '', 5),
        ]
        for t in sample_test:
            c.execute("INSERT INTO testimonials (name, role, organization, content, avatar, rating) VALUES (?,?,?,?,?,?)", t)
        conn.commit()

    # ── Seed blog posts ────────────────────────────────────────────
    blog_count = c.execute("SELECT COUNT(*) FROM blog_posts").fetchone()[0]
    if blog_count == 0:
        sample_blogs = [
            ('Getting Started with Flask', '<p>Flask is a lightweight Python web framework that makes it easy to build web applications rapidly. In this post, we explore the basics of Flask routing, templates, and forms.</p><h2>Why Flask?</h2><p>Flask gives you the freedom to structure your application the way you want.</p>',
             'A beginner-friendly guide to building web applications with Flask.', 'Python,Flask,Web Development', '', '2025-01-15', 1),
            ('Python Tips & Tricks for Beginners', '<p>Python is one of the most beginner-friendly languages, but it also has many powerful features that even experienced developers love.</p>',
             'Handy Python tips to write cleaner and more Pythonic code.', 'Python,Programming,Tips', '', '2025-02-01', 1),
            ('Cybersecurity Basics: Staying Safe Online', '<p>In an increasingly connected world, cybersecurity is more important than ever. Here are the fundamental principles every developer should know.</p>',
             'Essential cybersecurity concepts every developer should know.', 'Cybersecurity,Security', '', '2025-03-01', 1),
        ]
        for b in sample_blogs:
            c.execute("INSERT INTO blog_posts (title, content, summary, tags, cover_image, publish_date, published) VALUES (?,?,?,?,?,?,?)", b)
        conn.commit()

    # ══════════════════════════════════════════════════════════════
    # ADD YOUR CERTIFICATES HERE
    # Each tuple: (name, organization, date, file_path, verify_link, image)
    # - file_path / image: leave '' if you don't have a file
    # - verify_link: paste the certificate URL (Coursera, LinkedIn, etc.)
    # After editing, run: git add database.py portfolio.db && git push
    # ══════════════════════════════════════════════════════════════
    cert_count = c.execute("SELECT COUNT(*) FROM certificates").fetchone()[0]
    if cert_count == 0:
        my_certificates = [
            # (name, organization, date, file_path, verify_link, image_url)
            # ── Add your real certificates below ──────────────────
            # Example:
            # ('Python for Everybody', 'Coursera / University of Michigan', '2024-06', '', 'https://coursera.org/verify/...', ''),
            # ('Responsive Web Design', 'freeCodeCamp', '2024-03', '', 'https://freecodecamp.org/certification/...', ''),
        ]
        for cert in my_certificates:
            c.execute("INSERT INTO certificates (name, organization, date, file_path, verify_link, image) VALUES (?,?,?,?,?,?)", cert)
        conn.commit()

    conn.close()


def log_activity(action, details=''):
    try:
        conn = get_db()
        conn.execute("INSERT INTO activity_log (action, details, timestamp) VALUES (?, ?, ?)",
                     (action, details, datetime.now().isoformat()))
        conn.commit()
        conn.close()
    except Exception:
        # Vercel has a read-only filesystem; writes fail silently.
        pass
