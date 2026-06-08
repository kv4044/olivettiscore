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

const BZZOIRO_API_KEY = process.env.BZZOIRO_API_KEY;
const BZZOIRO_API_URL = 'https://sports.bzzoiro.com/api/v2';

async function checkLeagueEvents(leagueId) {
  const url = `${BZZOIRO_API_URL}/events/?league_id=${leagueId}`;
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Token ${BZZOIRO_API_KEY}`,
        'Accept': 'application/json'
      }
    });
    if (!response.ok) return { id: leagueId, error: response.statusText };
    const data = await response.json();
    const results = data.results || data || [];
    return { id: leagueId, count: results.length, sample: results[0]?.home_team + ' vs ' + results[0]?.away_team };
  } catch (error) {
    return { id: leagueId, error: error.message };
  }
}

async function run() {
  for (const id of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    const res = await checkLeagueEvents(id);
    console.log(`League ID ${id}:`, res);
  }
}

run();
