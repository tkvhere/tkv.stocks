-- users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- portfolios
CREATE TABLE IF NOT EXISTS portfolios (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  source TEXT,
  cloud_link TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- holdings
CREATE TABLE IF NOT EXISTS holdings (
  id SERIAL PRIMARY KEY,
  portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  quantity NUMERIC,
  avg_price NUMERIC,
  last_updated TIMESTAMPTZ DEFAULT now()
);

-- historical_prices
CREATE TABLE IF NOT EXISTS historical_prices (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  dt TIMESTAMPTZ NOT NULL,
  open NUMERIC, high NUMERIC, low NUMERIC, close NUMERIC, volume BIGINT,
  source TEXT,
  UNIQUE(symbol, dt)
);
CREATE INDEX IF NOT EXISTS idx_hist_sym_dt ON historical_prices(symbol, dt DESC);

-- models
CREATE TABLE IF NOT EXISTS models (
  id SERIAL PRIMARY KEY,
  name TEXT,
  version TEXT,
  model_file_url TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  metrics JSONB
);

-- predictions
CREATE TABLE IF NOT EXISTS predictions (
  id BIGSERIAL PRIMARY KEY,
  model_id INTEGER REFERENCES models(id),
  symbol TEXT,
  predict_dt TIMESTAMPTZ DEFAULT now(),
  horizon INTEGER,
  predicted_value NUMERIC,
  metadata JSONB
);
CREATE INDEX IF NOT EXISTS idx_predictions_symbol_dt ON predictions(symbol, predict_dt DESC);
