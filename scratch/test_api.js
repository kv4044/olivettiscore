const API_KEY = '07157ad525bec90d2c929076b61549ff4efb45fb';
const API_URL = 'https://sports.bzzoiro.com/api/v2';

async function run() {
  const playerId = 2278; // João Goulart
  const response = await fetch(`${API_URL}/players/${playerId}/`, {
    headers: {
      'Authorization': `Token ${API_KEY}`,
      'Accept': 'application/json'
    }
  });
  const data = await response.json();
  console.log("Player details:", JSON.stringify(data, null, 2));
}

run().catch(console.error);
