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
  2:  { name: 'La Liga',                         country: 'Espanha'       },
  3:  { name: 'Serie A',                         country: 'Itália'        },
  4:  { name: 'Bundesliga',                      country: 'Alemanha'      },
  5:  { name: '2. Bundesliga',                   country: 'Alemanha'      },
  6:  { name: 'Ligue 1',                         country: 'França'        },
  7:  { name: 'Eredivisie',                      country: 'Holanda'       },
  8:  { name: 'Série A',                         country: 'Brasil'        },
  9:  { name: 'Série B',                         country: 'Brasil'        },
  13: { name: 'Scottish Premiership Playoffs',   country: 'Escócia'       },
  18: { name: 'MLS',                             country: 'EUA'           },
  20: { name: 'Liga MX',                         country: 'México'        },
  22: { name: 'Parva Liga',                      country: 'Bulgária'      },
  23: { name: 'Liga I',                          country: 'Roménia'       },
  26: { name: 'Allsvenskan',                     country: 'Suécia'        },
  34: { name: 'Série C',                         country: 'Brasil'        },
  54: { name: 'Eliteserien',                     country: 'Noruega'       },
};

// ─── Mapeamento de Status ────────────────────────────────────────────────────
// Normaliza o status da API para os valores que o UI conhece.

function mapStatus(raw: RawBzzoiroEvent): string {
  const status = raw.status?.toLowerCase();
  const period = raw.period?.toUpperCase();

  if (status === 'finished') return 'FT';
  if (status === 'inprogress' || status === 'live') {
    if (period === 'HT') return 'HT';
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

async function fetchRawEvents(endpoint: string, params: Record<string, string> = {}): Promise<RawBzzoiroEvent[]> {
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

// ─── Service Público ─────────────────────────────────────────────────────────

export const bzzoiroService = {
  /**
   * Retorna todos os jogos atualmente em jogo (live).
   */
  async getLiveEvents(): Promise<BzzoiroEvent[]> {
    const raw = await fetchRawEvents('/events/live/');
    return raw.map(transformEvent);
  },

  /**
   * Retorna jogos filtrados por parâmetros (data, liga, equipa, estado...).
   */
  async getEvents(params: {
    date_from?: string;
    date_to?: string;
    league_id?: string;
    team_id?: string;
    status?: string;
  } = {}): Promise<BzzoiroEvent[]> {
    const queryParams: Record<string, string> = {};
    if (params.date_from)  queryParams.date_from  = params.date_from;
    if (params.date_to)    queryParams.date_to    = params.date_to;
    if (params.league_id)  queryParams.league_id  = params.league_id;
    if (params.team_id)    queryParams.team_id    = params.team_id;
    if (params.status)     queryParams.status     = params.status;

    const raw = await fetchRawEvents('/events/', queryParams);
    return raw.map(transformEvent);
  },

  /**
   * Retorna detalhes de um jogo específico.
   */
  async getEventDetails(eventId: number): Promise<BzzoiroEvent> {
    const raw = await fetchBzzoiro<RawBzzoiroEvent>(`/events/${eventId}/`);
    return transformEvent(raw);
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
};
