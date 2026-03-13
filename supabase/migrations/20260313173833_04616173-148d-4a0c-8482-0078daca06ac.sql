
-- Add email column to profiles
ALTER TABLE public.profiles ADD COLUMN email text NOT NULL DEFAULT '';

-- Update existing profile with email
UPDATE public.profiles
SET email = u.email
FROM auth.users u
WHERE profiles.user_id = u.id;

-- Update the trigger to also store email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$;
