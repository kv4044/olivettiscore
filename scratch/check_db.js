const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zchtrhmwqokeqgdoyjlf.supabase.co/';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjaHRyaG13cW9rZXFnZG95amxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2ODIyMjYsImV4cCI6MjA5NTI1ODIyNn0.DnGuz8Dqg_Mugr0IGPu5l5eHUyWj_IC2bgagHxxrMN4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('player_stats')
    .select('*, teams(name)')
    .eq('league_id', 2);

  if (error) {
    console.error("Error querying Supabase:", error);
    return;
  }

  console.log(`Found ${data.length} player stats in Supabase`);
  
  // Sort and display top 5 goalscorers
  const topGoals = [...data].sort((a, b) => b.goals - a.goals).slice(0, 5);
  console.log("\nTop 5 Goalscorers:");
  topGoals.forEach((p, i) => {
    console.log(`${i+1}. ${p.player_name} (${p.teams?.name || 'Unknown Team'}): ${p.goals} goals`);
  });

  // Sort and display top 5 assists
  const topAssists = [...data].sort((a, b) => b.assists - a.assists).slice(0, 5);
  console.log("\nTop 5 Assist Leaders:");
  topAssists.forEach((p, i) => {
    console.log(`${i+1}. ${p.player_name} (${p.teams?.name || 'Unknown Team'}): ${p.assists} assists`);
  });

  // Sort and display top 5 passes
  const topPasses = [...data].sort((a, b) => b.passes - a.passes).slice(0, 5);
  console.log("\nTop 5 Passing Leaders:");
  topPasses.forEach((p, i) => {
    console.log(`${i+1}. ${p.player_name} (${p.teams?.name || 'Unknown Team'}): ${p.passes} passes`);
  });

  // Check if any player name is 'Jogador #...'
  const genericPlayers = data.filter(p => p.player_name.startsWith('Jogador #'));
  console.log(`\nGeneric players found: ${genericPlayers.length}`);
  if (genericPlayers.length > 0) {
    console.log("Sample generic players with stats:", genericPlayers.slice(0, 5).map(p => ({
      id: p.player_id,
      name: p.player_name,
      goals: p.goals,
      assists: p.assists
    })));
  }
}

run().catch(console.error);
