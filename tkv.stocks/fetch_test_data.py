#!/usr/bin/env python
import os
import sys
sys.path.insert(0, '/usr/src/app')

from datetime import datetime, timedelta
import yfinance as yf
from app import create_app
from app.db import db
from app.models import HistoricalPrice

app = create_app()

with app.app_context():
    test_stocks = ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS']
    end_date = datetime.now()
    start_date = end_date - timedelta(days=180)
    
    for symbol in test_stocks:
        print(f'Fetching {symbol}...')
        try:
            stock = yf.Ticker(symbol)
            hist = stock.history(start=start_date, end=end_date)
            
            count = 0
            for date, row in hist.iterrows():
                price = HistoricalPrice(
                    symbol=symbol,
                    dt=date.to_pydatetime(),
                    open=float(row['Open']),
                    high=float(row['High']),
                    low=float(row['Low']),
                    close=float(row['Close']),
                    volume=int(row['Volume'])
                )
                db.session.merge(price)
                count += 1
            
            db.session.commit()
            print(f'  ✓ Added {count} records for {symbol}')
        except Exception as e:
            print(f'  ✗ Error: {e}')
            db.session.rollback()
    
    print('\nDone! Test stocks data fetched successfully.')
