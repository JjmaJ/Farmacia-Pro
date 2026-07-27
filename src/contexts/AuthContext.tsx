import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiFetch, getAuthToken } from '../lib/api';
import { UserProfile } from '../types/database';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string, onBeforeSuccess?: () => Promise<void> | void) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (email: string, code: string, newPassword: string) => Promise<void>;
  switchSucursal: (sucursalId: string) => Promise<void>;
  isAdmin: boolean;
  canManageInventory: boolean;
  canEditInventory: boolean;
  canAccessAltoCosto: boolean;
  /** Solo Admin Maestro (Administrator) */
  isSuperAdmin: boolean;
  /** Si el rol es Médico o Enfermero (solo lectura) — NO pueden despachar */
  isReadOnly: boolean;
  /** Puede registrar entregas/despachos */
  canDispatch: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching /auth/user');
        const data = await apiFetch('/auth/user');
        console.log('Got user data', data);
        setUser({ id: data.user.id, email: data.user.email });
        setProfile(data.user.user_metadata || null);
      } catch (err) {
        console.error('Failed to authenticate with stored token');
        localStorage.removeItem('medicontrol_auth');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const signIn = async (email: string, password: string, onBeforeSuccess?: () => Promise<void> | void) => {
    console.log('Attempting login...');
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      console.log('Login successful', data);
      
      localStorage.setItem('medicontrol_auth', JSON.stringify({ token: data.session.access_token }));
      
      if (onBeforeSuccess) {
        await onBeforeSuccess();
      }
      
      setUser({ id: data.user.id, email: data.user.email });
      setProfile(data.user.user_metadata || null);
    } catch (err: any) {
      console.error('Login Error in signIn:', err);
      throw err;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const parts = fullName.trim().split(' ');
    const first_name = parts[0] || '';
    const last_name = parts.slice(1).join(' ') || '';

    await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ 
        email, 
        password,
        first_name,
        last_name,
        role: 'Nurse', // default testing role
        department: 'General'
      })
    });
    // No set localStorage or setUser here anymore. Handled by UI showing pending approval modal.
  };

  const signOut = async () => {
    try {
      if (user) {
        await apiFetch('/audit_logs', {
          method: 'POST',
          body: JSON.stringify({
            action: 'USER_LOGOUT',
            entity_type: 'AUTH',
            entity_id: user.id,
            details: { email: user.email, timestamp: new Date() }
          })
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Could not record logout audit:', e);
    } finally {
      localStorage.removeItem('medicontrol_auth');
      setUser(null);
      setProfile(null);
    }
  };

  const resetPassword = async (email: string) => {
    await apiFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  };

  const updatePassword = async (email: string, code: string, newPassword: string) => {
    await apiFetch('/auth/update-password', {
      method: 'POST',
      body: JSON.stringify({ email, token: code, newPassword })
    });
  };

  const switchSucursal = async (sucursalId: string) => {
    try {
      const data = await apiFetch('/auth/switch-sucursal', {
        method: 'PATCH',
        body: JSON.stringify({ sucursal_id: sucursalId })
      });
      // Update JWT token with new sucursal context
      localStorage.setItem('medicontrol_auth', JSON.stringify({ token: data.session.access_token }));
      // Refresh profile from server
      const userData = await apiFetch('/auth/user');
      setProfile(userData.user.user_metadata || null);
      window.location.reload();
    } catch (err: any) {
      console.error('Error switching sucursal:', err);
      throw err;
    }
  };

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    switchSucursal,
    isAdmin: profile?.role === 'Administrator' || profile?.role === 'admin',
    isSuperAdmin: profile?.role === 'Administrator' || profile?.role === 'admin',
    canManageInventory: ['Administrator', 'admin', 'technical_assistant', 'warehouse_keeper', 'Warehouse_Keeper'].includes(profile?.role || ''),
    canEditInventory: ['Administrator', 'admin', 'technical_assistant'].includes(profile?.role || ''),
    canAccessAltoCosto: profile?.role === 'Pharmacist' || profile?.can_access_alto_costo || false,
    // Médicos y Enfermeros son solo lectura
    isReadOnly: ['Doctor', 'Nurse', 'Médico', 'Enfermero', 'doctor', 'nurse', 'medico', 'enfermero'].includes(profile?.role || ''),
    canDispatch: !['Doctor', 'Nurse', 'Médico', 'Enfermero', 'doctor', 'nurse', 'medico', 'enfermero'].includes(profile?.role || '')
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
