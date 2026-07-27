import { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Search,
  Package,
  User,
  HelpCircle,
  Menu,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  Building2,
  Globe,
  ChevronDown,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { Tooltip } from '../ui/Tooltip';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onNavigate: (page: string) => void;
  onToggleMobileMenu: () => void;
  onOpenHelp: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

interface SearchResult {
  type: 'medication' | 'user';
  id: string;
  name: string;
  subtitle: string;
}

interface Sucursal {
  id: string;
  nombre: string;
  estado: string;
}

export function Header({
  title,
  subtitle,
  onNavigate,
  onToggleMobileMenu,
  onOpenHelp,
  isSidebarCollapsed,
  onToggleSidebar,
}: HeaderProps) {
  const { profile, signOut, isAdmin, switchSucursal } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSedeSelector, setShowSedeSelector] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [selectedSedeName, setSelectedSedeName] = useState('Todas las Sedes');
  const [switchingSedeId, setSwitchingSedeId] = useState<string | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const sedeRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setShowResults(false);
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setShowProfileMenu(false);
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setShowNotifications(false);
      if (sedeRef.current && !sedeRef.current.contains(event.target as Node)) setShowSedeSelector(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch low stock notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const meds = await apiFetch(`/medications`);
        if (Array.isArray(meds)) {
          const lowStock = meds.filter((m: any) => (m.stock || 0) <= (m.min_stock || 10));
          setNotifications(lowStock);
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };
    fetchNotifications();
  }, []);

  // Fetch sucursales for admin selector and update active branch name
  useEffect(() => {
    if (!isAdmin) return;
    const fetchSucursales = async () => {
      try {
        const data = await apiFetch('/sucursales');
        if (Array.isArray(data)) {
          setSucursales(data.filter((s: Sucursal) => s.estado === 'activo' || s.estado !== 'inactivo'));

          const currentSucursalId = (profile as any)?.sucursal_id;
          if (currentSucursalId && currentSucursalId !== 'global' && currentSucursalId !== 'all') {
            const found = data.find((s: Sucursal) => s.id === currentSucursalId);
            if (found) {
              setSelectedSedeName(found.nombre);
            } else if ((profile as any)?.sucursal_nombre) {
              setSelectedSedeName((profile as any).sucursal_nombre);
            } else {
              setSelectedSedeName('Todas las Sedes');
            }
          } else {
            setSelectedSedeName('Todas las Sedes');
          }
        }
      } catch (err) {
        console.error('Error fetching sucursales:', err);
      }
    };
    fetchSucursales();
  }, [isAdmin, profile]);

  // Global search debounce
  useEffect(() => {
    const searchData = async () => {
      if (searchTerm.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      try {
        const results: SearchResult[] = [];
        const medications = await apiFetch(`/medications`);
        if (Array.isArray(medications)) {
          results.push(
            ...medications
              .filter((m: any) => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
              .slice(0, 4)
              .map((med: any) => ({
                type: 'medication' as const,
                id: med.id,
                name: med.name,
                subtitle: `Categoría: ${med.category || 'General'} • Stock: ${med.stock || 0}`,
              }))
          );
        }
        const users = await apiFetch(`/user_profiles`);
        if (Array.isArray(users)) {
          results.push(
            ...users
              .filter(
                (u: any) =>
                  u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  u.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .slice(0, 4)
              .map((u: any) => ({
                type: 'user' as const,
                id: u.id,
                name: `${u.first_name || ''} ${u.last_name || ''}`,
                subtitle: u.email || '',
              }))
          );
        }
        setSearchResults(results);
        setShowResults(true);
      } catch (error) {
        console.error('Error in search:', error);
      }
    };
    const debounce = setTimeout(searchData, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm]);

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'medication') onNavigate('inventory');
    else if (result.type === 'user') onNavigate('users');
    setSearchTerm('');
    setShowResults(false);
  };

  const handleSwitchSede = async (sucursalId: string | 'all', nombre: string) => {
    setSwitchingSedeId(sucursalId);
    try {
      await switchSucursal(sucursalId === 'all' ? 'global' : sucursalId);
      setSelectedSedeName(nombre);
      setShowSedeSelector(false);
    } catch (err) {
      console.error('Error al cambiar sede:', err);
    } finally {
      setSwitchingSedeId(null);
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin': case 'Administrator': return 'Administrador';
      case 'technical_assistant': return 'Asistente Técnico';
      case 'warehouse_keeper': return 'Almacenista';
      case 'staff': return 'Personal Sanitario';
      default: return 'Usuario';
    }
  };

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 sticky top-0 z-20 transition-all duration-300">
      <div className="flex items-center justify-between gap-4">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          {/* Mobile Menu Button */}
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition border border-slate-200"
            aria-label="Abrir navegación móvil"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop Sidebar Toggle */}
          <button
            onClick={onToggleSidebar}
            className="hidden lg:flex items-center justify-center p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition border border-slate-200"
            title={isSidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">{title}</h2>
            {subtitle && <p className="text-slate-500 text-[11px] font-semibold mt-0.5">{subtitle}</p>}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2.5">

          {/* ===== SELECTOR DE SEDE (Solo Administradores) ===== */}
          {isAdmin && (
            <div className="relative" ref={sedeRef}>
              <Tooltip content="Filtrar datos por sede o ver todas" position="bottom">
                <button
                  onClick={() => setShowSedeSelector(!showSedeSelector)}
                  className="hidden sm:flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold text-blue-800 transition-all duration-200 max-w-[200px]"
                >
                  {selectedSedeName === 'Todas las Sedes'
                    ? <Globe className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    : <Building2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  }
                  <span className="truncate">{selectedSedeName}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-blue-500 flex-shrink-0 transition-transform ${showSedeSelector ? 'rotate-180' : ''}`} />
                </button>
              </Tooltip>

              {showSedeSelector && (
                <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-fade-in">
                  {/* Header del dropdown */}
                  <div className="px-4 py-3 bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
                    <p className="text-xs font-black">Selector de Sede</p>
                    <p className="text-[10px] text-blue-200 mt-0.5">Solo visible para Administradores</p>
                  </div>

                  <div className="p-2 max-h-72 overflow-y-auto">
                    {/* Opción Todas las Sedes */}
                    <button
                      onClick={() => handleSwitchSede('all', 'Todas las Sedes')}
                      disabled={switchingSedeId === 'all'}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition mb-1 ${
                        selectedSedeName === 'Todas las Sedes'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Globe className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1">
                        <p>Todas las Sedes</p>
                        <p className={`text-[10px] font-normal ${selectedSedeName === 'Todas las Sedes' ? 'text-blue-200' : 'text-slate-400'}`}>
                          Vista consolidada del sistema
                        </p>
                      </div>
                      {selectedSedeName === 'Todas las Sedes' && (
                        <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
                      )}
                    </button>

                    {/* Divisor */}
                    {sucursales.length > 0 && (
                      <div className="my-1.5 border-t border-slate-100 pt-1.5">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-3 mb-1">Sedes Disponibles</p>
                      </div>
                    )}

                    {/* Lista de Sucursales */}
                    {sucursales.map(sede => (
                      <button
                        key={sede.id}
                        onClick={() => handleSwitchSede(sede.id, sede.nombre)}
                        disabled={switchingSedeId === sede.id}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs transition mb-0.5 ${
                          selectedSedeName === sede.nombre
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'text-slate-700 hover:bg-slate-100 font-semibold'
                        }`}
                      >
                        <Building2 className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1 truncate">{sede.nombre}</span>
                        {selectedSedeName === sede.nombre && (
                          <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
                        )}
                        {switchingSedeId === sede.id && (
                          <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                        )}
                      </button>
                    ))}

                    {sucursales.length === 0 && (
                      <div className="py-4 text-center text-xs text-slate-400">
                        No hay sedes activas configuradas.<br />
                        <button onClick={() => { onNavigate('sucursales'); setShowSedeSelector(false); }}
                          className="text-blue-600 font-bold mt-1 hover:underline">Crear sedes →</button>
                      </div>
                    )}
                  </div>

                  <div className="px-3 py-2.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
                    🔒 Este control solo es visible para Administradores Globales
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Global Search Input */}
          <div className="relative hidden md:block" ref={searchRef}>
            <input
              type="text"
              placeholder="Buscar medicamentos o personal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => searchTerm.length >= 2 && setShowResults(true)}
              className="pl-9 pr-4 py-2 text-xs border border-slate-200 bg-slate-50/70 hover:bg-slate-50 focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 w-52 lg:w-72 transition-all duration-200 shadow-2xs text-slate-800 font-medium"
            />
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />

            {showResults && searchResults.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 divide-y divide-slate-100 animate-fade-in">
                {searchResults.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50/50 transition-colors flex items-center gap-3"
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${result.type === 'medication' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {result.type === 'medication' ? <Package className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-xs truncate">{result.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{result.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Help Button */}
          <Tooltip content="Manual de Usuario Integrado" position="bottom">
            <button
              onClick={onOpenHelp}
              className="p-2.5 text-blue-700 bg-blue-50 hover:bg-blue-100/80 rounded-xl transition border border-blue-200/70 flex items-center gap-1.5"
            >
              <HelpCircle className="h-4 w-4 text-blue-600 animate-pulse" />
              <span className="hidden lg:inline text-xs font-bold">Ayuda</span>
            </button>
          </Tooltip>

          {/* Notifications Bell */}
          <div className="relative" ref={notifRef}>
            <Tooltip content="Alertas de Inventario" position="bottom">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition border border-slate-200"
              >
                <Bell className="h-4 w-4" />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                )}
              </button>
            </Tooltip>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-fade-in">
                <div className="p-3.5 bg-slate-900 text-white font-extrabold text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Bell className="w-4 h-4 text-amber-400" /> Alertas de Bajo Stock</span>
                  <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px]">{notifications.length} Críticos</span>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length > 0 ? (
                    notifications.map((med: any) => (
                      <div key={med.id} onClick={() => { onNavigate('inventory'); setShowNotifications(false); }}
                        className="p-3 hover:bg-slate-50 cursor-pointer transition text-xs">
                        <p className="font-bold text-slate-900">{med.name}</p>
                        <p className="text-[11px] text-amber-700 font-semibold mt-0.5">
                          Stock actual: {med.stock || 0} u. (Mínimo: {med.min_stock || 10})
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-400">✨ Stock en nivel óptimo.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div className="relative border-l border-slate-200 pl-2.5" ref={profileRef}>
            <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center gap-2 hover:opacity-90 transition">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 via-indigo-600 to-emerald-500 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-md ring-2 ring-white">
                {profile?.first_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="text-left hidden lg:block">
                <p className="text-xs font-extrabold text-slate-800 leading-tight">{profile?.first_name} {profile?.last_name}</p>
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">{getRoleLabel(profile?.role)}</p>
              </div>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 p-2 text-xs animate-fade-in space-y-1">
                <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 rounded-xl">
                  <p className="font-extrabold text-slate-900">{profile?.first_name} {profile?.last_name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{profile?.email}</p>
                  <p className="text-[10px] text-emerald-600 font-bold mt-0.5">{getRoleLabel(profile?.role)}</p>
                </div>
                <button onClick={() => { onNavigate('settings'); setShowProfileMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-xl font-medium transition">
                  <Settings className="w-4 h-4 text-slate-400" /> Configuración
                </button>
                <button onClick={() => { onOpenHelp(); setShowProfileMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-blue-700 hover:bg-blue-50 rounded-xl font-bold transition">
                  <HelpCircle className="w-4 h-4 text-blue-600" /> Manual de Usuario
                </button>
                <div className="border-t border-slate-100 pt-1">
                  <button onClick={() => signOut()}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl font-bold transition">
                    <LogOut className="w-4 h-4 text-red-500" /> Cerrar Sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
