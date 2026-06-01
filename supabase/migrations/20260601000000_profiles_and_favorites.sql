-- 1. Criar tabela de Perfis (perfis públicos de utilizadores)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    points INT DEFAULT 0 NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Criar tabelas de Favoritos (Ligas, Equipas e Jogos)
CREATE TABLE public.favorite_leagues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    league_id BIGINT NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, league_id)
);

CREATE TABLE public.favorite_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id BIGINT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, team_id)
);

CREATE TABLE public.favorite_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    match_id BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, match_id)
);

-- 3. Criar tabela de Prognósticos
CREATE TABLE public.predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    match_id BIGINT NOT NULL,
    predicted_outcome TEXT NOT NULL, -- '1' (Casa), 'X' (Empate), '2' (Fora)
    is_calculated BOOLEAN DEFAULT false NOT NULL,
    points_awarded INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, match_id)
);

-- 4. Ativar RLS (Row Level Security) em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- 5. Definir Políticas de Segurança (RLS)

-- Perfis: qualquer utilizador autenticado pode ler (para o Leaderboard), mas utilizadores comuns não os podem alterar manualmente
CREATE POLICY "Permitir leitura pública de perfis"
    ON public.profiles FOR SELECT
    USING (true);

-- Favoritos de Ligas
CREATE POLICY "Permitir ao dono gerir as suas ligas favoritas"
    ON public.favorite_leagues FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Favoritos de Equipas
CREATE POLICY "Permitir ao dono gerir as suas equipas favoritas"
    ON public.favorite_teams FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Favoritos de Jogos
CREATE POLICY "Permitir ao dono gerir os seus jogos favoritos"
    ON public.favorite_matches FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Prognósticos
CREATE POLICY "Permitir ao dono ler os seus prognósticos"
    ON public.predictions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Permitir ao dono inserir os seus prognósticos"
    ON public.predictions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Permitir ao dono alterar os seus prognósticos não calculados"
    ON public.predictions FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id AND NOT is_calculated)
    WITH CHECK (auth.uid() = user_id AND NOT is_calculated);

-- 6. Trigger para criação automática de perfil no registo de utilizador (Sign Up)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, points)
    VALUES (new.id, new.email, 0);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
