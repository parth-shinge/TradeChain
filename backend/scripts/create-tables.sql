-- TradeChain Database Schema
-- Run: psql -d tradechain -f create-tables.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================== ENUM TYPES =====================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('ADMIN', 'CFA', 'DISTRIBUTOR', 'STOCKIST', 'PHARMACY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE product_category AS ENUM ('VACCINE', 'TABLET', 'SYRUP', 'INJECTION', 'OINTMENT', 'DIAGNOSTIC');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE order_level AS ENUM ('PRIMARY', 'SECONDARY', 'TERTIARY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('CREATED', 'DISPATCHED', 'DELIVERED', 'DISPUTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE dispute_reason AS ENUM ('QUANTITY_MISMATCH', 'DAMAGED', 'EXPIRED', 'WRONG_PRODUCT', 'COLD_CHAIN_BREAK', 'COUNTERFEIT_SUSPECT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE dispute_status AS ENUM ('OPEN', 'RESOLVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===================== TABLES =====================

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address  TEXT UNIQUE NOT NULL,
  sap_code        TEXT UNIQUE NOT NULL,
  sap_name        TEXT NOT NULL,
  role            user_role NOT NULL,
  drug_license_no TEXT,
  mobile_no       TEXT,
  city            TEXT,
  region          TEXT,
  approved        BOOLEAN DEFAULT FALSE,
  registered_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Products (drugs/medicines)
CREATE TABLE IF NOT EXISTS products (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_sap_code   TEXT UNIQUE NOT NULL,
  drug_name           TEXT NOT NULL,
  generic_name        TEXT,
  hsn_code            TEXT,
  category            product_category NOT NULL,
  requires_cold_chain BOOLEAN DEFAULT FALSE,
  max_temp_celsius    DECIMAL,
  shelf_life_days     INTEGER,
  schedule            TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Batches
CREATE TABLE IF NOT EXISTS batches (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id            UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batch_number          TEXT UNIQUE NOT NULL,
  manufacture_date      DATE NOT NULL,
  expiry_date           DATE NOT NULL,
  quantity_manufactured INTEGER NOT NULL,
  lab_report_ipfs_hash  TEXT,
  blockchain_tx_hash    TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Orders
CREATE TABLE IF NOT EXISTS orders (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_code              TEXT UNIQUE NOT NULL,
  bill_number             TEXT,
  from_sap_code           TEXT NOT NULL REFERENCES users(sap_code),
  to_sap_code             TEXT NOT NULL REFERENCES users(sap_code),
  order_level             order_level,
  sale_date               DATE,
  total_amount            DECIMAL DEFAULT 0,
  status                  order_status DEFAULT 'CREATED',
  temperature_at_dispatch DECIMAL,
  temperature_at_receipt  DECIMAL,
  dispatch_timestamp      TIMESTAMPTZ,
  delivery_timestamp      TIMESTAMPTZ,
  qr_code_payload         JSONB,
  blockchain_tx_hash      TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  material_sap_code   TEXT NOT NULL,
  drug_name           TEXT NOT NULL,
  batch_number        TEXT,
  quantity_dispatched  INTEGER NOT NULL,
  quantity_received    INTEGER,
  quantity_mismatch   INTEGER DEFAULT 0,
  expiry_date         DATE,
  amount              DECIMAL DEFAULT 0
);

-- 6. Disputes
CREATE TABLE IF NOT EXISTS disputes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  raised_by_sap_code  TEXT NOT NULL REFERENCES users(sap_code),
  reason              dispute_reason NOT NULL,
  description         TEXT,
  evidence_ipfs_hash  TEXT,
  status              dispute_status DEFAULT 'OPEN',
  resolution_notes    TEXT,
  blockchain_tx_hash  TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  resolved_at         TIMESTAMPTZ
);

-- 7. Schemes
CREATE TABLE IF NOT EXISTS schemes (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title                     TEXT NOT NULL,
  product_material_sap_code TEXT,
  valid_from                TIMESTAMPTZ NOT NULL,
  valid_to                  TIMESTAMPTZ NOT NULL,
  terms_hash                TEXT,
  is_active                 BOOLEAN DEFAULT TRUE,
  blockchain_tx_hash        TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Claude AI Logs
CREATE TABLE IF NOT EXISTS claude_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feature       TEXT NOT NULL,
  prompt_text   TEXT,
  response_text TEXT,
  tokens_used   INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ===================== INDEXES =====================
CREATE INDEX IF NOT EXISTS idx_users_sap_code ON users(sap_code);
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_from_sap ON orders(from_sap_code);
CREATE INDEX IF NOT EXISTS idx_orders_to_sap ON orders(to_sap_code);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_batches_product ON batches(product_id);
CREATE INDEX IF NOT EXISTS idx_disputes_order ON disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_schemes_product ON schemes(product_material_sap_code);
