CREATE TABLE public.point_rewards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price_points INT NOT NULL CHECK (price_points > 0),
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.reward_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reward_id TEXT NOT NULL REFERENCES public.point_rewards(id),
    points_spent INT NOT NULL CHECK (points_spent > 0),
    status TEXT DEFAULT 'pending' NOT NULL
        CHECK (status IN ('pending', 'processing', 'delivered', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS reward_redemptions_user_reward_unique
    ON public.reward_redemptions (user_id, reward_id);

INSERT INTO public.point_rewards (id, name, price_points) VALUES
    ('team-shirt', 'Camisola oficial de equipa', 150000),
    ('football', 'Bola de futebol', 80000),
    ('team-cap', 'Chapéu de equipa', 40000),
    ('team-scarf', 'Cachecol de equipa', 35000),
    ('goalkeeper-gloves', 'Luvas de guarda-redes', 70000),
    ('match-ticket', 'Bilhete para um jogo', 200000)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price_points = EXCLUDED.price_points;

ALTER TABLE public.point_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de prémios ativos"
    ON public.point_rewards FOR SELECT
    TO authenticated
    USING (active);

CREATE POLICY "Permitir ao dono consultar os seus resgates"
    ON public.reward_redemptions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.redeem_point_reward(p_reward_id TEXT)
RETURNS TABLE (redemption_id UUID, remaining_points INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_price INT;
    v_remaining_points INT;
    v_redemption_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Inicia sessão para resgatar prémios.';
    END IF;

    SELECT price_points
    INTO v_price
    FROM public.point_rewards
    WHERE id = p_reward_id AND active = true;

    IF v_price IS NULL THEN
        RAISE EXCEPTION 'O prémio selecionado não está disponível.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.reward_redemptions
        WHERE user_id = v_user_id AND reward_id = p_reward_id
    ) THEN
        RAISE EXCEPTION 'Este prémio já foi resgatado.';
    END IF;

    UPDATE public.profiles
    SET points = points - v_price,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_user_id AND points >= v_price
    RETURNING points INTO v_remaining_points;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Não tens pontos suficientes para resgatar este prémio.';
    END IF;

    INSERT INTO public.reward_redemptions (user_id, reward_id, points_spent)
    VALUES (v_user_id, p_reward_id, v_price)
    RETURNING id INTO v_redemption_id;

    RETURN QUERY SELECT v_redemption_id, v_remaining_points;
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Este prémio já foi resgatado.';
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_point_reward(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_point_reward(TEXT) TO authenticated;

-- Atualizar imediatamente a cache de funções expostas pela API PostgREST.
NOTIFY pgrst, 'reload schema';
