import { getTeamsLogos, getLeaguesLogos, getLeaguesDetails } from './logoService'

// ─── Interfaces do Frontend (o que o UI espera) ────────────────────────────

export interface BzzoiroTeam {
  id: number;
  name: string;
  logo?: string;
  short_name?: string;
}

export interface BzzoiroLeague {
  id: number;
  name: string;
  country?: string;
  logo?: string;
}

export interface BzzoiroScore {
  home: number | null;
  away: number | null;
  halftime?: {
    home: number | null;
    away: number | null;
  };
}

export interface BzzoiroEvent {
  id: number;
  status: string; // 'LIVE' | 'FT' | 'HT' | 'NS' | ...
  minute: number | null;
  date: string;
  league: BzzoiroLeague;
  home_team: BzzoiroTeam;
  away_team: BzzoiroTeam;
  score: BzzoiroScore;
  venue_id: number | null;
  referee_id: number | null;
  weather?: {
    code: number | null;
    description: string | null;
    wind_speed: number | null;
    temperature_c: number | null;
  };
  pitch_condition: number | null;
  attendance: number | null;
  is_local_derby: boolean;
  predictions?: {
    home_win_prob?: number;
    draw_prob?: number;
    away_win_prob?: number;
  };
}

// ─── Interface Real da API Bzzoiro (flat) ───────────────────────────────────

interface RawBzzoiroEvent {
  id: number;
  league_id: number;
  season_id: number | null;
  home_team_id: number;
  home_team: string;
  away_team_id: number;
  away_team: string;
  home_coach_id: number | null;
  away_coach_id: number | null;
  referee_id: number | null;
  venue_id: number | null;
  event_date: string;
  status: string;        // 'notstarted' | 'inprogress' | 'finished' | 'cancelled' | ...
  period: string;        // '' | 'FT' | 'HT' | '1H' | '2H' | ...
  current_minute: number | null;
  home_score: number | null;
  away_score: number | null;
  home_score_ht: number | null;
  away_score_ht: number | null;
  round_number: number | null;
  round_name: string;
  group_name: string | null;
  is_local_derby: boolean;
  is_neutral_ground: boolean;
  travel_distance_km: number | null;
  weather: {
    code: number | null;
    description: string | null;
    wind_speed: number | null;
    temperature_c: number | null;
  };
  pitch_condition: number | null;
  attendance: number | null;
  live_websocket: boolean;
  replaced_by: number | null;
}

// ─── Mapa de IDs de Liga → Nome ─────────────────────────────────────────────
// Preenche com os IDs da API Bzzoiro à medida que forem descobertos.

const LEAGUE_NAMES: Record<number, { name: string; country: string }> = {
  1:  { name: 'Premier League',                 country: 'Inglaterra'    },
  2:  { name: 'Liga Portugal',                  country: 'Portugal'      },
  3:  { name: 'La Liga',                         country: 'Espanha'       },
  4:  { name: 'Serie A',                         country: 'Itália'        },
  5:  { name: 'Bundesliga',                      country: 'Alemanha'      },
  6:  { name: 'Ligue 1',                         country: 'França'        },
  7:  { name: 'Champions League',                country: 'Europa'        },
  8:  { name: 'Europa League',                   country: 'Europa'        },
  9:  { name: 'Série A',                         country: 'Brasil'        },
  10: { name: 'Eredivisie',                      country: 'Holanda'       },
  18: { name: 'MLS',                             country: 'EUA'           },
  20: { name: 'Liga MX',                         country: 'México'        },
  22: { name: 'Parva Liga',                      country: 'Bulgária'      },
  23: { name: 'Liga I',                          country: 'Roménia'       },
  26: { name: 'Allsvenskan',                     country: 'Suécia'        },
  27: { name: 'Mundial',                         country: 'Internacional' },
  34: { name: 'Série C',                         country: 'Brasil'        },
  54: { name: 'Eliteserien',                     country: 'Noruega'       },
};

// ─── Mapeamento de Status ────────────────────────────────────────────────────
// Normaliza o status da API para os valores que o UI conhece.

function mapStatus(raw: RawBzzoiroEvent): string {
  const status = raw.status?.toLowerCase();
  const period = raw.period?.toUpperCase();

  if (status === 'finished' || status === 'ft') return 'FT';
  if (status === 'ht' || status === 'halftime' || period === 'HT') return 'HT';
  if (status === 'inprogress' || status === 'live' || status === '1h' || status === '2h') {
    return 'LIVE';
  }
  if (status === 'cancelled' || status === 'postponed') return status.toUpperCase();
  return 'NS'; // notstarted e outros → Agendado
}

// ─── Transformação: Raw → BzzoiroEvent ──────────────────────────────────────

