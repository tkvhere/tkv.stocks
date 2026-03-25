from .db import db
from datetime import datetime

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.Text, unique=True, nullable=False)
    name = db.Column(db.Text)
    password_hash = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Portfolio(db.Model):
    __tablename__ = 'portfolios'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    name = db.Column(db.Text)
    source = db.Column(db.Text)
    cloud_link = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Holding(db.Model):
    __tablename__ = 'holdings'
    id = db.Column(db.Integer, primary_key=True)
    portfolio_id = db.Column(db.Integer, db.ForeignKey('portfolios.id'))
    symbol = db.Column(db.Text, nullable=False)
    quantity = db.Column(db.Numeric)
    avg_price = db.Column(db.Numeric)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)

class HistoricalPrice(db.Model):
    __tablename__ = 'historical_prices'
    id = db.Column(db.Integer, primary_key=True)
    symbol = db.Column(db.Text, nullable=False)
    dt = db.Column(db.DateTime, nullable=False)
    open = db.Column(db.Numeric)
    high = db.Column(db.Numeric)
    low = db.Column(db.Numeric)
    close = db.Column(db.Numeric)
    volume = db.Column(db.BigInteger)
    source = db.Column(db.Text, default='yfinance')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('symbol', 'dt'),)
