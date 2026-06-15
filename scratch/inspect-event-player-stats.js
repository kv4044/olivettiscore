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

async function checkEndpoint(endpoint) {
  const url = `${BZZOIRO_API_URL}${endpoint}`;
  console.log(`Checking ${url}...`);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Accept': 'application/json',
      }
    });
    console.log(`Status: ${response.status} ${response.statusText}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`Data keys:`, Object.keys(data));
      if (Array.isArray(data)) {
        console.log(`Array size: ${data.length}`);
        console.log(`First item:`, JSON.stringify(data[0]).substring(0, 1000));
      } else if (data.results && Array.isArray(data.results)) {
        console.log(`Results size: ${data.results.length}`);
        console.log(`First item:`, JSON.stringify(data.results[0]).substring(0, 1000));
      } else {
        console.log(`Data:`, JSON.stringify(data).substring(0, 1000));
      }
    } else {
      const text = await response.text();
      console.log(`Error:`, text.substring(0, 200));
    }
  } catch (err) {
    console.error(`Fetch error:`, err.message);
  }
  console.log('----------------------------------------------------');
}

async function run() {
  // Let's first fetch some finished events of league 2 (Liga Portugal) to get a valid event_id
  const eventsUrl = `${BZZOIRO_API_URL}/events/?league_id=2&status=finished`;
  console.log(`Fetching finished events: ${eventsUrl}`);
  try {
    const res = await fetch(eventsUrl, {
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Accept': 'application/json',
      }
    });
    if (res.ok) {
      const eventsData = await res.json();
      const events = eventsData.results || eventsData || [];
      console.log(`Fetched ${events.length} events`);
      if (events.length > 0) {
        const firstEventId = events[0].id;
        console.log(`First event ID: ${firstEventId} (${events[0].home_team} vs ${events[0].away_team})`);
        await checkEndpoint(`/events/${firstEventId}/player-stats/`);
      } else {
        console.log('No finished events found for league 2.');
      }
    } else {
      console.log('Failed to fetch finished events', res.status);
    }
  } catch (err) {
    console.error('Error in run:', err.message);
  }
}

run();
