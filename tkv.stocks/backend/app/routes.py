from flask import request, jsonify, current_app, make_response, render_template
from .models import Holding, Portfolio
from .db import db
from .fetch_prices import fetch_and_store_symbol


def register_routes(app):
    @app.route('/')
    def index():
        """Dashboard page."""
        return render_template('dashboard.html')

    @app.route('/login')
    def login():
        """Login page."""
        return render_template('login.html')

    @app.route('/signup')
    def signup():
        """Signup page."""
        return render_template('signup.html')

    @app.route('/logout')
    def logout():
        """Logout and redirect to login."""
        return render_template('login.html')

    @app.route('/portfolio')
    def portfolio():
        """Portfolio management page."""
        return render_template('portfolio.html')

    @app.route('/data')
    def data():
        """Data management page."""
        return render_template('data.html')

    @app.route('/analytics')
    def analytics():
        """Analytics and predictions page."""
        return render_template('analytics.html')

    @app.route('/settings')
    def settings():
        """Settings and configuration page."""
        return render_template('settings.html')

    @app.route('/health')
    def health():
        return jsonify({'status': 'ok'})

    @app.route('/upload-groww', methods=['POST'])
    def upload_groww():
        f = request.files.get('file')
        if not f:
            return jsonify({'error': 'file missing'}), 400
        
        import pandas as pd
        from .models import User
        
        # Ensure default user exists
        user = User.query.filter_by(id=1).first()
        if not user:
            user = User(id=1, email='admin@example.com', name='Default User')
            db.session.add(user)
            db.session.commit()
        
        df = pd.read_csv(f)
        p = Portfolio(user_id=1, name='groww-import', source='groww')
        db.session.add(p)
        db.session.flush()
        for _, row in df.iterrows():
            sym = row.get('Symbol') or row.get('Name')
            qty = row.get('Quantity', 0)
            avg = row.get('Avg. Price', 0)
            h = Holding(portfolio_id=p.id, symbol=sym, quantity=qty, avg_price=avg)
            db.session.add(h)
        db.session.commit()
        return jsonify({'status': 'imported', 'portfolio_id': p.id})

    @app.route('/fetch/<symbol>')
    def fetch_symbol(symbol):
        # call fetch and store synchronously (or enqueue in tasks)
        count = fetch_and_store_symbol(symbol)
        return jsonify({'status': 'fetched', 'symbol': symbol, 'rows': count})

    @app.route('/holdings')
    def list_holdings():
        hs = Holding.query.all()
        out = [{'symbol': h.symbol, 'qty': float(h.quantity or 0), 'avg': float(h.avg_price or 0)} for h in hs]
        return jsonify(out)

    @app.route('/clear-portfolio', methods=['POST'])
    def clear_portfolio():
        try:
            # Delete all holdings and portfolios
            Holding.query.delete()
            Portfolio.query.delete()
            db.session.commit()
            return jsonify({'status': 'success', 'message': 'Portfolio cleared successfully'})
        except Exception as e:
            db.session.rollback()
            return jsonify({'status': 'error', 'message': str(e)}), 500

    @app.route('/api/chart/<symbol>')
    def get_chart_data(symbol):
        from .models import HistoricalPrice
        from datetime import datetime, timedelta
        
        # Get last 6 months of data by default
        end_date = datetime.now()
        start_date = end_date - timedelta(days=180)
        
        prices = HistoricalPrice.query.filter(
            HistoricalPrice.symbol == symbol,
            HistoricalPrice.dt >= start_date
        ).order_by(HistoricalPrice.dt).all()
        
        if not prices:
            return jsonify({'error': f'No data found for {symbol}'}), 404
            
        chart_data = {
            'labels': [p.dt.strftime('%Y-%m-%d') for p in prices],
            'prices': [float(p.close) for p in prices],
            'volumes': [int(p.volume) for p in prices],
            'symbol': symbol,
            'count': len(prices)
        }
        
        return jsonify(chart_data)

    @app.route('/api/recent-data')
    def get_recent_data():
        from .models import HistoricalPrice
        from datetime import datetime, timedelta
        
        # Get recent data from last 7 days, grouped by symbol
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)
        
        recent_prices = HistoricalPrice.query.filter(
            HistoricalPrice.dt >= start_date
        ).order_by(HistoricalPrice.dt.desc()).limit(100).all()
        
        if not recent_prices:
            return jsonify([])
            
        data = []
        for price in recent_prices:
            data.append({
                'symbol': price.symbol,
                'date': price.dt.strftime('%Y-%m-%d'),
                'time': price.dt.strftime('%H:%M'),
                'open': float(price.open),
                'high': float(price.high),
                'low': float(price.low),
                'close': float(price.close),
                'volume': int(price.volume),
                'change': 0,  # Calculate change if needed
                'change_percent': 0  # Calculate change percent if needed
            })
        
        return jsonify(data)

    @app.route('/api/portfolio-analytics')
    def portfolio_analytics():
        """Get portfolio analytics data for charts and analysis"""
        hs = Holding.query.all()
        
        # Calculate portfolio metrics
        total_value = sum(float(h.quantity or 0) * float(h.avg_price or 0) for h in hs)
        total_stocks = len(hs)
        
        # Portfolio composition data for pie chart
        composition = []
        for h in hs:
            value = float(h.quantity or 0) * float(h.avg_price or 0)
            composition.append({
                'symbol': h.symbol,
                'quantity': float(h.quantity or 0),
                'avg_price': float(h.avg_price or 0),
                'value': value,
                'percentage': (value / total_value * 100) if total_value > 0 else 0
            })
        
        # Sort by value descending
        composition.sort(key=lambda x: x['value'], reverse=True)
        
        return jsonify({
            'total_value': total_value,
            'total_stocks': total_stocks,
            'composition': composition,
            'top_holdings': composition[:10]  # Top 10 holdings
        })

    @app.route('/api/portfolio-symbols')
    def portfolio_symbols():
        """Get all symbols in the portfolio for dropdowns"""
        hs = Holding.query.all()
        symbols = [{'value': h.symbol, 'label': h.symbol} for h in hs]
        return jsonify(symbols)
