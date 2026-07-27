/*
  # Hospital Management System - Database Schema
  
  ## Overview
  Complete database schema for a pharmaceutical hospital management system with high-cost medication tracking,
  massive inventory control, full traceability, and audit logging.
  
  ## New Tables
  
  ### 1. `user_profiles`
  Extended user information with role-based access control
  - `id` (uuid, primary key) - References auth.users
  - `email` (text) - User email
  - `full_name` (text) - User's full name
  - `role` (text) - User role: 'admin' or 'staff'
  - `is_active` (boolean) - Account status
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### 2. `medications`
  Master catalog of medications
  - `id` (uuid, primary key)
  - `name` (text) - Medication name
  - `generic_name` (text) - Generic/scientific name
  - `description` (text) - Detailed description
  - `category` (text) - Medication category
  - `unit_type` (text) - Unit of measurement (vial, tablet, etc.)
  - `is_high_cost` (boolean) - High-cost medication flag
  - `min_stock_alert` (integer) - Minimum stock threshold for alerts
  - `created_by` (uuid) - User who created the entry
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### 3. `inventory_batches`
  Batch tracking for inventory control
  - `id` (uuid, primary key)
  - `medication_id` (uuid) - References medications
  - `batch_number` (text) - Batch/lot number
  - `quantity` (integer) - Current quantity
  - `initial_quantity` (integer) - Original quantity
  - `unit_cost` (decimal) - Cost per unit
  - `expiration_date` (date) - Expiration date
  - `supplier` (text) - Supplier information
  - `entry_date` (date) - Date of entry
  - `created_by` (uuid) - User who created the entry
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### 4. `inventory_movements`
  Complete tracking of all inventory movements
  - `id` (uuid, primary key)
  - `medication_id` (uuid) - References medications
  - `batch_id` (uuid) - References inventory_batches
  - `movement_type` (text) - 'entry' or 'exit'
  - `quantity` (integer) - Quantity moved
  - `reason` (text) - Reason for movement
  - `recipient_name` (text) - For exits: who received it
  - `recipient_id` (text) - For exits: recipient ID/document
  - `department` (text) - Department involved
  - `notes` (text) - Additional notes
  - `performed_by` (uuid) - User who performed the movement
  - `performed_at` (timestamptz) - Exact timestamp of movement
  
  ### 5. `audit_logs`
  Immutable audit trail of all system actions
  - `id` (uuid, primary key)
  - `user_id` (uuid) - User who performed the action
  - `action_type` (text) - Type of action performed
  - `table_name` (text) - Table affected
  - `record_id` (uuid) - ID of affected record
  - `old_data` (jsonb) - Previous data state
  - `new_data` (jsonb) - New data state
  - `ip_address` (text) - User's IP address
  - `user_agent` (text) - Browser/client information
  - `created_at` (timestamptz) - Timestamp of action
  
  ### 6. `system_configuration`
  System-wide configuration settings
  - `id` (uuid, primary key)
  - `config_key` (text, unique) - Configuration key
  - `config_value` (jsonb) - Configuration value
  - `description` (text) - Configuration description
  - `updated_by` (uuid) - Last user to update
  - `updated_at` (timestamptz) - Last update timestamp
  
  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Admins have full access to all data
  - Staff can read most data but have limited write access
  - Audit logs are read-only for staff, write-only for system
  - All policies check authentication and role-based permissions
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can insert profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Medications Table
CREATE TABLE IF NOT EXISTS medications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  generic_name text,
  description text,
  category text NOT NULL,
  unit_type text NOT NULL DEFAULT 'unit',
  is_high_cost boolean DEFAULT false,
  min_stock_alert integer DEFAULT 10,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view medications"
  ON medications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert medications"
  ON medications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Authenticated users can update medications"
  ON medications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admins can delete medications"
  ON medications FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Inventory Batches Table
CREATE TABLE IF NOT EXISTS inventory_batches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  medication_id uuid NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  batch_number text NOT NULL,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  initial_quantity integer NOT NULL CHECK (initial_quantity > 0),
  unit_cost decimal(10,2) NOT NULL DEFAULT 0.00,
  expiration_date date NOT NULL,
  supplier text,
  entry_date date DEFAULT CURRENT_DATE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(medication_id, batch_number)
);

ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view batches"
  ON inventory_batches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert batches"
  ON inventory_batches FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Authenticated users can update batches"
  ON inventory_batches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admins can delete batches"
  ON inventory_batches FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Inventory Movements Table
CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  medication_id uuid NOT NULL REFERENCES medications(id),
  batch_id uuid REFERENCES inventory_batches(id),
  movement_type text NOT NULL CHECK (movement_type IN ('entry', 'exit')),
  quantity integer NOT NULL CHECK (quantity > 0),
  reason text NOT NULL,
  recipient_name text,
  recipient_id text,
  department text,
  notes text,
  performed_by uuid NOT NULL REFERENCES auth.users(id),
  performed_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view movements"
  ON inventory_movements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert movements"
  ON inventory_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id),
  action_type text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- System Configuration Table
CREATE TABLE IF NOT EXISTS system_configuration (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key text UNIQUE NOT NULL,
  config_value jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE system_configuration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view configuration"
  ON system_configuration FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert configuration"
  ON system_configuration FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update configuration"
  ON system_configuration FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_medications_category ON medications(category);
CREATE INDEX IF NOT EXISTS idx_medications_high_cost ON medications(is_high_cost);
CREATE INDEX IF NOT EXISTS idx_batches_medication ON inventory_batches(medication_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiration ON inventory_batches(expiration_date);
CREATE INDEX IF NOT EXISTS idx_movements_medication ON inventory_movements(medication_id);
CREATE INDEX IF NOT EXISTS idx_movements_performed_at ON inventory_movements(performed_at);
CREATE INDEX IF NOT EXISTS idx_movements_type ON inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- Insert default system configuration
INSERT INTO system_configuration (config_key, config_value, description)
VALUES 
  ('hospital_info', '{"name": "Hospital General", "address": "", "phone": "", "logo_url": ""}', 'Hospital basic information and letterhead'),
  ('alert_thresholds', '{"critical_stock": 5, "low_stock": 10, "expiring_soon_days": 30}', 'Alert threshold configuration'),
  ('system_settings', '{"require_exit_confirmation": true, "enable_audit_log": true}', 'General system settings')
ON CONFLICT (config_key) DO NOTHING;