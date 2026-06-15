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
      console.log(`Count:`, data.count);
      console.log(`Results length:`, data.results ? data.results.length : 'N/A');
      if (data.results && data.results.length > 0) {
        console.log(`First item:`, JSON.stringify(data.results[0]).substring(0, 300));
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
  await checkEndpoint('/players/', { league_id: '2' });
  await checkEndpoint('/players/', { league_id: '2', ordering: '-market_value_eur' });
  await checkEndpoint('/players/', { league_id: '2', ordering: '-rating' });
  await checkEndpoint('/players/', { league_id: '2', ordering: '-goals' });
}

run();
