import yfinance as yf
from .db import db
from .models import HistoricalPrice
from sqlalchemy.exc import IntegrityError


def fetch_and_store_symbol(symbol, start='2015-01-01', end=None):
    try:
        print(f"Fetching data for {symbol} from {start}")
        df = yf.download(symbol, start=start, end=end, progress=False)
        
        if df is None or df.empty:
            print(f"No data returned for {symbol}")
            return 0
        
        print(f"Downloaded {len(df)} rows for {symbol}")
        count = 0
        
        for dt, row in df.iterrows():
            try:
                # Handle both single and multi-index dataframes
                open_val = row['Open'].iloc[0] if hasattr(row['Open'], 'iloc') else row['Open']
                high_val = row['High'].iloc[0] if hasattr(row['High'], 'iloc') else row['High']
                low_val = row['Low'].iloc[0] if hasattr(row['Low'], 'iloc') else row['Low']
                close_val = row['Close'].iloc[0] if hasattr(row['Close'], 'iloc') else row['Close']
                volume_val = row['Volume'].iloc[0] if hasattr(row['Volume'], 'iloc') else row['Volume']
                
                price_data = HistoricalPrice(
                    symbol=symbol,
                    dt=dt.to_pydatetime() if hasattr(dt, 'to_pydatetime') else dt,
                    open=float(open_val),
                    high=float(high_val),
                    low=float(low_val),
                    close=float(close_val),
                    volume=int(volume_val) if volume_val > 0 else 0,
                    source='yfinance'
                )
                
                db.session.add(price_data)
                db.session.commit()
                count += 1
            except IntegrityError:
                # Record already exists, skip
                db.session.rollback()
                continue
            except Exception as e:
                print(f"Error processing row for {symbol} on {dt}: {e}")
                db.session.rollback()
                continue
        
        print(f"Successfully stored {count} records for {symbol}")
        return count
        
    except Exception as e:
        print(f"Error fetching {symbol}: {e}")
        db.session.rollback()
        raise e
