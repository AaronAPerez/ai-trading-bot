-- File: supabase/functions/evaluate_engine.sql

create or replace function public.evaluate_engine()
returns void as $$
declare
  user_id uuid;
  win_rate numeric;
  drawdown numeric;
begin
  -- Replace with your actual user ID logic
  select id into user_id from auth.users limit 1;

  -- Fetch metrics
  select win_rate, drawdown into win_rate, drawdown
  from bot_win_rate_summary
  where user_id = user_id;

  -- Switch mode
  if win_rate > 0.7 and drawdown < 0.1 then
    insert into bot_activity_logs (user_id, timestamp, type, message, status)
    values (user_id, now(), 'system', 'Engine mode switched to LIVE', 'completed');
  elsif win_rate > 0.6 then
    insert into bot_activity_logs (user_id, timestamp, type, message, status)
    values (user_id, now(), 'system', 'Engine mode switched to PAPER', 'completed');
  else
    insert into bot_activity_logs (user_id, timestamp, type, message, status)
    values (user_id, now(), 'system', 'Engine mode switched to SIMULATION', 'completed');
  end if;

  -- Trigger retraining
  if win_rate < 0.4 then
    insert into bot_activity_logs (user_id, timestamp, type, message, status)
    values (user_id, now(), 'system', 'Retraining triggered due to low win rate', 'completed');
  end if;

  -- Halt strategies with drawdown breach
  update strategy_status
  set status = 'drawdownBreached', last_updated = now()
  where user_id = user_id and drawdown > 0.15;

end;
$$ language plpgsql;