/*
  # Update Inventory Management Permissions for Three Roles

  ## Overview
  Extends inventory management permissions to allow three roles to fully manage inventory:
  - **admin**: Full access (unchanged)
  - **technical_assistant**: Full access to inventory management
  - **warehouse_keeper**: Full access to inventory management

  ## Changes Made

  ### 1. Medications Table
  - Admins, Technical Assistants, and Warehouse Keepers can insert medications
  - Admins, Technical Assistants, and Warehouse Keepers can update medications
  - Admins, Technical Assistants, and Warehouse Keepers can delete medications

  ### 2. Inventory Batches Table
  - Admins, Technical Assistants, and Warehouse Keepers can insert batches
  - Admins, Technical Assistants, and Warehouse Keepers can update batches
  - Admins, Technical Assistants, and Warehouse Keepers can delete batches

  ### 3. Inventory Movements Table
  - Admins, Technical Assistants, and Warehouse Keepers can insert all types of movements
  - Admins, Technical Assistants, and Warehouse Keepers can update movements
  - Admins, Technical Assistants, and Warehouse Keepers can delete movements
  - Staff can still create exit movements (deliveries) only

  ## Important Notes
  - All three roles (admin, technical_assistant, warehouse_keeper) now have equal permissions for inventory management
  - Staff role maintains read-only access except for creating exit movements
  - User profile management remains admin-only
  - System configuration remains admin-only
  - Audit logs remain admin-view only
*/

-- =======================
-- MEDICATIONS - UPDATE POLICIES
-- =======================

-- Drop existing policies
DROP POLICY IF EXISTS "medications_insert" ON medications;
DROP POLICY IF EXISTS "medications_update" ON medications;
DROP POLICY IF EXISTS "medications_delete" ON medications;

-- Allow admins, technical assistants, and warehouse keepers to insert medications
CREATE POLICY "medications_insert"
  ON medications FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'technical_assistant', 'warehouse_keeper')
  );

-- Allow admins, technical assistants, and warehouse keepers to update medications
CREATE POLICY "medications_update"
  ON medications FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'technical_assistant', 'warehouse_keeper')
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'technical_assistant', 'warehouse_keeper')
  );

-- Allow admins, technical assistants, and warehouse keepers to delete medications
CREATE POLICY "medications_delete"
  ON medications FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'technical_assistant', 'warehouse_keeper')
  );

-- =======================
-- INVENTORY BATCHES - UPDATE POLICIES
-- =======================

-- Drop existing policies
DROP POLICY IF EXISTS "inventory_batches_insert" ON inventory_batches;
DROP POLICY IF EXISTS "inventory_batches_update" ON inventory_batches;
DROP POLICY IF EXISTS "inventory_batches_delete" ON inventory_batches;

-- Allow admins, technical assistants, and warehouse keepers to insert batches
CREATE POLICY "inventory_batches_insert"
  ON inventory_batches FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'technical_assistant', 'warehouse_keeper')
  );

-- Allow admins, technical assistants, and warehouse keepers to update batches
CREATE POLICY "inventory_batches_update"
  ON inventory_batches FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'technical_assistant', 'warehouse_keeper')
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'technical_assistant', 'warehouse_keeper')
  );

-- Allow admins, technical assistants, and warehouse keepers to delete batches
CREATE POLICY "inventory_batches_delete"
  ON inventory_batches FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'technical_assistant', 'warehouse_keeper')
  );

-- =======================
-- INVENTORY MOVEMENTS - UPDATE POLICIES
-- =======================

-- Drop existing policies
DROP POLICY IF EXISTS "inventory_movements_insert_admin" ON inventory_movements;
DROP POLICY IF EXISTS "inventory_movements_update" ON inventory_movements;
DROP POLICY IF EXISTS "inventory_movements_delete" ON inventory_movements;

-- Allow admins, technical assistants, and warehouse keepers to insert any type of movement
CREATE POLICY "inventory_movements_insert_admin"
  ON inventory_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'technical_assistant', 'warehouse_keeper')
  );

-- Allow admins, technical assistants, and warehouse keepers to update movements
CREATE POLICY "inventory_movements_update"
  ON inventory_movements FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'technical_assistant', 'warehouse_keeper')
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'technical_assistant', 'warehouse_keeper')
  );

-- Allow admins, technical assistants, and warehouse keepers to delete movements
CREATE POLICY "inventory_movements_delete"
  ON inventory_movements FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'technical_assistant', 'warehouse_keeper')
  );
