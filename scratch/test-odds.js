const apiKey = '07157ad525bec90d2c929076b61549ff4efb45fb';
const baseUrl = 'https://sports.bzzoiro.com/api/v2';

async function run() {
  console.log('Fetching events...');
  const res = await fetch(`${baseUrl}/events/`, {
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Accept': 'application/json'
    }
  });
  const data = await res.json();
  const events = data.results || data || [];
  console.log(`Checking odds for ${events.length} events...`);
  
  for (const event of events) {
    const oddsRes = await fetch(`${baseUrl}/events/${event.id}/odds/`, {
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Accept': 'application/json'
      }
    });
    const oddsData = await oddsRes.json();
    if (oddsData.odds && (oddsData.odds.home_win !== null || oddsData.odds.draw !== null)) {
      console.log(`FOUND EVENT WITH ODDS: ID=${event.id}, Teams: ${event.home_team} vs ${event.away_team}`);
      console.log('Odds:', oddsData.odds);
      return;
    }
  }
  console.log('No events with active odds found in the first batch.');
}

run();
