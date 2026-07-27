/*
  # Fix Login Issues and Role System

  ## Overview
  This migration fixes the infinite recursion issue in RLS policies and updates the role system to support all required roles.

  ## Changes Made

  ### 1. User Profiles Table
  - Update CHECK constraint to allow all roles: 'admin', 'staff', 'technical_assistant', 'warehouse_keeper'
  
  ### 2. RLS Infinite Recursion Fix
  - Create a helper function `get_user_role()` to avoid recursive policy checks
  - This function uses security definer to bypass RLS when checking user role
  - Update all RLS policies to use this function instead of subqueries

  ### 3. Updated Policies
  - User profiles policies - use helper function
  - Medications policies - use helper function
  - Inventory batches policies - use helper function
  - Inventory movements policies - use helper function
  - System configuration policies - use helper function
  - Audit logs policies - use helper function

  ## Security Notes
  - The helper function is SECURITY DEFINER but only returns the role, not sensitive data
  - All existing security restrictions remain in place
  - This only fixes the recursion issue without changing access control logic
*/

-- =======================
-- UPDATE USER_PROFILES TABLE TO SUPPORT ALL ROLES
-- =======================

-- Drop the existing constraint
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Add new constraint with all roles
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check 
  CHECK (role IN ('admin', 'staff', 'technical_assistant', 'warehouse_keeper'));

-- =======================
-- CREATE HELPER FUNCTION TO GET USER ROLE
-- =======================

-- This function avoids infinite recursion by using SECURITY DEFINER
-- It bypasses RLS to safely check the user's role
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM user_profiles WHERE id = user_id;
$$;

-- =======================
-- USER PROFILES - FIX RECURSION
-- =======================

DROP POLICY IF EXISTS "user_profiles_select" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete" ON user_profiles;

-- Users can view own profile or admins can view all
CREATE POLICY "user_profiles_select"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() 
    OR get_user_role(auth.uid()) = 'admin'
  );

-- Only admins can update profiles
CREATE POLICY "user_profiles_update"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (get_user_role(auth.uid()) = 'admin')
  WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- Only admins can insert profiles
CREATE POLICY "user_profiles_insert"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- Only admins can delete profiles
CREATE POLICY "user_profiles_delete"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (get_user_role(auth.uid()) = 'admin');

-- =======================
-- MEDICATIONS - FIX RECURSION
-- =======================

DROP POLICY IF EXISTS "medications_select" ON medications;
DROP POLICY IF EXISTS "medications_insert" ON medications;
DROP POLICY IF EXISTS "medications_update" ON medications;
DROP POLICY IF EXISTS "medications_delete" ON medications;

-- All authenticated users can view medications
CREATE POLICY "medications_select"
  ON medications FOR SELECT
  TO authenticated
  USING (true);

-- Admins, technical assistants, and warehouse keepers can insert
CREATE POLICY "medications_insert"
  ON medications FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role(auth.uid()) IN ('admin', 'technical_assistant', 'warehouse_keeper')
  );

-- Admins, technical assistants, and warehouse keepers can update
CREATE POLICY "medications_update"
  ON medications FOR UPDATE
  TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin', 'technical_assistant', 'warehouse_keeper'))
  WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'technical_assistant', 'warehouse_keeper'));

-- Admins, technical assistants, and warehouse keepers can delete
CREATE POLICY "medications_delete"
  ON medications FOR DELETE
  TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin', 'technical_assistant', 'warehouse_keeper'));

-- =======================
-- INVENTORY BATCHES - FIX RECURSION
-- =======================

DROP POLICY IF EXISTS "inventory_batches_select" ON inventory_batches;
DROP POLICY IF EXISTS "inventory_batches_insert" ON inventory_batches;
DROP POLICY IF EXISTS "inventory_batches_update" ON inventory_batches;
DROP POLICY IF EXISTS "inventory_batches_delete" ON inventory_batches;

