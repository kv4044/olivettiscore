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
  const leagueId = 2; // Liga Portugal
  const startTime = Date.now();
  console.log(`Aggregating stats for league ${leagueId}...`);

  try {
    // 1. Fetch finished events
    const eventsRes = await fetch(`${BZZOIRO_API_URL}/events/?league_id=${leagueId}&status=FT`, {
      headers: { 'Authorization': `Token ${apiKey}`, 'Accept': 'application/json' }
    });
    
    if (!eventsRes.ok) {
      console.error('Error fetching events:', eventsRes.statusText);
      return;
    }
    
    const eventsData = await eventsRes.json();
    const allEvents = eventsData.results || eventsData || [];
    // Sort by date desc
    const completedMatches = allEvents
      .filter(e => e.status === 'FT')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10); // Take last 10 matches

    console.log(`Fetched ${completedMatches.length} finished matches in ${(Date.now() - startTime)}ms`);

    // 2. Fetch player stats for each match in parallel
    const statsPromises = completedMatches.map(async (match) => {
      try {
        const statsRes = await fetch(`${BZZOIRO_API_URL}/events/${match.id}/player-stats/`, {
          headers: { 'Authorization': `Token ${apiKey}`, 'Accept': 'application/json' }
        });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          return statsData.player_stats || [];
        }
      } catch (err) {
        // ignore
      }
      return [];
    });

    const matchesPlayerStats = await Promise.all(statsPromises);
    console.log(`Fetched all player stats in ${(Date.now() - startTime)}ms`);

    // 3. Aggregate player stats
    const playerStatsMap = new Map();
    const playerNamesMap = new Map();
    const playerTeamsMap = new Map();

    // We need player details to get their names, but we can also fetch them or maybe player_stats has player details?
    // Wait, let's see what is inside matchesPlayerStats:
    // {"id":538118,"player_id":4844,"event_id":207459,"team_id":21,"minutes_played":90,"rating":7.6,"goals":1,"goal_assist":0}
    // Ah, player_stats only has player_id, not player name!
    // Wait, let's look at first player stats item in the console log of inspect-event-player-stats.js:
    // It has `player_id` but not `name`!
    // Wait! Let's check the keys of a player_stats item from our previous command output:
    // `{"id":538113,"player_id":2278,"event_id":207459,"team_id":21,"minutes_played":90,"rating":6.6,"touches":25,"goals":0,"goal_assist":0,...}`
    // Oh no! It doesn't have the player's name! It only has `player_id`!
    // To get the player's name, we would need to query `/players/{player_id}/` for each player! That would require even more API calls!
    
    // Wait, does the lineup endpoint have the player names?
    // Let's check `/events/{id}/lineups/`. It returns lineups with player names and IDs!
    // Yes! Let's check if the lineups endpoint matches player IDs with their names.
    // But wait! Is there any other way? What if we get the teams' squads?
    // A team squad returns all players of a team, e.g. `/teams/{id}/squad/`:
    // `{"team_id":2820,"count":7,"players":[{"id":60628,"name":"Bandar Al Barazi",...}]}`
    // This has player ID and player name!
    // If we fetch squads of all teams in the league (around 18 teams) and build a map of player_id -> player_name, we could resolve player names!
    // But wait, fetching squads for 18 teams is 18 API calls. Is that fast enough?
    // Let's write a quick script to test fetching squads for all teams in a league and resolving player names.

  } catch (err) {
    console.error('Error:', err);
  }
}

run();
