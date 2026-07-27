/*
  # Fix Remaining User Profiles Policies
  
  ## Overview
  Updates all remaining user_profiles policies to use direct role checking
  instead of the get_user_role() function to avoid recursion issues.
  
  ## Changes
  
  ### 1. SELECT Policy
  - Admins can see all user profiles
  - Users can see their own profile
  
  ### 2. INSERT Policy
  - Only admins can create new user profiles
  
  ### 3. DELETE Policy
  - Only admins can delete user profiles
  
  All policies now use direct EXISTS checks instead of function calls.
*/

-- ============================================================================
-- SELECT Policy - View user profiles
-- ============================================================================

DROP POLICY IF EXISTS "user_profiles_select" ON user_profiles;

CREATE POLICY "user_profiles_select"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    -- User can see their own profile
    id = auth.uid()
    OR
    -- Or user is an admin (can see all profiles)
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
      AND up.is_active = true
    )
  );

-- ============================================================================
-- INSERT Policy - Create new user profiles
-- ============================================================================

DROP POLICY IF EXISTS "user_profiles_insert" ON user_profiles;

CREATE POLICY "user_profiles_insert"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
      AND up.is_active = true
    )
  );

-- ============================================================================
-- DELETE Policy - Delete user profiles
-- ============================================================================

DROP POLICY IF EXISTS "user_profiles_delete" ON user_profiles;

CREATE POLICY "user_profiles_delete"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
      AND up.is_active = true
    )
  );