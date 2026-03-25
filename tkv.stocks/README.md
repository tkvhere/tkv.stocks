# Tkv.stocks (Stock Predictor)

This project is a starter skeleton for a stock prediction service: Flask API, Postgres, Redis + RQ worker for background fetches, and a simple model helper.

Quickstart

1. Copy `.env.example` to `.env` and adjust values.
2. Build and start with Docker Compose:

```bash
docker-compose up --build
```

Endpoints

- `GET /health` — health check
- `GET /fetch/<symbol>` — fetch historical prices for symbol and store into DB
- `GET /holdings` — list holdings
- `POST /upload-groww` — upload a CSV to import holdings (form-data `file`)

Notes

- SQL migrations here are a single SQL file at `migrations/create_tables.sql`. Consider swapping to Alembic for production.
- Models are simple and for demonstration only.
- `fetch_prices` uses `yfinance` to get OHLCV and upserts into `historical_prices`.
