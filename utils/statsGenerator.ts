// Seedable pseudo-random number generator using Murmur3/xxHash style hashing
function seedRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return function() {
    h = Math.imul(h ^ h >>> 16, 2246822507) | 0;
    h = Math.imul(h ^ h >>> 13, 3266489909) | 0;
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export interface PlayerStats {
  id: number;
  name: string;
  position: string;
  teamName: string;
  goals: number;
  assists: number;
  passes: number;
  yellowCards: number;
  redCards: number;
}

export interface LeagueStatsSummary {
  topGoals: PlayerStats[];
  topAssists: PlayerStats[];
  topPasses: PlayerStats[];
  topYellowCards: PlayerStats[];
  topRedCards: PlayerStats[];
}

export function generateLeagueStats(
  squads: { teamId: number; teamName: string; players: any[] }[],
  teamRankMap: Record<number, number>,
  leagueId: number
): LeagueStatsSummary {
  const allPlayers: PlayerStats[] = [];

  squads.forEach(s => {
    const rank = teamRankMap[s.teamId] || 10;
    // Multiplier weighting: players in top teams get higher stats (up to 1.35x), bottom teams lower (down to 0.7x)
    const rankWeight = 1.35 - (rank - 1) * 0.03;

    s.players.forEach(p => {
      const playerId = p.player_id || p.id;
      const random = seedRandom(`${playerId}-${p.name}-${leagueId}`);
      const rawPos = p.position?.toUpperCase() || 'M';
      
      // Normalize position
      let pos = 'M';
      if (rawPos.startsWith('F') || rawPos === 'A' || rawPos === 'FW' || rawPos === 'ATT') {
        pos = 'F';
      } else if (rawPos.startsWith('D') || rawPos === 'DF' || rawPos === 'DEF') {
        pos = 'D';
      } else if (rawPos.startsWith('G') || rawPos === 'GK') {
        pos = 'G';
      }

      let goals = 0;
      let assists = 0;
      let passes = 0;
      let yellowCards = 0;
      let redCards = 0;

      if (pos === 'F') {
        goals = Math.round((random() * 14 + 3) * rankWeight);
        assists = Math.round((random() * 7 + 1) * rankWeight);
        passes = Math.round(random() * 250 + 100);
        yellowCards = Math.floor(random() * 4);
        redCards = random() > 0.97 ? 1 : 0;
      } else if (pos === 'M') {
        goals = Math.round((random() * 6 + 1) * rankWeight);
        assists = Math.round((random() * 11 + 2) * rankWeight);
        passes = Math.round((random() * 700 + 500) * rankWeight);
        yellowCards = Math.floor(random() * 7) + 1;
        redCards = random() > 0.92 ? 1 : 0;
      } else if (pos === 'D') {
        goals = Math.round((random() * 2) * rankWeight);
        assists = Math.round((random() * 3) * rankWeight);
        passes = Math.round((random() * 800 + 400) * rankWeight);
        yellowCards = Math.floor(random() * 9) + 2;
        redCards = random() > 0.86 ? 1 : 0;
      } else if (pos === 'G') {
        goals = 0;
        assists = random() > 0.985 ? 1 : 0;
        passes = Math.round(random() * 350 + 150);
        yellowCards = Math.floor(random() * 2);
        redCards = random() > 0.992 ? 1 : 0;
      }

      // Ensure stats don't drop below 0 due to negative weighting
      goals = Math.max(0, goals);
      assists = Math.max(0, assists);

      allPlayers.push({
        id: playerId,
        name: p.name,
        position: pos,
        teamName: s.teamName,
        goals,
        assists,
        passes,
        yellowCards,
        redCards
      });
    });
  });

  // Sort and extract top 10 for each category
  const topGoals = [...allPlayers]
    .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name))
    .slice(0, 10);

  const topAssists = [...allPlayers]
    .sort((a, b) => b.assists - a.assists || a.name.localeCompare(b.name))
    .slice(0, 10);

  const topPasses = [...allPlayers]
    .sort((a, b) => b.passes - a.passes || a.name.localeCompare(b.name))
    .slice(0, 10);

  const topYellowCards = [...allPlayers]
    .sort((a, b) => b.yellowCards - a.yellowCards || a.name.localeCompare(b.name))
    .slice(0, 10);

  const topRedCards = [...allPlayers]
    .sort((a, b) => b.redCards - a.redCards || b.yellowCards - a.yellowCards || a.name.localeCompare(b.name))
    .slice(0, 10);

  return {
    topGoals,
    topAssists,
    topPasses,
    topYellowCards,
    topRedCards
  };
}
