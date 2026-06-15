const fs = require('fs');
const path = require('path');

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
  const startTime = Date.now();

  try {
    // 1. Get league standings to find all teams
    console.log(`Fetching standings for league ${leagueId}...`);
    const standingsRes = await fetch(`${BZZOIRO_API_URL}/leagues/${leagueId}/standings/`, {
      headers: { 'Authorization': `Token ${apiKey}`, 'Accept': 'application/json' }
    });
    
    if (!standingsRes.ok) {
      console.error('Error fetching standings:', standingsRes.statusText);
      return;
    }
    
    const standingsData = await standingsRes.ok ? await standingsRes.json() : null;
    const teams = standingsData?.standings || [];
    console.log(`Found ${teams.length} teams in league ${leagueId}.`);
    
    if (teams.length === 0) {
      console.log('No teams found in standings.');
      return;
    }

    // 2. Fetch squads for all teams in parallel
    console.log('Fetching squads in parallel...');
    const squadPromises = teams.map(async (t) => {
      try {
        const squadRes = await fetch(`${BZZOIRO_API_URL}/teams/${t.team_id}/squad/`, {
          headers: { 'Authorization': `Token ${apiKey}`, 'Accept': 'application/json' }
        });
        if (squadRes.ok) {
          const squadData = await squadRes.json();
          return {
            teamId: t.team_id,
            teamName: t.team_name,
            players: squadData.players || []
          };
        }
      } catch (err) {
        // ignore
      }
      return { teamId: t.team_id, teamName: t.team_name, players: [] };
    });

    const allSquads = await Promise.all(squadPromises);
    console.log(`Fetched all squads in ${(Date.now() - startTime)}ms.`);

    let totalPlayers = 0;
    allSquads.forEach(s => {
      totalPlayers += s.players.length;
      console.log(`Team: "${s.teamName}" (ID: ${s.teamId}) - Players count: ${s.players.length}`);
    });
    console.log(`Total players in league: ${totalPlayers}`);
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
