from app import app

# Vercel calls this as the WSGI entrypoint
application = app

if __name__ == '__main__':
    app.run()