function transformEvent(raw: RawBzzoiroEvent): BzzoiroEvent {
  const leagueInfo = LEAGUE_NAMES[raw.league_id];

  return {
    id: raw.id,
    status: mapStatus(raw),
    minute: raw.current_minute,
    date: raw.event_date,
    league: {
      id: raw.league_id,
      name: leagueInfo?.name ?? `Liga #${raw.league_id}`,
      country: leagueInfo?.country,
    },
    home_team: {
      id: raw.home_team_id,
      name: raw.home_team,
    },
    away_team: {
      id: raw.away_team_id,
      name: raw.away_team,
    },
    score: {
      home: raw.home_score,
      away: raw.away_score,
      halftime: {
        home: raw.home_score_ht,
        away: raw.away_score_ht,
      },
    },
    venue_id: raw.venue_id,
    referee_id: raw.referee_id,
    weather: raw.weather,
    pitch_condition: raw.pitch_condition,
    attendance: raw.attendance,
    is_local_derby: raw.is_local_derby,
  };
}

// ─── Configuração Base ───────────────────────────────────────────────────────

const BZZOIRO_API_URL = 'https://sports.bzzoiro.com/api/v2';

async function fetchBzzoiro<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const apiKey = process.env.BZZOIRO_API_KEY;

  if (!apiKey) {
    throw new Error('A chave BZZOIRO_API_KEY não está configurada no ficheiro .env.local.');
  }

  const url = new URL(`${BZZOIRO_API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Accept': 'application/json',
    },
    next: { revalidate: 10 },
  });

  if (!response.ok) {
    const errText = await response.text();
    let errMsg = `Falha ao ligar à API Bzzoiro: ${response.statusText}`;
    try {
      const parsedErr = JSON.parse(errText);
      errMsg = parsedErr.detail || parsedErr.message || errMsg;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }

  return response.json() as Promise<T>;
}

// ─── Helpers para lidar com resposta paginada ou array direto ───────────────

async function fetchRawEvents(
  endpoint: string,
  params: Record<string, string> = {},
  fetchAll = false
): Promise<RawBzzoiroEvent[]> {
  if (fetchAll) {
    const allResults: RawBzzoiroEvent[] = [];
    const queryParams: Record<string, string> = { ...params, limit: params.limit || '200' };
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      queryParams.offset = String(offset);
      try {
        const data = await fetchBzzoiro<{ count: number; results: RawBzzoiroEvent[] }>(endpoint, queryParams);
        const results = data.results || data || [];
        if (!Array.isArray(results) || results.length === 0) {
          hasMore = false;
        } else {
          allResults.push(...(results as unknown as RawBzzoiroEvent[]));
          const totalCount = typeof data.count === 'number' ? data.count : 0;
          if (allResults.length >= totalCount || results.length < Number(queryParams.limit)) {
            hasMore = false;
          } else {
            offset += Number(queryParams.limit);
          }
        }
      } catch (error) {
        // Fallback para array plano ou erros
        try {
          const arr = await fetchBzzoiro<RawBzzoiroEvent[]>(endpoint, queryParams);
          if (Array.isArray(arr)) {
            allResults.push(...arr);
          }
        } catch {}
        hasMore = false;
      }
    }
    return allResults;
  }

  try {
    // Tenta primeiro o formato { results: [...] }
    const data = await fetchBzzoiro<{ results: RawBzzoiroEvent[] }>(endpoint, params);
    if (Array.isArray(data.results)) return data.results;
    // Caso a resposta seja diretamente um array
    if (Array.isArray(data)) return data as unknown as RawBzzoiroEvent[];
    return [];
  } catch (error) {
    // Fallback: tenta como array direto
    try {
      const arr = await fetchBzzoiro<RawBzzoiroEvent[]>(endpoint, params);
      if (Array.isArray(arr)) return arr;
      return [];
    } catch {
      throw error;
    }
  }
}

// ─── Enriquecimento de Logos ──────────────────────────────────────────────────

async function enrichEventsWithLogos(events: BzzoiroEvent[]): Promise<BzzoiroEvent[]> {
  if (events.length === 0) return events;

  const teamsToResolve: { id: number; name: string }[] = [];
  const leaguesToResolve: { id: number; name: string }[] = [];
  events.forEach((event) => {
    if (event.home_team && event.home_team.id && event.home_team.name) {
      teamsToResolve.push({ id: event.home_team.id, name: event.home_team.name });
    }
    if (event.away_team && event.away_team.id && event.away_team.name) {
      teamsToResolve.push({ id: event.away_team.id, name: event.away_team.name });
    }
    if (event.league && event.league.id && event.league.name) {
      leaguesToResolve.push({ id: event.league.id, name: event.league.name });
    }
  });

  try {
    const [logoMap, leagueDetailsMap] = await Promise.all([
      getTeamsLogos(teamsToResolve),
      getLeaguesDetails(leaguesToResolve)
    ]);
    
    events.forEach((event) => {
      if (event.home_team && logoMap[event.home_team.id]) {
        event.home_team.logo = logoMap[event.home_team.id];
      }
      if (event.away_team && logoMap[event.away_team.id]) {
        event.away_team.logo = logoMap[event.away_team.id];
      }
      if (event.league) {
        const details = leagueDetailsMap[event.league.id];
        if (details) {
          if (details.logoUrl) {
            event.league.logo = details.logoUrl;
          }
          // Se o nome atual for genérico (Liga #27), usa o nome correto da DB (ex: World Cup 2026)
          if (details.name && (event.league.name.startsWith('Liga #') || !event.league.name)) {
            event.league.name = details.name;
          }
          if (details.country && !event.league.country) {
            event.league.country = details.country;
          }
        }
      }
    });
  } catch (error) {
    console.error('[BzzoiroService] Erro ao enriquecer eventos com logos:', error);
  }

  return events;
}

// ─── Service Público ─────────────────────────────────────────────────────────

export const bzzoiroService = {
  /**
   * Retorna todos os jogos atualmente em jogo (live).
   */
  async getLiveEvents(): Promise<BzzoiroEvent[]> {
    const raw = await fetchRawEvents('/events/live/');
    const events = raw.map(transformEvent);
    return enrichEventsWithLogos(events);
  },

  /**
   * Retorna jogos filtrados por parâmetros (data, liga, equipa, estado...).
   */
  async getEvents(
    params: {
      date_from?: string;
      date_to?: string;
      league_id?: string;
      team_id?: string;
      status?: string;
      limit?: string;
    } = {},
    options: { fetchAll?: boolean; enrich?: boolean } = {}
  ): Promise<BzzoiroEvent[]> {
    const { fetchAll = false, enrich = true } = options;
    const queryParams: Record<string, string> = {};
    if (params.date_from)  queryParams.date_from  = params.date_from;
    if (params.date_to)    queryParams.date_to    = params.date_to;
    if (params.league_id)  queryParams.league_id  = params.league_id;
    if (params.team_id)    queryParams.team_id    = params.team_id;
    if (params.status)     queryParams.status     = params.status;
    if (params.limit)      queryParams.limit      = params.limit;

    const raw = await fetchRawEvents('/events/', queryParams, fetchAll);
    const events = raw.map(transformEvent);
    if (enrich) {
      return enrichEventsWithLogos(events);
    }
    return events;
  },

  /**
   * Retorna detalhes de um jogo específico.
   */
  async getEventDetails(eventId: number): Promise<BzzoiroEvent> {
    const raw = await fetchBzzoiro<RawBzzoiroEvent>(`/events/${eventId}/`);
    const event = transformEvent(raw);
    const [enriched] = await enrichEventsWithLogos([event]);
    return enriched;
  },

  /**
   * Retorna detalhes de uma equipa específica.
   */
  async getTeamDetails(teamId: number): Promise<any> {
    return fetchBzzoiro<any>(`/teams/${teamId}/`);
  },

  /**
   * Retorna o plantel (squad) de uma equipa específica.
   */
  async getTeamSquad(teamId: number): Promise<any> {
    return fetchBzzoiro<any>(`/teams/${teamId}/squad/`);
  },

  /**
   * Retorna detalhes de um jogador específico.
   */
  async getPlayerDetails(playerId: number): Promise<any> {
    return fetchBzzoiro<any>(`/players/${playerId}/`);
  },

  /**
   * Retorna detalhes do estádio (venue).
   */
  async getVenueDetails(venueId: number): Promise<any> {
    return fetchBzzoiro<any>(`/venues/${venueId}/`);
  },

  /**
   * Retorna detalhes do árbitro.
   */
  async getRefereeDetails(refereeId: number): Promise<any> {
    return fetchBzzoiro<any>(`/referees/${refereeId}/`);
  },

  /**
   * Retorna estatísticas do jogo.
   */
  async getEventStats(eventId: number): Promise<any> {
    return fetchBzzoiro<any>(`/events/${eventId}/stats/`);
  },

  /**
   * Retorna estatísticas dos jogadores do jogo.
   */
  async getEventPlayerStats(eventId: number): Promise<any> {
    return fetchBzzoiro<any>(`/events/${eventId}/player-stats/`);
  },

  /**
   * Retorna os incidentes (cronologia/eventos) do jogo.
   */
  async getEventIncidents(eventId: number): Promise<any> {
    return fetchBzzoiro<any>(`/events/${eventId}/incidents/`);
  },

  /**
   * Retorna plantéis do jogo.
   */
  async getEventLineups(eventId: number): Promise<any> {
    return fetchBzzoiro<any>(`/events/${eventId}/lineups/`);
  },

  /**
   * Retorna a classificação da liga.
   */
  async getLeagueStandings(leagueId: number): Promise<any> {
    return fetchBzzoiro<any>(`/leagues/${leagueId}/standings/`);
  },

  /**
   * Retorna as odds de um jogo específico.
   */
  async getEventOdds(eventId: number): Promise<any> {
    return fetchBzzoiro<any>(`/events/${eventId}/odds/`).catch(() => null);
  },
};
