-- Criar tabela de Estatísticas de Jogadores
CREATE TABLE public.player_stats (
    id SERIAL PRIMARY KEY,
    league_id BIGINT REFERENCES public.leagues(id) ON DELETE CASCADE,
    team_id BIGINT REFERENCES public.teams(id) ON DELETE CASCADE,
    player_id BIGINT NOT NULL,
    player_name TEXT NOT NULL,
    position TEXT,
    goals INTEGER DEFAULT 0 NOT NULL,
    assists INTEGER DEFAULT 0 NOT NULL,
    passes INTEGER DEFAULT 0 NOT NULL,
    yellow_cards INTEGER DEFAULT 0 NOT NULL,
    red_cards INTEGER DEFAULT 0 NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(league_id, player_id)
);

-- Ativar RLS (Row Level Security)
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Permitir leitura pública de estatísticas de jogadores" 
    ON public.player_stats FOR SELECT 
    USING (true);

CREATE POLICY "Permitir escrita apenas para service_role em estatísticas de jogadores" 
    ON public.player_stats FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);
