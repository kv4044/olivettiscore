const fs = require('fs');
const path = require('path');

// Seedable PRNG helper
function seedRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return function() {
    h = Math.imul(h ^ h >>> 16, 2246822507) | 0;
    h = Math.imul(h ^ h >>> 13, 3266489909) | 0;
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// Load env variables
const envLocalPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const index = trimmed.indexOf('=');
    if (index === -1) return;
    const key = trimmed.substring(0, index).trim();
    let val = trimmed.substring(index + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1);
    }
    process.env[key] = val;
  });
}

const BZZOIRO_API_URL = 'https://sports.bzzoiro.com/api/v2';
const apiKey = process.env.BZZOIRO_API_KEY;

async function run() {
  const leagueId = 2; // Liga Portugal
  try {
    // 1. Fetch standings
    const standingsRes = await fetch(`${BZZOIRO_API_URL}/leagues/${leagueId}/standings/`, {
      headers: { 'Authorization': `Token ${apiKey}`, 'Accept': 'application/json' }
    });
    const standingsData = await standingsRes.json();
    const teams = standingsData?.standings || [];

    // Map team_id to standings position to weight stats
    const teamRankMap = {};
    teams.forEach(t => {
      teamRankMap[t.team_id] = t.position;
    });

    // 2. Fetch squads
    console.log('Fetching squads...');
    const squadPromises = teams.slice(0, 5).map(async (t) => { // check first 5 teams for testing
      const squadRes = await fetch(`${BZZOIRO_API_URL}/teams/${t.team_id}/squad/`, {
        headers: { 'Authorization': `Token ${apiKey}`, 'Accept': 'application/json' }
      });
      const squadData = await squadRes.json();
      return {
        teamId: t.team_id,
        teamName: t.team_name,
        players: squadData.players || []
      };
    });

    const squads = await Promise.all(squadPromises);

    // 3. Generate stats
    const allPlayers = [];
    squads.forEach(s => {
      const rank = teamRankMap[s.teamId] || 10;
      // Weight multiplier: top teams get higher stats (up to 1.35x), bottom get lower (down to 0.7x)
      const rankWeight = 1.35 - (rank - 1) * 0.03;

      s.players.forEach(p => {
        const random = seedRandom(`${p.id}-${p.name}-${leagueId}`);
        const pos = p.position?.toUpperCase() || 'M';

        let goals = 0;
        let assists = 0;
        let passes = 0;
        let yellowCards = 0;
        let redCards = 0;

        if (pos.startsWith('F') || pos === 'A') { // Forward / Attacker
          goals = Math.round((random() * 14 + 3) * rankWeight);
          assists = Math.round((random() * 7 + 1) * rankWeight);
          passes = Math.round(random() * 250 + 100);
          yellowCards = Math.floor(random() * 4);
          redCards = random() > 0.97 ? 1 : 0;
        } else if (pos.startsWith('M')) { // Midfielder
          goals = Math.round((random() * 6 + 1) * rankWeight);
          assists = Math.round((random() * 11 + 2) * rankWeight);
          passes = Math.round((random() * 700 + 500) * rankWeight);
          yellowCards = Math.floor(random() * 7) + 1;
          redCards = random() > 0.92 ? 1 : 0;
        } else if (pos.startsWith('D')) { // Defender
          goals = Math.round((random() * 2) * rankWeight);
          assists = Math.round((random() * 3) * rankWeight);
          passes = Math.round((random() * 800 + 400) * rankWeight);
          yellowCards = Math.floor(random() * 9) + 2;
          redCards = random() > 0.86 ? 1 : 0;
        } else if (pos.startsWith('G') || pos === 'GK') { // Goalkeeper
          goals = 0;
          assists = random() > 0.98 ? 1 : 0;
          passes = Math.round(random() * 350 + 150);
          yellowCards = Math.floor(random() * 2);
          redCards = random() > 0.99 ? 1 : 0;
        }

        allPlayers.push({
          id: p.id,
          name: p.name,
          position: pos,
          teamName: s.teamName,
          goals,
          assists,
          passes,
          yellowCards,
          redCards
        });
      });
    });

    // 4. Sort and print top lists
    console.log('\n=== TOP GOALS ===');
    const topGoals = [...allPlayers].sort((a, b) => b.goals - a.goals).slice(0, 5);
    topGoals.forEach((p, idx) => console.log(`${idx+1}. ${p.name} (${p.teamName}, ${p.position}) - ${p.goals} goals`));

    console.log('\n=== TOP ASSISTS ===');
    const topAssists = [...allPlayers].sort((a, b) => b.assists - a.assists).slice(0, 5);
    topAssists.forEach((p, idx) => console.log(`${idx+1}. ${p.name} (${p.teamName}, ${p.position}) - ${p.assists} assists`));

    console.log('\n=== TOP PASSES ===');
    const topPasses = [...allPlayers].sort((a, b) => b.passes - a.passes).slice(0, 5);
    topPasses.forEach((p, idx) => console.log(`${idx+1}. ${p.name} (${p.teamName}, ${p.position}) - ${p.passes} passes`));

  } catch (err) {
    console.error('Error:', err);
  }
}

run();
