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

async function checkEndpoint(endpoint, params = {}) {
  const url = new URL(`${BZZOIRO_API_URL}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  console.log(`Checking ${url.toString()}...`);
  try {
    const response = await fetch(url.toString(), {
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
      if (Array.isArray(data)) {
        console.log(`Array size: ${data.length}. First item:`, JSON.stringify(data[0]).substring(0, 800));
      } else if (data.results && Array.isArray(data.results)) {
        console.log(`Results size: ${data.results.length}. First item:`, JSON.stringify(data.results[0]).substring(0, 800));
      } else {
        console.log(`Data:`, JSON.stringify(data).substring(0, 800));
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
  const endpoints = [
    '/leagues/2/top_scorers/',
    '/leagues/2/top_assists/',
    '/leagues/2/top_passes/',
    '/leagues/2/top_cards/',
    '/leagues/2/top-stats/',
    '/leagues/2/stats/players/',
    '/leagues/2/players/stats/'
  ];
  for (const ep of endpoints) {
    await checkEndpoint(ep);
  }
}

run();
