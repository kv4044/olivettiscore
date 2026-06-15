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
        console.log(`First item:`, JSON.stringify(data[0]));
      } else if (data.players && Array.isArray(data.players)) {
        console.log(`First player:`, JSON.stringify(data.players[0]));
      } else if (data.results && Array.isArray(data.results)) {
        console.log(`First result:`, JSON.stringify(data.results[0]));
      } else {
        console.log(`Data:`, JSON.stringify(data).substring(0, 500));
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
  await checkEndpoint('/teams/2820/squad/');
  await checkEndpoint('/worldcup/squads/');
}

run();
