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
  const leagueId = 27; // World Cup
  try {
    const res = await fetch(`${BZZOIRO_API_URL}/leagues/${leagueId}/standings/`, {
      headers: { 'Authorization': `Token ${apiKey}`, 'Accept': 'application/json' }
    });
    console.log('Status World Cup Standings:', res.status);
    const data = await res.json();
    console.log('Grouped:', data.grouped);
    if (data.groups) {
      console.log('Group names:', Object.keys(data.groups));
      const firstGroup = Object.keys(data.groups)[0];
      console.log(`First group "${firstGroup}" teams:`, data.groups[firstGroup].map(t => ({ id: t.team_id, name: t.team_name })));
    } else if (data.standings) {
      console.log('Standings size:', data.standings.length);
    } else {
      console.log('No standings or groups', Object.keys(data));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
