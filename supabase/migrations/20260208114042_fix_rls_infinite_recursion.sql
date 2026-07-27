/*
  # Fix RLS Infinite Recursion

  ## Overview
  Fixes the infinite recursion error in user_profiles RLS policies by creating a helper function
  that bypasses RLS to check user roles.

  ## Changes
  1. Creates a helper function `get_user_role()` with SECURITY DEFINER
  2. Recreates all RLS policies using the helper function instead of subqueries
  3. Ensures no policy queries the same table it's protecting
*/

-- Create helper function to get user role without RLS
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$;

-- =======================
-- USER PROFILES
-- =======================
DROP POLICY IF EXISTS "user_profiles_select" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete" ON user_profiles;

-- Admins can view all profiles, staff can view only their own
CREATE POLICY "user_profiles_select"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'admin'
    OR id = auth.uid()
  );

-- Only admins can update profiles
CREATE POLICY "user_profiles_update"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Only admins can insert profiles
CREATE POLICY "user_profiles_insert"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'admin');

-- Only admins can delete profiles
CREATE POLICY "user_profiles_delete"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- =======================
-- MEDICATIONS
-- =======================
DROP POLICY IF EXISTS "medications_select" ON medications;
DROP POLICY IF EXISTS "medications_insert" ON medications;
DROP POLICY IF EXISTS "medications_update" ON medications;
DROP POLICY IF EXISTS "medications_delete" ON medications;

-- Everyone can view medications
CREATE POLICY "medications_select"
  ON medications FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert medications
CREATE POLICY "medications_insert"
  ON medications FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'admin');

-- Only admins can update medications
CREATE POLICY "medications_update"
  ON medications FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Only admins can delete medications
CREATE POLICY "medications_delete"
  ON medications FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- =======================
-- INVENTORY BATCHES
-- =======================
DROP POLICY IF EXISTS "inventory_batches_select" ON inventory_batches;
DROP POLICY IF EXISTS "inventory_batches_insert" ON inventory_batches;
DROP POLICY IF EXISTS "inventory_batches_update" ON inventory_batches;
DROP POLICY IF EXISTS "inventory_batches_delete" ON inventory_batches;

-- Everyone can view batches
CREATE POLICY "inventory_batches_select"
  ON inventory_batches FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert batches
CREATE POLICY "inventory_batches_insert"
  ON inventory_batches FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'admin');

-- Only admins can update batches
CREATE POLICY "inventory_batches_update"
  ON inventory_batches FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Only admins can delete batches
CREATE POLICY "inventory_batches_delete"
  ON inventory_batches FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- =======================
-- INVENTORY MOVEMENTS
-- =======================
DROP POLICY IF EXISTS "inventory_movements_select" ON inventory_movements;
DROP POLICY IF EXISTS "inventory_movements_insert_admin" ON inventory_movements;
DROP POLICY IF EXISTS "inventory_movements_insert_staff" ON inventory_movements;
DROP POLICY IF EXISTS "inventory_movements_update" ON inventory_movements;
DROP POLICY IF EXISTS "inventory_movements_delete" ON inventory_movements;

-- Everyone can view movements
CREATE POLICY "inventory_movements_select"
  ON inventory_movements FOR SELECT
  TO authenticated
  USING (true);

-- Admins can insert any type of movement
CREATE POLICY "inventory_movements_insert_admin"
  ON inventory_movements FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'admin');

-- Staff can only insert exit movements (deliveries)
CREATE POLICY "inventory_movements_insert_staff"
  ON inventory_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    movement_type = 'exit' AND
    get_user_role() = 'staff'
  );

-- Only admins can update movements
CREATE POLICY "inventory_movements_update"
  ON inventory_movements FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Only admins can delete movements
CREATE POLICY "inventory_movements_delete"
  ON inventory_movements FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- =======================
-- SYSTEM CONFIGURATION
-- =======================
DROP POLICY IF EXISTS "system_configuration_select" ON system_configuration;
DROP POLICY IF EXISTS "system_configuration_insert" ON system_configuration;
DROP POLICY IF EXISTS "system_configuration_update" ON system_configuration;
DROP POLICY IF EXISTS "system_configuration_delete" ON system_configuration;

-- Only admins can view configuration
CREATE POLICY "system_configuration_select"
  ON system_configuration FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

-- Only admins can insert configuration
CREATE POLICY "system_configuration_insert"
  ON system_configuration FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'admin');

-- Only admins can update configuration
CREATE POLICY "system_configuration_update"
  ON system_configuration FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Only admins can delete configuration
CREATE POLICY "system_configuration_delete"
  ON system_configuration FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- =======================
-- AUDIT LOGS
-- =======================
DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;

-- Only admins can view audit logs
CREATE POLICY "audit_logs_select"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

-- System can insert audit logs (automated)
CREATE POLICY "audit_logs_insert"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
