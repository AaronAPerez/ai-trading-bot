-- Create orders table for storing Alpaca order data
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id TEXT UNIQUE NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  type TEXT NOT NULL,
  qty NUMERIC,
  notional NUMERIC,
  filled_qty NUMERIC DEFAULT 0,
  filled_avg_price NUMERIC,
  limit_price NUMERIC,
  stop_price NUMERIC,
  status TEXT NOT NULL,
  time_in_force TEXT,
  order_class TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ NOT NULL,
  filled_at TIMESTAMPTZ,
  extended_hours BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_symbol ON orders(symbol);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_filled_at ON orders(filled_at DESC) WHERE filled_at IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Service role can insert orders"
  ON orders FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update orders"
  ON orders FOR UPDATE
  USING (auth.role() = 'service_role');

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE orders IS 'Stores trading orders from Alpaca API';
COMMENT ON COLUMN orders.order_id IS 'Alpaca order ID (unique identifier from Alpaca)';
COMMENT ON COLUMN orders.symbol IS 'Trading symbol (e.g., AAPL, TSLA)';
COMMENT ON COLUMN orders.side IS 'Order side: buy or sell';
COMMENT ON COLUMN orders.type IS 'Order type (market, limit, stop, etc.)';
COMMENT ON COLUMN orders.qty IS 'Order quantity in shares';
COMMENT ON COLUMN orders.notional IS 'Order value in dollars';
COMMENT ON COLUMN orders.filled_qty IS 'Filled quantity in shares';
COMMENT ON COLUMN orders.filled_avg_price IS 'Average fill price';
COMMENT ON COLUMN orders.status IS 'Order status (new, filled, canceled, etc.)';