-- All authenticated users can view batches
CREATE POLICY "inventory_batches_select"
  ON inventory_batches FOR SELECT
  TO authenticated
  USING (true);

-- Admins, technical assistants, and warehouse keepers can insert
CREATE POLICY "inventory_batches_insert"
  ON inventory_batches FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role(auth.uid()) IN ('admin', 'technical_assistant', 'warehouse_keeper')
  );

-- Admins, technical assistants, and warehouse keepers can update
CREATE POLICY "inventory_batches_update"
  ON inventory_batches FOR UPDATE
  TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin', 'technical_assistant', 'warehouse_keeper'))
  WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'technical_assistant', 'warehouse_keeper'));

-- Admins, technical assistants, and warehouse keepers can delete
CREATE POLICY "inventory_batches_delete"
  ON inventory_batches FOR DELETE
  TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin', 'technical_assistant', 'warehouse_keeper'));

-- =======================
-- INVENTORY MOVEMENTS - FIX RECURSION
-- =======================

DROP POLICY IF EXISTS "inventory_movements_select" ON inventory_movements;
DROP POLICY IF EXISTS "inventory_movements_insert_admin" ON inventory_movements;
DROP POLICY IF EXISTS "inventory_movements_insert_staff" ON inventory_movements;
DROP POLICY IF EXISTS "inventory_movements_update" ON inventory_movements;
DROP POLICY IF EXISTS "inventory_movements_delete" ON inventory_movements;

-- All authenticated users can view movements
CREATE POLICY "inventory_movements_select"
  ON inventory_movements FOR SELECT
  TO authenticated
  USING (true);

-- Admins, technical assistants, and warehouse keepers can insert any type
CREATE POLICY "inventory_movements_insert_admin"
  ON inventory_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role(auth.uid()) IN ('admin', 'technical_assistant', 'warehouse_keeper')
  );

-- Staff can only insert exit movements
CREATE POLICY "inventory_movements_insert_staff"
  ON inventory_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    movement_type = 'exit' 
    AND get_user_role(auth.uid()) = 'staff'
  );

-- Admins, technical assistants, and warehouse keepers can update
CREATE POLICY "inventory_movements_update"
  ON inventory_movements FOR UPDATE
  TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin', 'technical_assistant', 'warehouse_keeper'))
  WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'technical_assistant', 'warehouse_keeper'));

-- Admins, technical assistants, and warehouse keepers can delete
CREATE POLICY "inventory_movements_delete"
  ON inventory_movements FOR DELETE
  TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin', 'technical_assistant', 'warehouse_keeper'));

-- =======================
-- SYSTEM CONFIGURATION - FIX RECURSION
-- =======================

DROP POLICY IF EXISTS "system_configuration_select" ON system_configuration;
DROP POLICY IF EXISTS "system_configuration_insert" ON system_configuration;
DROP POLICY IF EXISTS "system_configuration_update" ON system_configuration;
DROP POLICY IF EXISTS "system_configuration_delete" ON system_configuration;

-- Only admins can view configuration
CREATE POLICY "system_configuration_select"
  ON system_configuration FOR SELECT
  TO authenticated
  USING (get_user_role(auth.uid()) = 'admin');

-- Only admins can insert configuration
CREATE POLICY "system_configuration_insert"
  ON system_configuration FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- Only admins can update configuration
CREATE POLICY "system_configuration_update"
  ON system_configuration FOR UPDATE
  TO authenticated
  USING (get_user_role(auth.uid()) = 'admin')
  WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- Only admins can delete configuration
CREATE POLICY "system_configuration_delete"
  ON system_configuration FOR DELETE
  TO authenticated
  USING (get_user_role(auth.uid()) = 'admin');

-- =======================
-- AUDIT LOGS - FIX RECURSION
-- =======================

DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;

-- Only admins can view audit logs
CREATE POLICY "audit_logs_select"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (get_user_role(auth.uid()) = 'admin');

-- All authenticated users can insert audit logs (for system logging)
CREATE POLICY "audit_logs_insert"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
