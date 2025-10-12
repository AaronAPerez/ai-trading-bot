CREATE OR REPLACE VIEW public.bot_win_rate_summary AS
SELECT
  user_id,
  COUNT(*) AS total_trades,
  COUNT(*) FILTER (WHERE pnl > 0) AS winning_trades,
  COUNT(*) FILTER (WHERE pnl <= 0) AS losing_trades,
  ROUND(COUNT(*) FILTER (WHERE pnl > 0)::decimal / NULLIF(COUNT(*), 0), 4) AS win_rate,
  ROUND(SUM(pnl)::numeric, 2) AS total_pnl,
  ROUND(AVG(pnl)::numeric, 4) AS avg_return
FROM public.trade_history
WHERE status = 'FILLED'
GROUP BY user_id;

CREATE OR REPLACE VIEW public.bot_drawdown_tracker AS
SELECT
  user_id,
  symbol,
  MAX(pnl) AS peak_pnl,
  MIN(pnl) AS trough_pnl,
  ROUND((MAX(pnl) - MIN(pnl))::numeric, 2) AS drawdown,
  ROUND((MIN(pnl)::decimal / NULLIF(MAX(pnl), 0)), 4) AS drawdown_ratio
FROM public.trade_history
WHERE status = 'FILLED'
GROUP BY user_id, symbol;

CREATE OR REPLACE VIEW public.strategy_performance_summary AS
SELECT
  user_id,
  strategy,
  COUNT(*) AS trades,
  ROUND(AVG(pnl)::numeric, 4) AS avg_pnl,
  ROUND(SUM(pnl)::numeric, 2) AS total_pnl,
  ROUND(COUNT(*) FILTER (WHERE pnl > 0)::decimal / NULLIF(COUNT(*), 0), 4) AS win_rate
FROM public.trade_history
WHERE status = 'FILLED'
GROUP BY user_id, strategy;

CREATE OR REPLACE VIEW public.execution_quality_metrics AS
SELECT
  user_id,
  symbol,
  ROUND(AVG(price)::numeric, 4) AS avg_fill_price,
  ROUND(AVG(ai_confidence)::numeric, 4) AS avg_confidence,
  ROUND(AVG(fees)::numeric, 4) AS avg_fees,
  ROUND(AVG(pnl)::numeric, 4) AS avg_pnl,
  COUNT(*) AS trades
FROM public.trade_history
WHERE status = 'FILLED'
GROUP BY user_id, symbol;

CREATE TABLE public.strategy_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  strategy text NOT NULL,
  status text CHECK (status IN ('active', 'paused', 'underperforming', 'drawdownBreached')),
  win_rate numeric,
  drawdown numeric,
  last_updated timestamptz DEFAULT now()
);


create or replace view execution_quality_metrics as
select
  user_id,
  avg(slippage) as avg_slippage,
  avg(latency_ms) as avg_latency,
  count(*) as trades_executed
from trade_history
group by user_id;