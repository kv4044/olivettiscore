-- Add unique username column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Update the new user trigger function to map the username metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, points, first_name, last_name, birth_date, gender, username)
    VALUES (
        new.id, 
        new.email, 
        0,
        (new.raw_user_meta_data->>'first_name')::TEXT,
        (new.raw_user_meta_data->>'last_name')::TEXT,
        (new.raw_user_meta_data->>'birth_date')::DATE,
        (new.raw_user_meta_data->>'gender')::TEXT,
        (new.raw_user_meta_data->>'username')::TEXT
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
