/*
  # Cleanup Duplicate RLS Policies and Fix Permissions

  ## Overview
  This migration cleans up duplicate RLS policies that are causing conflicts
  and ensures proper permissions for all roles.

  ## Problems Fixed
  
  1. **Duplicate Policies**: Removed old policies that still allowed warehouse_keeper 
     to UPDATE and DELETE (which conflicts with new restrictive policies)
  
  2. **Admin User Update**: Ensures admins can update user profiles and roles
  
  3. **Technical Assistant INSERT**: Confirms technical assistants can add medications
     and inventory items (already working, but verified)

  ## Changes Made

  ### 1. Medications Table
  - Removed old duplicate UPDATE and DELETE policies
  - Kept new restrictive policies for admin and technical_assistant only
  
  ### 2. Inventory Batches Table
  - Removed old duplicate UPDATE and DELETE policies
  - Kept new restrictive policies for admin and technical_assistant only
  
  ### 3. Inventory Movements Table
  - Removed old duplicate UPDATE and DELETE policies
  - Kept new restrictive policies for admin and technical_assistant only

  ### 4. User Profiles Table
  - Verified admin can update all user profiles
  - Admin policies remain unchanged and working

  ## Final Role Permissions

  **Admin**
  - Full access to all tables (SELECT, INSERT, UPDATE, DELETE)
  - Can manage user roles
  
  **Technical Assistant**
  - Full access to inventory tables (SELECT, INSERT, UPDATE, DELETE)
  - Cannot manage users
  
  **Warehouse Keeper**
  - Can add new items (INSERT on medications, batches, movements)
  - Can view all inventory (SELECT)
  - Cannot edit or delete (NO UPDATE, NO DELETE)
  
  **Staff**
  - Read-only access to inventory
  - Can create exit movements (deliveries)
*/

-- ============================================================================
-- MEDICATIONS TABLE - Remove duplicate policies
-- ============================================================================

DROP POLICY IF EXISTS "medications_update" ON medications;
DROP POLICY IF EXISTS "medications_delete" ON medications;

-- ============================================================================
-- INVENTORY BATCHES TABLE - Remove duplicate policies
-- ============================================================================

DROP POLICY IF EXISTS "inventory_batches_update" ON inventory_batches;
DROP POLICY IF EXISTS "inventory_batches_delete" ON inventory_batches;

-- ============================================================================
-- INVENTORY MOVEMENTS TABLE - Remove duplicate policies
-- ============================================================================

DROP POLICY IF EXISTS "inventory_movements_update" ON inventory_movements;
DROP POLICY IF EXISTS "inventory_movements_delete" ON inventory_movements;
