-- Adicionar novas colunas à tabela de perfis públicos
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS gender TEXT;

-- Atualizar o trigger para copiar os metadados do utilizador registado para a tabela pública de perfis
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, points, first_name, last_name, birth_date, gender)
    VALUES (
        new.id, 
        new.email, 
        0,
        (new.raw_user_meta_data->>'first_name')::TEXT,
        (new.raw_user_meta_data->>'last_name')::TEXT,
        (new.raw_user_meta_data->>'birth_date')::DATE,
        (new.raw_user_meta_data->>'gender')::TEXT
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
