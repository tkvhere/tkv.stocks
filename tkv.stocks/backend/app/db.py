from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def init_db(app):
    db.init_app(app)
    
    with app.app_context():
        # Import models to ensure they are registered
        from . import models
        # Create all tables
        db.create_all()
        app.logger.info('Database tables created successfully')
