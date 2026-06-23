import { createClient } from '@/utils/supabase/server'

export interface UserFavorites {
  leagues: number[];
  teams: number[];
  matches: number[];
}

export const favoritesService = {
  /**
   * Obtém os IDs favoritos (ligas, equipas e jogos) do utilizador autenticado.
   */
  async getUserFavorites(): Promise<UserFavorites> {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { leagues: [], teams: [], matches: [] }
      }

      const [leaguesRes, teamsRes, matchesRes] = await Promise.all([
        supabase.from('favorite_leagues').select('league_id').eq('user_id', user.id),
        supabase.from('favorite_teams').select('team_id').eq('user_id', user.id),
        supabase.from('favorite_matches').select('match_id').eq('user_id', user.id),
      ])

      return {
        leagues: leaguesRes.data?.map((x) => Number(x.league_id)) || [],
        teams: teamsRes.data?.map((x) => Number(x.team_id)) || [],
        matches: matchesRes.data?.map((x) => Number(x.match_id)) || [],
      }
    } catch (error) {
      console.error('Erro ao obter favoritos:', error)
      return { leagues: [], teams: [], matches: [] }
    }
  },

  /**
   * Ativa/Desativa uma liga nos favoritos.
   */
  async toggleLeague(leagueId: number, name: string, country?: string): Promise<{ favorited: boolean }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Utilizador não autenticado.')

    // 1. Garantir que a liga existe no Supabase (inserir se não existir)
    const { data: leagueExists } = await supabase
      .from('leagues')
      .select('id')
      .eq('id', leagueId)
      .maybeSingle()

    if (!leagueExists) {
      await supabase.from('leagues').upsert({
        id: leagueId,
        name: name,
        country: country || null,
        updated_at: new Date().toISOString(),
      })
    }

    // 2. Verificar se já é favorita
    const { data: favorite } = await supabase
      .from('favorite_leagues')
      .select('id')
      .eq('user_id', user.id)
      .eq('league_id', leagueId)
      .maybeSingle()

    if (favorite) {
      const { error } = await supabase
        .from('favorite_leagues')
        .delete()
        .eq('id', favorite.id)
      if (error) throw error
      return { favorited: false }
    } else {
      const { error } = await supabase
        .from('favorite_leagues')
        .insert({
          user_id: user.id,
          league_id: leagueId,
        })
      if (error) throw error
      return { favorited: true }
    }
  },

  /**
   * Ativa/Desativa uma equipa nos favoritos.
   */
  async toggleTeam(teamId: number, name: string, logoUrl?: string): Promise<{ favorited: boolean }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Utilizador não autenticado.')

    // 1. Garantir que a equipa existe no Supabase (inserir se não existir)
    const { data: teamExists } = await supabase
      .from('teams')
      .select('id')
      .eq('id', teamId)
      .maybeSingle()

    if (!teamExists) {
      await supabase.from('teams').upsert({
        id: teamId,
        name: name,
        logo_url: logoUrl || null,
        updated_at: new Date().toISOString(),
      })
    } else if (logoUrl) {
      await supabase
        .from('teams')
        .update({
          name: name,
          logo_url: logoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', teamId)
    }

    // 2. Verificar se já é favorita
    const { data: favorite } = await supabase
      .from('favorite_teams')
      .select('id')
      .eq('user_id', user.id)
      .eq('team_id', teamId)
      .maybeSingle()

    if (favorite) {
      const { error } = await supabase
        .from('favorite_teams')
        .delete()
        .eq('id', favorite.id)
      if (error) throw error
      return { favorited: false }
    } else {
      const { error } = await supabase
        .from('favorite_teams')
        .insert({
          user_id: user.id,
          team_id: teamId,
        })
      if (error) throw error
      return { favorited: true }
    }
  },

  /**
   * Ativa/Desativa um jogo/evento nos favoritos.
   */
  async toggleMatch(matchId: number): Promise<{ favorited: boolean }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Utilizador não autenticado.')

    // Verificar se já é favorito
    const { data: favorite } = await supabase
      .from('favorite_matches')
      .select('id')
      .eq('user_id', user.id)
      .eq('match_id', matchId)
      .maybeSingle()

    if (favorite) {
      const { error } = await supabase
        .from('favorite_matches')
        .delete()
        .eq('id', favorite.id)
      if (error) throw error
      return { favorited: false }
    } else {
      const { error } = await supabase
        .from('favorite_matches')
        .insert({
          user_id: user.id,
          match_id: matchId,
        })
      if (error) throw error
      return { favorited: true }
    }
  },
}
