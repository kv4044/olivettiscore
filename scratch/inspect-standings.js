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
  const url = `${BZZOIRO_API_URL}/leagues/2/standings/`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Accept': 'application/json',
      }
    });
    const data = await response.json();
    console.log('Standings keys:', Object.keys(data));
    if (data.standings && data.standings.length > 0) {
      console.log('First standings row:', JSON.stringify(data.standings[0]));
    }
    // Print other keys if present
    Object.keys(data).forEach(k => {
      if (k !== 'standings' && k !== 'groups') {
        console.log(`Key "${k}":`, data[k]);
      }
    });
  } catch (err) {
    console.error(err);
  }
}

run();
