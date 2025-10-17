const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://baycyvjefrgihwivymxb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJheWN5dmplZnJnaWh3aXZ5bXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0ODk1NjAsImV4cCI6MjA3MzA2NTU2MH0.4nNVDa10hUVhkvQ69VflSbuSkKjsY0Ds-MJUPXpqyAo'
);

(async () => {
  const { data, error } = await supabase
    .from('strategy_performance')
    .select('*')
    .order('total_pnl', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Strategy Performance Data:');
  console.log('='.repeat(80));
  data.forEach(s => {
    console.log(`${s.strategy_name} (${s.strategy_id}):`);
    console.log(`  Trades: ${s.total_trades} (W:${s.winning_trades}/L:${s.losing_trades})`);
    console.log(`  P&L: $${s.total_pnl} | Win Rate: ${s.win_rate}%`);
    console.log(`  Testing: ${s.testing_mode ? 'YES' : 'NO'} | Passed: ${s.test_passed}`);
    console.log('');
  });
})();
