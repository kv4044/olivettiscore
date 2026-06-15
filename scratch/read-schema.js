const fs = require('fs');

async function run() {
  const url = 'https://sports.bzzoiro.com/static/docs/football-schema.json';
  console.log(`Fetching schema...`);
  try {
    const res = await fetch(url);
    const data = await res.json();
    const wcPath = data.paths['/api/v2/worldcup/squads/'];
    if (wcPath && wcPath.get) {
      console.log('GET /api/v2/worldcup/squads/ parameters:');
      const params = wcPath.get.parameters || [];
      params.forEach(p => {
        console.log(`- ${p.name} (${p.in}): ${p.description || ''}`);
      });
    } else {
      console.log('No GET /api/v2/worldcup/squads/ found');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
