/*
  # Create User Profile Automatically on Registration

  ## Summary
  This migration creates a trigger function that automatically creates a user profile 
  when a new user registers in the authentication system.

  ## Changes Made
  
  1. **New Function: `handle_new_user()`**
     - Automatically creates a profile in `user_profiles` when a user signs up
     - Assigns 'staff' role by default
     - Sets user as active by default
     - Extracts email from auth.users metadata
  
  2. **New Trigger: `on_auth_user_created`**
     - Fires after a new user is inserted into `auth.users`
     - Calls `handle_new_user()` function to create profile
  
  3. **Backfill Existing Users**
     - Creates profiles for any existing auth.users without a profile
     - Ensures all users have proper access to the system

  ## Security
  - Function runs with SECURITY DEFINER to bypass RLS
  - Only creates profiles, does not expose sensitive data
*/

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'staff',
    true
  );
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create profile on user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users who don't have profiles
INSERT INTO public.user_profiles (id, email, full_name, role, is_active)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  'staff',
  true
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ON CONFLICT (id) DO NOTHING;
