import sqlite3
import os
from werkzeug.security import generate_password_hash
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), 'portfolio.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
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

    # Seed default admin if not exists
    existing = c.execute("SELECT id FROM users WHERE username='admin'").fetchone()
    if not existing:
        c.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)",
                  ('admin', generate_password_hash('admin123')))
        conn.commit()

    # Seed default profile if empty
    profile_count = c.execute("SELECT COUNT(*) FROM profile").fetchone()[0]
    if profile_count == 0:
        c.execute("INSERT INTO profile (name) VALUES ('Arunabh Singh')")
        conn.commit()

    # Seed sample skills if empty
    skill_count = c.execute("SELECT COUNT(*) FROM skills").fetchone()[0]
    if skill_count == 0:
        sample_skills = [
            ('Python', 3, 80, 'Programming', 'Backend programming language', '🐍'),
            ('HTML & CSS', 3, 85, 'Web', 'Core web technologies', '🌐'),
            ('JavaScript', 2, 65, 'Web', 'Interactive web scripting', '⚡'),
            ('Flask', 2, 60, 'Backend', 'Python web framework', '🌶️'),
            ('SQLite / MySQL', 2, 60, 'Database', 'Relational databases', '🗄️'),
            ('Git & GitHub', 3, 75, 'Tools', 'Version control', '🐙'),
            ('C / C++', 2, 55, 'Programming', 'System programming', '⚙️'),
            ('Linux', 2, 60, 'Tools', 'Operating system', '🐧'),
        ]
        now = datetime.now().isoformat()
        for s in sample_skills:
            c.execute("INSERT INTO skills (name, level, percentage, category, description, icon, last_updated) VALUES (?,?,?,?,?,?,?)",
                      (s[0], s[1], s[2], s[3], s[4], s[5], now))
        conn.commit()

    # Seed sample projects
    proj_count = c.execute("SELECT COUNT(*) FROM projects").fetchone()[0]
    if proj_count == 0:
        sample_projects = [
            ('Portfolio Website', 'A full-featured personal portfolio with admin dashboard, analytics, blog system, and skill tracking built with Flask and SQLite.',
             'Python,Flask,HTML,CSS,JavaScript,SQLite', 'Web Development', 'Advanced', '', '', '', '', 1),
            ('VendorCart', 'A local commerce and campus food discovery platform with vendor management, product listings, and delivery tracking.',
             'HTML,CSS,JavaScript', 'Web Development', 'Intermediate', '', '', '', '', 0),
            ('Cybersecurity Toolkit', 'A collection of Python scripts for ethical hacking and security auditing including port scanning and password analysis.',
             'Python,Cybersecurity', 'Cybersecurity', 'Intermediate', '', '', '', '', 0),
        ]
        for p in sample_projects:
            c.execute('''INSERT INTO projects (title, description, technologies, category, difficulty,
                         github_link, demo_link, video_link, image, featured) VALUES (?,?,?,?,?,?,?,?,?,?)''', p)
        conn.commit()

    # Seed sample achievements
    ach_count = c.execute("SELECT COUNT(*) FROM achievements").fetchone()[0]
    if ach_count == 0:
        sample_ach = [
            ("Dean's List", 'Achieved top academic performance in the department.', 'A+', '2024', 'Academic'),
            ('Hackathon Participant', 'Participated in a 24-hour national level hackathon.', '[Hack]', '2024', 'Competition'),
            ('Open Source Contributor', 'Contributed to open source projects on GitHub.', '[Star]', '2025', 'Community'),
            ('100 Days of Code', 'Completed the 100 Days of Code challenge.', '[100]', '2024', 'Personal'),
        ]
        for a in sample_ach:
            c.execute("INSERT INTO achievements (title, description, icon, date, category) VALUES (?,?,?,?,?)", a)
        conn.commit()

    # Seed sample testimonials
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

    # Seed sample blog posts
    blog_count = c.execute("SELECT COUNT(*) FROM blog_posts").fetchone()[0]
    if blog_count == 0:
        sample_blogs = [
            ('Getting Started with Flask', '<p>Flask is a lightweight Python web framework that makes it easy to build web applications rapidly. In this post, we explore the basics of Flask routing, templates, and forms.</p><h2>Why Flask?</h2><p>Flask gives you the freedom to structure your application the way you want. It\'s minimal but extensible — perfect for small to large projects.</p><h2>Your First App</h2><pre><code>from flask import Flask\napp = Flask(__name__)\n\n@app.route("/")\ndef hello():\n    return "Hello, World!"</code></pre><p>Run with <code>python app.py</code> and visit <code>http://127.0.0.1:5000/</code>.</p>',
             'A beginner-friendly guide to building web applications with Flask.', 'Python,Flask,Web Development', '', '2025-01-15', 1),
            ('Python Tips & Tricks for Beginners', '<p>Python is one of the most beginner-friendly languages, but it also has many powerful features that even experienced developers love.</p><h2>List Comprehensions</h2><p>Instead of writing a loop, use list comprehensions for cleaner code:</p><pre><code>squares = [x**2 for x in range(10)]</code></pre><h2>f-Strings</h2><p>Format strings elegantly:</p><pre><code>name = "Arunabh"\nprint(f"Hello, {name}!")</code></pre>',
             'Handy Python tips to write cleaner and more Pythonic code.', 'Python,Programming,Tips', '', '2025-02-01', 1),
            ('Cybersecurity Basics: Staying Safe Online', '<p>In an increasingly connected world, cybersecurity is more important than ever. Here are the fundamental principles every developer should know.</p><h2>Use Strong Passwords</h2><p>Always use a password manager and generate unique, strong passwords for each service.</p><h2>Keep Software Updated</h2><p>Security patches are released regularly — keeping your systems updated protects against known vulnerabilities.</p>',
             'Essential cybersecurity concepts every developer should know.', 'Cybersecurity,Security', '', '2025-03-01', 1),
        ]
        for b in sample_blogs:
            c.execute("INSERT INTO blog_posts (title, content, summary, tags, cover_image, publish_date, published) VALUES (?,?,?,?,?,?,?)", b)
        conn.commit()

    conn.close()

def log_activity(action, details=''):
    conn = get_db()
    conn.execute("INSERT INTO activity_log (action, details, timestamp) VALUES (?, ?, ?)",
                 (action, details, datetime.now().isoformat()))
    conn.commit()
    conn.close()
