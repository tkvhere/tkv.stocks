# Tkv.Stocks

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Flask-based stock portfolio and market data application with:

- PostgreSQL for persistence
- Redis + RQ for background jobs
- yfinance integration for historical price ingestion
- Jinja2 + vanilla JS dashboard UI
- APScheduler for daily automated data fetches

## Features

- Portfolio import via CSV (`/upload-groww`)
- Historical price fetching per symbol (`/fetch/<symbol>`)
- Portfolio analytics endpoint and Chart.js visualizations
- Background job support through Redis Queue (RQ)
- Daily scheduled fetch at 01:00 (server time) for configured tickers
- Multi-service Docker Compose setup (`db`, `redis`, `backend`, `worker`)

## Tech Stack

- Backend: Flask, Flask-SQLAlchemy, SQLAlchemy
- Data: pandas, yfinance
- Queue/Worker: redis, rq
- Scheduler: APScheduler
- Database: PostgreSQL 15
- Frontend: Jinja2 templates, vanilla JavaScript, Chart.js, CSS
- Containerization: Docker, Docker Compose

## Project Structure

```text
.
├── docker-compose.yml
├── fetch_test_data.py
├── migrations/
│   └── create_tables.sql
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── start.sh
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── db.py
│   │   ├── fetch_prices.py
│   │   ├── models.py
│   │   ├── routes.py
│   │   ├── tasks.py
│   │   └── utils.py
│   ├── static/
│   │   ├── css/style.css
│   │   └── js/app.js
│   └── templates/
│       ├── analytics.html
│       ├── base.html
│       ├── dashboard.html
│       ├── data.html
│       ├── login.html
│       ├── portfolio.html
│       ├── settings.html
│       └── signup.html
└── worker/
    ├── Dockerfile
    ├── requirements.txt
    └── worker.py
```

## Environment Variables

Defined in `.env.example`:

```env
FLASK_ENV=development
DATABASE_URL=postgresql://postgres:postgres@db:5432/stockdb
REDIS_URL=redis://redis:6379/0
SECRET_KEY=change_me
YFINANCE_TICKERS=RELIANCE.NS,TCS.NS
```

`backend/app/config.py` reads:

- `DATABASE_URL` -> `SQLALCHEMY_DATABASE_URI`
- `REDIS_URL`
- `SECRET_KEY` (default: `change_me`)

## Run with Docker (Recommended)

1. Copy env file:

```bash
cp .env.example .env
```

2. Start all services:

```bash
docker-compose up --build
```

3. Access services:

- App UI/API: `http://localhost:5001`
- PostgreSQL: `localhost:5433`
- Redis: `localhost:6380`

## Run Locally (Without Docker)

Prerequisites:

- Python 3.11+
- PostgreSQL
- Redis

1. Install dependencies:

```bash
cd backend
pip install -r requirements.txt
```

2. Configure environment values (copy from `.env.example` and adjust for local DB/Redis).

3. Initialize DB schema:

```bash
psql "$DATABASE_URL" -f migrations/create_tables.sql
```

4. Run Flask app:

Windows PowerShell:

```powershell
cd backend
$env:FLASK_APP = 'app.__init__'
flask run --host=0.0.0.0 --port=5000
```

Linux/macOS:

```bash
cd backend
export FLASK_APP=app.__init__
flask run --host=0.0.0.0 --port=5000
```

5. In another terminal, run the worker:

```bash
cd worker
pip install -r requirements.txt
python worker.py
```

## API & Page Routes

### Pages

- `GET /` -> Dashboard
- `GET /login` -> Login page
- `GET /signup` -> Signup page
- `GET /logout` -> Logout page (renders login page)
- `GET /portfolio` -> Portfolio management page
- `GET /data` -> Data management page
- `GET /analytics` -> Analytics page
- `GET /settings` -> Settings page

### APIs

- `GET /health` -> health check
- `GET /fetch/<symbol>` -> fetch and store historical data for symbol
- `GET /holdings` -> list portfolio holdings
- `POST /upload-groww` -> import holdings CSV (`file` form field)
- `POST /clear-portfolio` -> delete all holdings and portfolios
- `GET /api/chart/<symbol>` -> chart data for symbol
- `GET /api/recent-data` -> recent historical rows
- `GET /api/portfolio-analytics` -> portfolio analytics summary
- `GET /api/portfolio-symbols` -> symbol list for dropdowns

## Data Flow

1. Client requests fetch (`/fetch/<symbol>`), or scheduler runs daily.
2. `fetch_and_store_symbol()` downloads data via yfinance.
3. Rows are inserted into `historical_prices`.
4. Duplicate `(symbol, dt)` rows are skipped via unique constraint handling.
5. Background mode is supported by enqueuing jobs into Redis (`app/tasks.py`) and processing via `worker/worker.py`.

## Database

`migrations/create_tables.sql` creates:

- `users`
- `portfolios`
- `holdings`
- `historical_prices`
- `models`
- `predictions`

`historical_prices` has a uniqueness constraint on `(symbol, dt)` and an index on `(symbol, dt DESC)`.

## Scheduler

Configured in `backend/app/__init__.py`:

- Cron trigger: daily at 01:00
- Source tickers: `YFINANCE_TICKERS`
- Action: enqueue fetch job per ticker

If no tickers are configured, scheduler does not start.

## Quick Test Data

Use the helper script to preload historical data for sample Indian tickers:

```bash
python fetch_test_data.py
```

## Current Limitations

- Login and signup pages are UI-only; no backend authentication/session enforcement
- Several settings/prediction controls in templates are placeholder UX
- Manual stock entry form in portfolio page is not wired to a backend endpoint
- Migrations are SQL-file based; no active migration workflow in use
- Most portfolio operations currently assume default user context (`user_id=1` in import flow)

## Contributing

1. Fork and clone the repository
2. Create a feature branch
3. Make focused commits
4. Open a pull request with clear testing notes

For production hardening, consider adding:

- Authentication and authorization
- Alembic migration management
- Automated tests (unit/integration)
- Stronger validation and rate limiting

## License

This project is licensed under the MIT License.

Copyright (c) 2026 tkv.stocks contributors.

See [LICENSE](LICENSE) for details.
