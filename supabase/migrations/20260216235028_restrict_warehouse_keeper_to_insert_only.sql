/*
  # Restrict Warehouse Keeper Role to Insert-Only Permissions

  ## Overview
  Updates permissions for the warehouse_keeper role to only allow:
  - **INSERT**: Can add new medications and inventory batches
  - **SELECT**: Can view all inventory data
  - **NO UPDATE**: Cannot edit existing records
  - **NO DELETE**: Cannot delete records

  ## Role Permissions Summary
  
  ### Admin
  - Full access to all operations (INSERT, SELECT, UPDATE, DELETE)
  
  ### Technical Assistant
  - Full access to all operations (INSERT, SELECT, UPDATE, DELETE)
  
  ### Warehouse Keeper (Almacenista)
  - Can add medications and batches (INSERT)
  - Can view all data (SELECT)
  - Cannot edit or delete (NO UPDATE, NO DELETE)
  
  ### Staff
  - Read-only access
  - Can only create exit movements (deliveries)

  ## Changes Made

  ### 1. Medications Table
  - Removed UPDATE and DELETE policies for warehouse_keeper
  - Kept INSERT policy for warehouse_keeper
  
  ### 2. Inventory Batches Table
  - Removed UPDATE and DELETE policies for warehouse_keeper
  - Kept INSERT policy for warehouse_keeper
  
  ### 3. Inventory Movements Table
  - Removed UPDATE and DELETE policies for warehouse_keeper
  - Kept INSERT policy for warehouse_keeper (all movement types)

  ## Security Notes
  - Warehouse keepers can only add new data, not modify or remove existing data
  - This ensures data integrity and provides an audit trail
  - Only admins and technical assistants can modify or delete records
*/

-- ============================================================================
-- MEDICATIONS TABLE - Restrict warehouse_keeper to INSERT only
-- ============================================================================

-- Drop existing UPDATE policy for warehouse_keeper
DROP POLICY IF EXISTS "Admins, technical assistants, and warehouse keepers can update medications" ON medications;

-- Create new UPDATE policy without warehouse_keeper
CREATE POLICY "Admins and technical assistants can update medications"
  ON medications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'technical_assistant')
      AND user_profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'technical_assistant')
      AND user_profiles.is_active = true
    )
  );

-- Drop existing DELETE policy for warehouse_keeper
DROP POLICY IF EXISTS "Admins, technical assistants, and warehouse keepers can delete medications" ON medications;

-- Create new DELETE policy without warehouse_keeper
CREATE POLICY "Admins and technical assistants can delete medications"
  ON medications
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'technical_assistant')
      AND user_profiles.is_active = true
    )
  );

-- ============================================================================
-- INVENTORY BATCHES TABLE - Restrict warehouse_keeper to INSERT only
-- ============================================================================

-- Drop existing UPDATE policy for warehouse_keeper
DROP POLICY IF EXISTS "Admins, technical assistants, and warehouse keepers can update inventory batches" ON inventory_batches;

-- Create new UPDATE policy without warehouse_keeper
CREATE POLICY "Admins and technical assistants can update inventory batches"
  ON inventory_batches
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'technical_assistant')
      AND user_profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'technical_assistant')
      AND user_profiles.is_active = true
    )
  );

-- Drop existing DELETE policy for warehouse_keeper
DROP POLICY IF EXISTS "Admins, technical assistants, and warehouse keepers can delete inventory batches" ON inventory_batches;

-- Create new DELETE policy without warehouse_keeper
CREATE POLICY "Admins and technical assistants can delete inventory batches"
  ON inventory_batches
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'technical_assistant')
      AND user_profiles.is_active = true
    )
  );

-- ============================================================================
-- INVENTORY MOVEMENTS TABLE - Restrict warehouse_keeper to INSERT only
-- ============================================================================

-- Drop existing UPDATE policy for warehouse_keeper
DROP POLICY IF EXISTS "Admins, technical assistants, and warehouse keepers can update inventory movements" ON inventory_movements;

-- Create new UPDATE policy without warehouse_keeper
CREATE POLICY "Admins and technical assistants can update inventory movements"
  ON inventory_movements
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'technical_assistant')
      AND user_profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'technical_assistant')
      AND user_profiles.is_active = true
    )
  );

-- Drop existing DELETE policy for warehouse_keeper
DROP POLICY IF EXISTS "Admins, technical assistants, and warehouse keepers can delete inventory movements" ON inventory_movements;

-- Create new DELETE policy without warehouse_keeper
CREATE POLICY "Admins and technical assistants can delete inventory movements"
  ON inventory_movements
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'technical_assistant')
      AND user_profiles.is_active = true
    )
  );