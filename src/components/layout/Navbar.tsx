import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Package,
  TrendingDown,
  BarChart3,
  Users,
  FileText,
  Settings,
  LogOut,
  Database,
  CheckSquare,
  Activity,
  ChevronDown,
  Bell,
  Search,
  User,
  Shield,
  Building2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { apiFetch } from '../../lib/api';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

interface SearchResult {
  type: 'medication' | 'user';
  id: string;
  name: string;
  subtitle: string;
}

interface SystemNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
}

export function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const { profile, signOut, isAdmin, canAccessAltoCosto, switchSucursal } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isSucursalDropdownOpen, setIsSucursalDropdownOpen] = useState(false);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [switchingBranch, setSwitchingBranch] = useState(false);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<SystemNotification[]>([
    {
      id: '1',
      title: 'Bienvenido a MediControl Pro',
      description: 'Sistema de gestión de inventario y pacientes del IVSS.',
      time: 'Ahora',
      type: 'success',
      read: false,
    },
    {
      id: '2',
      title: 'Control de Acceso',
      description: 'Su sesión ha sido iniciada como Administrador de forma segura.',
      time: '5 min',
      type: 'info',
      read: false,
    }
  ]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  
  const adminDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const sucursalDropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (adminDropdownRef.current && !adminDropdownRef.current.contains(target)) {
        setIsAdminDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(target)) {
        setIsProfileDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(target)) {
        setShowSearchResults(false);
      }
      if (sucursalDropdownRef.current && !sucursalDropdownRef.current.contains(target)) {
        setIsSucursalDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load dynamic notifications from low stock and pending tasks
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const [batches, tasks] = await Promise.all([
          apiFetch('/inventory_batches').catch(() => []),
          apiFetch('/tareas').catch(() => []),
        ]);

        const alerts: SystemNotification[] = [];

        // Low stock batches
        if (Array.isArray(batches)) {
          const lowStock = batches.filter((b: any) => b.quantity < 50 && b.status === 'active');
          lowStock.forEach((b: any, index: number) => {
            alerts.push({
              id: `low-stock-${b.id}-${index}`,
              title: 'Alerta de Bajo Stock',
              description: `Lote ${b.batch_number} tiene solo ${b.quantity} unidades restantes.`,
              time: 'Alerta',
              type: 'warning',
              read: false,
            });
          });
        }

        // Pending tasks
        if (Array.isArray(tasks)) {
          const pending = tasks.filter((t: any) => !t.completada);
          pending.slice(0, 3).forEach((t: any, index: number) => {
            alerts.push({
              id: `task-pending-${t.id}-${index}`,
              title: 'Tarea Pendiente',
              description: `Pendiente: ${t.titulo}`,
              time: 'Tarea',
              type: 'info',
              read: false,
            });
          });
        }

        setNotifications(prev => {
          const readIds = new Set(prev.filter(n => n.read).map(n => n.id));
          const statics = prev.filter(n => !n.id.startsWith('low-stock-') && !n.id.startsWith('task-pending-'));
          
          const newAlerts = alerts.map(a => ({
            ...a,
            read: readIds.has(a.id)
          }));

          return [...newAlerts, ...statics];
        });
      } catch (err) {
        console.error('Error fetching alerts for notifications:', err);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Load branches for admin
  useEffect(() => {
    if (isAdmin) {
      apiFetch('/sucursales').then(data => setSucursales(data || [])).catch(() => {});
    }
  }, [isAdmin]);

  // Search Logic (Real-time debounced search)
  useEffect(() => {
    const searchData = async () => {
      if (searchTerm.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        const results: SearchResult[] = [];
        const medications = await apiFetch(`/medications`);
        const filteredSearchMed = medications.filter((m: any) => m.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 5);

        if (filteredSearchMed) {
          results.push(...filteredSearchMed.map((med: any) => ({
            type: 'medication' as const,
            id: med.id,
            name: med.name,
            subtitle: med.category
          })));
        }

        const users = await apiFetch(`/users`);
        const filteredSearchUsers = users.filter((u: any) => 
          (u.first_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
          (u.last_name || '').toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 5);

        if (filteredSearchUsers) {
          results.push(...filteredSearchUsers.map((user: any) => ({
            type: 'user' as const,
            id: user.id,
            name: (user.first_name || 'Nuevo') + ' ' + (user.last_name || 'Usuario'),
            subtitle: user.email || ''
          })));
        }

        setSearchResults(results);
        setShowSearchResults(true);
      } catch (error) {
        console.error('Error searching:', error);
      }
    };

    const debounce = setTimeout(searchData, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm]);

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'medication') {
      onNavigate('inventory');
    } else if (result.type === 'user') {
      onNavigate('users');
    }
    setSearchTerm('');
    setShowSearchResults(false);
  };

  const handleLogout = async () => {
    await signOut();
    setShowLogoutConfirm(false);
  };

  const handleSwitchSucursal = async (sucursalId: string) => {
    if (switchingBranch) return;
    if (sucursalId === 'global' && !profile?.sucursal_id) return;
    if (sucursalId !== 'global' && sucursalId === profile?.sucursal_id) return;
    setSwitchingBranch(true);
    try {
      await switchSucursal(sucursalId);
      setIsSucursalDropdownOpen(false);
    } catch (err: any) {
      alert('Error al cambiar de sede: ' + (err.message || 'Error desconocido'));
    } finally {
      setSwitchingBranch(false);
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin':
      case 'Administrator':
        return 'Administrador';
      case 'technical_assistant':
        return 'Asistente Técnico';
      case 'warehouse_keeper':
      case 'Warehouse_Keeper':
        return 'Almacenista';
      case 'Pharmacist':
        return 'Farmacéutico/a';
      case 'Doctor':
        return 'Médico';
      case 'Nurse':
        return 'Enfermero/a';
      default:
        return 'Usuario';
    }
  };

  // Main menu items
  const mainMenuItems = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard, requiresAltoCosto: false },
    { id: 'alto_costo', label: 'Alto Costo', icon: Activity, requiresAltoCosto: true },
    { id: 'inventory', label: 'Inventario', icon: Package, requiresAltoCosto: false },
    { id: 'deliveries', label: 'Entregas', icon: TrendingDown, requiresAltoCosto: false },
    { id: 'statistics', label: 'Estadísticas', icon: BarChart3, requiresAltoCosto: false },
    { id: 'tareas', label: 'Tareas', icon: CheckSquare, requiresAltoCosto: false },
  ];

  // Admin menu items (rendered inside dropdown)
  const adminMenuItems = [
    { id: 'audit', label: 'Auditoría', icon: FileText },
    { id: 'backup', label: 'Respaldo', icon: Database },
    { id: 'users', label: 'Usuarios', icon: Users },
    { id: 'sucursales', label: 'Gestión de Sedes', icon: Building2 },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  const filteredMainMenu = mainMenuItems.filter(item => {
    if (item.requiresAltoCosto && !isAdmin && !canAccessAltoCosto) return false;
    return true;
  });

  const isAdminActive = adminMenuItems.some(item => currentPage === item.id);

  return (
    <>
      <nav className="sticky top-4 z-50 mt-4 mx-6 bg-slate-950/85 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.35)] rounded-3xl px-6 py-3 transition-all duration-300">
        <div className="flex items-center justify-between gap-4">
          
          {/* LOGO SECTION */}
          <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => onNavigate('dashboard')}>
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform duration-200">
              <svg className="w-6 h-6 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="hidden lg:block">
              <h1 className="text-sm font-black text-white tracking-wider uppercase leading-none">MediControl</h1>
              <span className="text-[10px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300 tracking-widest leading-none">PRO SYSTEM</span>
            </div>
          </div>

          {/* MAIN MENU ITEMS (Capsule buttons with emerald/cyan glow) */}
          <div className="hidden md:flex items-center gap-1.5">
            {filteredMainMenu.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`
                    group relative flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all duration-300 border text-xs font-semibold
                    ${isActive
                      ? 'bg-white/10 border-white/15 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_0_15px_rgba(16,185,129,0.25)]'
                      : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  <Icon className={`
                    h-4 w-4 shrink-0 transition-transform duration-300 group-hover:scale-110
                    ${isActive 
                      ? 'text-emerald-400 filter drop-shadow-[0_0_5px_rgba(16,185,129,0.7)]' 
                      : 'text-slate-400 group-hover:text-cyan-400 group-hover:filter group-hover:drop-shadow-[0_0_5px_rgba(6,182,212,0.6)]'
                    }
                  `} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* ADMIN DROPDOWN (If Admin) */}
            {isAdmin && (
              <div className="relative" ref={adminDropdownRef}>
                <button
                  onClick={() => setIsAdminDropdownOpen(!isAdminDropdownOpen)}
                  className={`
                    group flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all duration-300 border text-xs font-semibold
                    ${isAdminActive
                      ? 'bg-white/10 border-white/15 text-cyan-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_0_15px_rgba(6,182,212,0.25)]'
                      : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  <Shield className={`
                    h-4 w-4 shrink-0 transition-transform duration-300 group-hover:scale-110
                    ${isAdminActive 
                      ? 'text-cyan-400 filter drop-shadow-[0_0_5px_rgba(6,182,212,0.7)]' 
                      : 'text-slate-400 group-hover:text-emerald-400 group-hover:filter group-hover:drop-shadow-[0_0_5px_rgba(16,185,129,0.6)]'
                    }
                  `} />
                  <span>Administración</span>
                  <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${isAdminDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isAdminDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2.5 w-48 bg-slate-950 border border-white/10 rounded-2xl shadow-2xl p-1.5 overflow-hidden z-50 animate-fade-in divide-y divide-white/5">
                    {adminMenuItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentPage === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onNavigate(item.id);
                            setIsAdminDropdownOpen(false);
                          }}
                          className={`
                            w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-xs font-medium text-left
                            ${isActive
                              ? 'bg-cyan-500/10 text-cyan-400 font-semibold'
                              : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }
                          `}
                        >
                          <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SEARCH & CONTROLS */}
          <div className="flex items-center gap-3 shrink-0 ml-auto">
            {/* Search Input */}
            <div className="relative hidden lg:block" ref={searchRef}>
              <input
                type="text"
                placeholder="Buscar medicamentos o usuarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => searchTerm.length >= 2 && setShowSearchResults(true)}
                className="pl-9 pr-4 py-1.5 bg-white/5 hover:bg-white/10 focus:bg-slate-900 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 w-60 transition-all duration-200 text-xs text-white"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />

              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute top-full mt-2.5 right-0 w-80 bg-slate-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto divide-y divide-white/5">
                  {searchResults.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleResultClick(result)}
                      className="w-full px-4 py-2.5 text-left hover:bg-white/5 transition-colors flex items-center gap-3"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        result.type === 'medication'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {result.type === 'medication' ? (
                          <Package className="h-4 w-4" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-xs truncate">{result.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{result.subtitle}</p>
                      </div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider bg-white/10 px-1.5 py-0.5 rounded">
                        {result.type === 'medication' ? 'Med' : 'User'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative" ref={notificationsRef}>
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-200 border border-white/5 flex items-center justify-center"
                title="Centro de notificaciones"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-extrabold text-white shadow-[0_0_6px_rgba(16,185,129,0.8)]">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute top-full right-0 mt-2.5 w-80 bg-slate-950/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-4 z-50 animate-fade-in text-left">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-2.5">
                    <h3 className="font-bold text-white text-xs">Centro de Notificaciones</h3>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllAsRead}
                        className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-350 transition-colors"
                      >
                        Marcar todo como leído
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {notifications.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-xs">
                        <Bell className="h-8 w-8 mx-auto mb-2 text-slate-650 opacity-40 animate-pulse" />
                        <p className="font-medium">No hay notificaciones</p>
                        <p className="text-[10px] text-slate-600 mt-0.5">El sistema no reporta alertas activas</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id}
                          onClick={() => markAsRead(notif.id)}
                          className={`p-2.5 rounded-xl border transition-all duration-150 cursor-pointer flex gap-2.5 ${
                            notif.read 
                              ? 'bg-white/[0.01] border-white/5 opacity-60' 
                              : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.06] hover:border-white/15'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            notif.read ? 'bg-transparent' : 
                            notif.type === 'warning' ? 'bg-amber-400' :
                            notif.type === 'error' ? 'bg-red-500' :
                            notif.type === 'success' ? 'bg-emerald-400' : 'bg-blue-400'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline gap-1.5">
                              <p className={`text-[11px] truncate ${notif.read ? 'font-medium text-slate-400' : 'font-bold text-white'}`}>
                                {notif.title}
                              </p>
                              <span className="text-[8px] font-bold text-slate-500 shrink-0">{notif.time}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-normal break-words">{notif.description}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Branch Switcher (Admin only) */}
            {isAdmin && (
              <div className="relative" ref={sucursalDropdownRef}>
                <button
                  onClick={() => setIsSucursalDropdownOpen(!isSucursalDropdownOpen)}
                  disabled={switchingBranch}
                  title="Cambiar sede activa"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-200 ${
                    switchingBranch
                      ? 'bg-white/5 border-white/5 text-slate-500 cursor-wait'
                      : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/30'
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline max-w-[100px] truncate">
                    {switchingBranch ? 'Cambiando...' : (profile?.sucursal_id ? profile.sucursal_nombre : 'Acceso Global')}
                  </span>
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isSucursalDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isSucursalDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2.5 w-56 bg-slate-950 border border-white/10 rounded-2xl shadow-2xl p-2 z-50 animate-fade-in">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2 pb-2">Seleccionar Sede</p>
                    <div className="space-y-0.5">
                      <button
                        onClick={() => handleSwitchSucursal('global')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-left transition-all duration-150 ${
                          !profile?.sucursal_id
                            ? 'bg-cyan-500/15 text-cyan-400 font-semibold'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <Building2 className={`h-3.5 w-3.5 shrink-0 ${!profile?.sucursal_id ? 'text-cyan-400' : 'text-slate-500'}`} />
                        <span className="truncate">Acceso Global (Todas)</span>
                        {!profile?.sucursal_id && (
                          <span className="ml-auto text-[8px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">ACTIVA</span>
                        )}
                      </button>
                      <div className="h-px bg-white/5 my-1" />
                      {sucursales.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-3">No hay sedes registradas</p>
                      ) : (
                        sucursales.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => handleSwitchSucursal(s.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-left transition-all duration-150 ${
                              profile?.sucursal_id === s.id
                                ? 'bg-cyan-500/15 text-cyan-400 font-semibold'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <Building2 className={`h-3.5 w-3.5 shrink-0 ${profile?.sucursal_id === s.id ? 'text-cyan-400' : 'text-slate-500'}`} />
                            <span className="truncate">{s.nombre}</span>
                            {profile?.sucursal_id === s.id && (
                              <span className="ml-auto text-[8px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">ACTIVA</span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Profile Dropdown */}
            <div className="relative" ref={profileDropdownRef}>
              <div 
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-2 cursor-pointer p-1.5 rounded-xl hover:bg-white/5 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 via-teal-500 to-blue-500 rounded-xl flex items-center justify-center text-slate-950 font-extrabold text-sm shadow-md hover:scale-105 transition-transform duration-200">
                  {profile?.first_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="hidden xl:block text-left pr-1">
                  <p className="text-xs font-bold text-white leading-none">{profile?.first_name} {profile?.last_name?.charAt(0)}.</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] font-semibold text-emerald-400 leading-none">{getRoleLabel(profile?.role)}</span>
                    <span className="text-[8px] font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1 py-0.5 rounded leading-none">{profile?.sucursal_nombre || 'Sede Principal'}</span>
                  </div>
                </div>
              </div>

              {isProfileDropdownOpen && (
                <div className="absolute top-full right-0 mt-2.5 w-56 bg-slate-950 border border-white/10 rounded-2xl shadow-2xl p-2.5 z-50 animate-fade-in space-y-2">
                  <div className="px-2 py-1.5 border-b border-white/5 text-left">
                    <p className="text-xs font-bold text-white">{profile?.first_name} {profile?.last_name}</p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{profile?.email}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md w-fit">
                        {getRoleLabel(profile?.role)}
                      </span>
                      <span className="text-[9px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md w-fit">
                        {profile?.sucursal_nombre || 'Sede Principal'}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      setShowLogoutConfirm(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors text-xs font-semibold text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      </nav>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Cerrar Sesión"
        message="¿Estás seguro de que deseas cerrar sesión en MediControl Pro?"
        confirmText="Sí, cerrar sesión"
        cancelText="Cancelar"
      />
    </>
  );
}
