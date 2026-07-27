/*
  # Enforce Strict Role-Based Permissions

  ## Overview
  Replaces all existing permissive RLS policies with strict role-based access control:
  - **Admins**: Full access to all operations
  - **Staff**: Read-only access + ability to create medication deliveries (exit movements only)

  ## Security Changes

  ### 1. User Profiles
  - Admins: Full CRUD on all profiles
  - Staff: Can only view their own profile (no editing of roles)

  ### 2. Medications
  - Admins: Full CRUD
  - Staff: Read-only

  ### 3. Inventory Batches
  - Admins: Full CRUD
  - Staff: Read-only

  ### 4. Inventory Movements
  - Admins: Full CRUD (all movement types)
  - Staff: Read all + Create exit movements only (deliveries)

  ### 5. System Configuration
  - Admins: Full CRUD
  - Staff: No access

  ### 6. Audit Logs
  - Admins: Read access
  - Staff: No access
  - System: Insert only (automated logging)
*/

-- =======================
-- USER PROFILES
-- =======================
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert any profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;

-- Admins can view all profiles, staff can view only their own
CREATE POLICY "user_profiles_select"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
    OR id = auth.uid()
  );

-- Only admins can update profiles
CREATE POLICY "user_profiles_update"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

-- Only admins can insert profiles
CREATE POLICY "user_profiles_insert"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

-- Only admins can delete profiles
CREATE POLICY "user_profiles_delete"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

-- =======================
-- MEDICATIONS
-- =======================
DROP POLICY IF EXISTS "Authenticated users can view medications" ON medications;
DROP POLICY IF EXISTS "Authenticated users can insert medications" ON medications;
DROP POLICY IF EXISTS "Authenticated users can update medications" ON medications;
DROP POLICY IF EXISTS "Admins can delete medications" ON medications;

-- Everyone can view medications
CREATE POLICY "medications_select"
  ON medications FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert medications
CREATE POLICY "medications_insert"
  ON medications FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

-- Only admins can update medications
CREATE POLICY "medications_update"
  ON medications FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

-- Only admins can delete medications
CREATE POLICY "medications_delete"
  ON medications FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

-- =======================
-- INVENTORY BATCHES
-- =======================
DROP POLICY IF EXISTS "Authenticated users can view batches" ON inventory_batches;
DROP POLICY IF EXISTS "Authenticated users can insert batches" ON inventory_batches;
DROP POLICY IF EXISTS "Authenticated users can update batches" ON inventory_batches;
DROP POLICY IF EXISTS "Admins can delete batches" ON inventory_batches;

-- Everyone can view batches
CREATE POLICY "inventory_batches_select"
  ON inventory_batches FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert batches
CREATE POLICY "inventory_batches_insert"
  ON inventory_batches FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

-- Only admins can update batches
CREATE POLICY "inventory_batches_update"
  ON inventory_batches FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

-- Only admins can delete batches
CREATE POLICY "inventory_batches_delete"
  ON inventory_batches FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

-- =======================
-- INVENTORY MOVEMENTS
-- =======================
DROP POLICY IF EXISTS "Authenticated users can view movements" ON inventory_movements;
DROP POLICY IF EXISTS "Authenticated users can insert movements" ON inventory_movements;

-- Everyone can view movements
CREATE POLICY "inventory_movements_select"
  ON inventory_movements FOR SELECT
  TO authenticated
  USING (true);

-- Admins can insert any type of movement
CREATE POLICY "inventory_movements_insert_admin"
  ON inventory_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

-- Staff can only insert exit movements (deliveries)
CREATE POLICY "inventory_movements_insert_staff"
  ON inventory_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    movement_type = 'exit' AND
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'staff'
  );

-- Only admins can update movements
CREATE POLICY "inventory_movements_update"
  ON inventory_movements FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

-- Only admins can delete movements
CREATE POLICY "inventory_movements_delete"
  ON inventory_movements FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

-- =======================
-- SYSTEM CONFIGURATION
-- =======================
DROP POLICY IF EXISTS "Authenticated users can view configuration" ON system_configuration;
DROP POLICY IF EXISTS "Admins can insert configuration" ON system_configuration;
DROP POLICY IF EXISTS "Admins can update configuration" ON system_configuration;

-- Only admins can view configuration
CREATE POLICY "system_configuration_select"
  ON system_configuration FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

-- Only admins can insert configuration
CREATE POLICY "system_configuration_insert"
  ON system_configuration FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

-- Only admins can update configuration
CREATE POLICY "system_configuration_update"
  ON system_configuration FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

-- Only admins can delete configuration
CREATE POLICY "system_configuration_delete"
  ON system_configuration FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

-- =======================
-- AUDIT LOGS
-- =======================
DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;

-- Only admins can view audit logs
CREATE POLICY "audit_logs_select"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

-- System can insert audit logs (automated)
CREATE POLICY "audit_logs_insert"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
