export type UserRole = 'Administrator' | 'Pharmacist' | 'Warehouse_Keeper' | 'Doctor' | 'Nurse' | 'admin' | 'staff' | 'technical_assistant' | 'warehouse_keeper';

export type MovementType = 'entry' | 'exit' | 'in' | 'out' | 'adjustment' | 'return';

export interface UserProfile {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  department?: string;
  role: UserRole;
  is_active: boolean;
  can_access_alto_costo?: boolean;
  sucursal_id?: string;
  sucursal_nombre?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Medication {
  id: string;
  code: string;
  name: string;
  generic_name: string | null;
  category: string;
  category_id?: string;
  presentation: string;
  unit: string;
  min_stock_level: number;
  requires_prescription: boolean;
  stock?: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryBatch {
  id: string;
  medication_id: string;
  batch_number: string;
  quantity: number;
  initial_quantity: number;
  unit_cost: number;
  expiration_date: string;
  supplier: string | null;
  entry_date: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  medication_id: string;
  batch_id: string | null;
  movement_type: MovementType;
  quantity: number;
  reason: string;
  recipient_name: string | null;
  recipient_id: string | null;
  department: string | null;
  notes: string | null;
  performed_by: string;
  performed_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action_type: string;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface SystemConfiguration {
  id: string;
  config_key: string;
  config_value: Record<string, any>;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface HospitalInfo {
  name: string;
  address: string;
  phone: string;
  logo_url: string;
}

export interface AlertThresholds {
  critical_stock: number;
  low_stock: number;
  expiring_soon_days: number;
}

export interface SystemSettings {
  require_exit_confirmation: boolean;
  enable_audit_log: boolean;
}
