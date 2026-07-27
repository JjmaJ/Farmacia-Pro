import { ReactNode, useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { FloatingHelpButton } from '../ui/FloatingHelpButton';
import { HelpDrawer } from '../ui/HelpDrawer';
import { AlertTriangle } from 'lucide-react';

import { apiFetch } from '../../lib/api';

interface DashboardLayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  title: string;
  subtitle?: string;
}

export function DashboardLayout({ children, currentPage, onNavigate, title, subtitle }: DashboardLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const [isMaintenanceMode, setIsMaintenanceMode] = useState(() => {
    return localStorage.getItem('medicontrol_maintenance_mode') === 'true';
  });

  useEffect(() => {
    const handleMaintChange = () => {
      setIsMaintenanceMode(localStorage.getItem('medicontrol_maintenance_mode') === 'true');
    };
    window.addEventListener('maintenanceModeChanged', handleMaintChange);
    return () => window.removeEventListener('maintenanceModeChanged', handleMaintChange);
  }, []);

  const disableMaintenance = async () => {
    try {
      await apiFetch('/system/maintenance', {
        method: 'POST',
        body: JSON.stringify({ maintenance: false })
      });
    } catch (err) {
      console.error('Error disabling maintenance mode on backend:', err);
    }
    localStorage.setItem('medicontrol_maintenance_mode', 'false');
    sessionStorage.removeItem('medicontrol_bypass_maintenance');
    window.dispatchEvent(new Event('maintenanceModeChanged'));
  };

  return (
    <div className="flex h-screen bg-slate-100/70 overflow-hidden relative font-sans text-slate-900 selection:bg-blue-500 selection:text-white">
      {/* Collapsible Executive Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onOpenHelp={() => setIsHelpOpen(true)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Banner Superior de Mantenimiento para Admin */}
        {isMaintenanceMode && (
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-slate-950 px-4 py-1.5 font-bold text-xs flex items-center justify-between shadow-md z-30 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="bg-slate-950 text-amber-400 px-2 py-0.5 rounded text-[10px] uppercase font-black flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-400" /> Mantenimiento Activo
              </span>
              <span className="hidden sm:inline">El sistema está bloqueado para usuarios regulares. Estás operando en Modo Administrador.</span>
            </div>
            <button
              onClick={disableMaintenance}
              className="px-2.5 py-1 bg-slate-950 hover:bg-slate-900 text-white text-[11px] font-bold rounded transition border border-amber-400/40 shrink-0"
            >
              Desactivar Mantenimiento
            </button>
          </div>
        )}

        {/* Top Header */}
        <Header
          title={title}
          subtitle={subtitle}
          onNavigate={onNavigate}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onOpenHelp={() => setIsHelpOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative z-10">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Floating (?) Help Button on Bottom Right */}
      <FloatingHelpButton onClick={() => setIsHelpOpen(true)} />

      {/* Online User Manual Drawer & Help Center */}
      <HelpDrawer
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        currentPage={currentPage}
      />
    </div>
  );
}
