/*
  # Fix User Profiles Update Policy
  
  ## Overview
  Fixes the user_profiles UPDATE policy to avoid potential recursion issues
  by using direct role checking instead of the get_user_role() function.
  
  ## Problem
  The get_user_role() function queries the user_profiles table, and when used
  in a policy on the same table, it can cause recursion or permission issues.
  
  ## Solution
  Replace the function call with a direct subquery that checks if the user
  is an admin, matching the pattern used in other tables.
  
  ## Changes
  - Drop old UPDATE policy using get_user_role()
  - Create new UPDATE policy with direct role verification
  - Ensures admins can update any user profile including roles
*/

-- Drop the old policy that uses get_user_role()
DROP POLICY IF EXISTS "user_profiles_update" ON user_profiles;

-- Create new policy with direct role check (no function call)
CREATE POLICY "user_profiles_update"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
      AND up.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
      AND up.is_active = true
    )
  );