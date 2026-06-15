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

if (!apiKey) {
  console.error('Missing BZZOIRO_API_KEY in env');
  process.exit(1);
}

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
      console.log(`Success! Keys:`, Object.keys(data));
      // Print first level details or first element if array
      if (Array.isArray(data)) {
        console.log(`Array of length ${data.length}. First item:`, JSON.stringify(data[0]).substring(0, 500));
      } else if (data.results && Array.isArray(data.results)) {
        console.log(`Object with results array of length ${data.results.length}. First item:`, JSON.stringify(data.results[0]).substring(0, 500));
      } else {
        console.log(`Object value:`, JSON.stringify(data).substring(0, 500));
      }
    } else {
      const text = await response.text();
      console.log(`Error body:`, text.substring(0, 200));
    }
  } catch (err) {
    console.error(`Fetch error:`, err.message);
  }
  console.log('----------------------------------------------------');
}

async function run() {
  const endpoints = [
    '/leagues/2/stats/',
    '/leagues/2/topscorers/',
    '/leagues/2/top-scorers/',
    '/leagues/2/players/',
    '/leagues/2/scorers/',
    '/leagues/2/players/stats/',
    '/leagues/2/player-stats/',
    '/players/',
    '/stats/players/'
  ];
  for (const ep of endpoints) {
    await checkEndpoint(ep);
  }
}

run();
