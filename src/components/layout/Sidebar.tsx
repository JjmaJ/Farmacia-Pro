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
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Building2
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Tooltip } from '../ui/Tooltip';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenHelp: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  currentPage,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  onOpenHelp,
  isMobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const { profile, signOut, isAdmin, canAccessAltoCosto } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador Global';
      case 'technical_assistant':
        return 'Asistente Técnico';
      case 'warehouse_keeper':
        return 'Almacenista';
      case 'staff':
        return 'Personal Sanitario';
      default:
        return 'Usuario Autorizado';
    }
  };

  const handleLogout = async () => {
    await signOut();
    setShowLogoutConfirm(false);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard, adminOnly: false, requiresAltoCosto: false },
    { id: 'alto_costo', label: 'Alto Costo', icon: Activity, adminOnly: false, requiresAltoCosto: true },
    { id: 'inventory', label: 'Inventario', icon: Package, adminOnly: false, requiresAltoCosto: false },
    { id: 'deliveries', label: 'Entregas', icon: TrendingDown, adminOnly: false, requiresAltoCosto: false },
    { id: 'statistics', label: 'Estadísticas', icon: BarChart3, adminOnly: false, requiresAltoCosto: false },
    { id: 'tareas', label: 'Tareas', icon: CheckSquare, adminOnly: false, requiresAltoCosto: false },
    { id: 'sucursales', label: 'Sedes Hospitalarias', icon: Building2, adminOnly: true, requiresAltoCosto: false },
    { id: 'audit', label: 'Auditoría', icon: FileText, adminOnly: true, requiresAltoCosto: false },
    { id: 'backup', label: 'Respaldo', icon: Database, adminOnly: true, requiresAltoCosto: false },
    { id: 'users', label: 'Usuarios', icon: Users, adminOnly: true, requiresAltoCosto: false },
    { id: 'settings', label: 'Configuración', icon: Settings, adminOnly: true, requiresAltoCosto: false },
  ];

  const filteredItems = menuItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.requiresAltoCosto && !isAdmin && !canAccessAltoCosto) return false;
    return true;
  });

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-white border-r border-slate-800 relative select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          {!isCollapsed && (
            <div className="transition-all duration-300 opacity-100 whitespace-nowrap">
              <h1 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                MediControl <span className="text-emerald-400 font-extrabold text-[11px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">PRO</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold">Sistema Hospitalario IVSS</p>
            </div>
          )}
        </div>

        {/* Desktop Toggle Button */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex items-center justify-center w-7 h-7 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition"
          title={isCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Profile Card (Expanded state) */}
      {!isCollapsed && (
        <div className="mx-4 mt-4 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/30 text-blue-300 font-extrabold flex items-center justify-center text-xs border border-blue-500/30 flex-shrink-0">
            {profile?.first_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold text-slate-200 truncate">
              {profile?.first_name} {profile?.last_name}
            </p>
            <p className="text-[10px] font-semibold text-emerald-400 truncate">
              {getRoleLabel(profile?.role)}
            </p>
          </div>
        </div>
      )}

      {/* Nav Items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto mt-2">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          const buttonElement = (
            <button
              onClick={() => {
                onNavigate(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`
                w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all duration-200 group relative
                ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/25'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100 font-medium'
                }
                ${isCollapsed ? 'justify-center' : ''}
              `}
            >
              <Icon
                className={`h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                }`}
              />
              {!isCollapsed && <span className="text-xs truncate">{item.label}</span>}

              {/* Active Indicator Bar */}
              {isActive && !isCollapsed && (
                <span className="ml-auto w-1.5 h-4 bg-emerald-400 rounded-full" />
              )}
            </button>
          );

          if (isCollapsed) {
            return (
              <Tooltip key={item.id} content={item.label} position="right">
                {buttonElement}
              </Tooltip>
            );
          }

          return <div key={item.id}>{buttonElement}</div>;
        })}

        {/* Ayuda / Manual Menu Item */}
        <div className="pt-2 border-t border-slate-800/80 mt-2">
          {isCollapsed ? (
            <Tooltip content="Ayuda / Manual de Usuario" position="right">
              <button
                onClick={onOpenHelp}
                className="w-full flex items-center justify-center p-2.5 rounded-xl text-amber-400 hover:bg-amber-500/10 transition"
              >
                <HelpCircle className="h-5 w-5" />
              </button>
            </Tooltip>
          ) : (
            <button
              onClick={onOpenHelp}
              className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/20 font-bold transition text-xs"
            >
              <HelpCircle className="h-5 w-5 text-amber-400 flex-shrink-0 animate-pulse" />
              <span>Ayuda / Manual</span>
            </button>
          )}
        </div>
      </nav>

      {/* Logout Footer */}
      <div className="p-3 border-t border-slate-800">
        {isCollapsed ? (
          <Tooltip content="Cerrar Sesión" position="right">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center justify-center p-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </Tooltip>
        ) : (
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition text-xs font-semibold"
          >
            <LogOut className="h-4.5 w-4.5 flex-shrink-0" />
            <span>Cerrar Sesión</span>
          </button>
        )}
      </div>

      {/* Confirmation Logout Modal */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Cerrar Sesión"
        message="¿Estás seguro de que deseas salir del sistema MediControl Pro?"
        confirmText="Sí, cerrar sesión"
        cancelText="Cancelar"
      />
    </div>
  );

  return (
    <>
      {/* Desktop Permanent Sidebar */}
      <aside
        className={`hidden lg:block transition-all duration-300 ease-in-out z-30 h-screen sticky top-0 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 max-w-xs bg-slate-900 h-full shadow-2xl flex flex-col z-10 animate-fade-in">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
