CREATE UNIQUE INDEX IF NOT EXISTS reward_redemptions_user_reward_unique
    ON public.reward_redemptions (user_id, reward_id);

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
NOTIFY pgrst, 'reload schema';
