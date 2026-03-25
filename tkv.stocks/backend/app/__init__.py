from flask import Flask
import os
import atexit
from .config import Config
from .db import init_db
from .routes import register_routes

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from .tasks import enqueue_fetch


def create_app() -> Flask:
    app = Flask(__name__, template_folder='../templates', static_folder='../static')
    app.config.from_object(Config)

    init_db(app)
    register_routes(app)

    # start scheduler only once (avoid double-start when using Flask reloader)
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not app.debug:
        _start_scheduler(app)

    return app


def _start_scheduler(app: Flask) -> None:
    tickers = os.environ.get('YFINANCE_TICKERS', '')
    tickers = [t.strip() for t in tickers.split(',') if t.strip()]
    if not tickers:
        app.logger.info('No YFINANCE_TICKERS configured; scheduler not started.')
        return

    def fetch_all():
        app.logger.info('Scheduler: enqueueing fetch for %s', ','.join(tickers))
        for sym in tickers:
            try:
                enqueue_fetch(sym)
            except Exception:
                app.logger.exception('Failed to enqueue fetch for %s', sym)

    scheduler = BackgroundScheduler()
    # run daily at 01:00
    scheduler.add_job(fetch_all, CronTrigger(hour=1, minute=0), id='daily_fetch')
    scheduler.start()

    # ensure scheduler shuts down on exit
    atexit.register(lambda: scheduler.shutdown(wait=False))


app = create_app()


if __name__ == '__main__':
    app.run(host='0.0.0.0')
