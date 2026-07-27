/*
  # Fix Inventory Movements User Relationship

  ## Summary
  Updates the foreign key relationship for `performed_by` in `inventory_movements` table
  to point to `user_profiles` instead of `auth.users`, enabling proper joins in queries.

  ## Changes Made
  
  1. **Update Foreign Key Constraint**
     - Drop existing constraint that points to `auth.users`
     - Create new constraint that points to `user_profiles`
     - This allows PostgREST to properly join with user_profiles in queries
  
  2. **Update Existing Foreign Key for created_by in Other Tables**
     - Ensures consistency across all tables that reference users
     - All user references should go through `user_profiles` for better data integrity

  ## Security
  - No changes to RLS policies
  - Maintains existing data integrity
  - All existing data relationships remain valid
*/

-- Drop and recreate foreign key constraint for inventory_movements.performed_by
ALTER TABLE inventory_movements 
  DROP CONSTRAINT IF EXISTS inventory_movements_performed_by_fkey;

ALTER TABLE inventory_movements
  ADD CONSTRAINT inventory_movements_performed_by_fkey
  FOREIGN KEY (performed_by) 
  REFERENCES user_profiles(id)
  ON DELETE SET NULL;

-- Update other tables to reference user_profiles instead of auth.users
-- This ensures consistency across the schema

-- Update medications.created_by
ALTER TABLE medications
  DROP CONSTRAINT IF EXISTS medications_created_by_fkey;

ALTER TABLE medications
  ADD CONSTRAINT medications_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES user_profiles(id)
  ON DELETE SET NULL;

-- Update inventory_batches.created_by
ALTER TABLE inventory_batches
  DROP CONSTRAINT IF EXISTS inventory_batches_created_by_fkey;

ALTER TABLE inventory_batches
  ADD CONSTRAINT inventory_batches_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES user_profiles(id)
  ON DELETE SET NULL;

-- Update audit_logs.user_id
ALTER TABLE audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

ALTER TABLE audit_logs
  ADD CONSTRAINT audit_logs_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES user_profiles(id)
  ON DELETE SET NULL;

-- Update system_configuration.updated_by
ALTER TABLE system_configuration
  DROP CONSTRAINT IF EXISTS system_configuration_updated_by_fkey;

ALTER TABLE system_configuration
  ADD CONSTRAINT system_configuration_updated_by_fkey
  FOREIGN KEY (updated_by)
  REFERENCES user_profiles(id)
  ON DELETE SET NULL;
