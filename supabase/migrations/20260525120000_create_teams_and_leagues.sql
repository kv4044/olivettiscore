-- Criar tabela de Ligas
CREATE TABLE public.leagues (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Criar tabela de Equipas
CREATE TABLE public.teams (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    short_name TEXT,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar RLS (Row Level Security) em ambas as tabelas
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Políticas para 'leagues': qualquer utilizador pode ler, apenas service_role (admin) pode alterar
CREATE POLICY "Permitir leitura pública de ligas" 
    ON public.leagues FOR SELECT 
    USING (true);

CREATE POLICY "Permitir escrita apenas para service_role em ligas" 
    ON public.leagues FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

-- Políticas para 'teams': qualquer utilizador pode ler, apenas service_role (admin) pode alterar
CREATE POLICY "Permitir leitura pública de equipas" 
    ON public.teams FOR SELECT 
    USING (true);

CREATE POLICY "Permitir escrita apenas para service_role em equipas" 
    ON public.teams FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);
