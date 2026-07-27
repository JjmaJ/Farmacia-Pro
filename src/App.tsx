import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/auth/AuthPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardPage } from './components/pages/DashboardPage';
import { InventoryPage } from './components/pages/InventoryPage';
import { DeliveriesPage } from './components/pages/DeliveriesPage';
import { StatisticsPage } from './components/pages/StatisticsPage';
import { AuditPage } from './components/pages/AuditPage';
import { BackupPage } from './components/pages/BackupPage';
import { UsersPage } from './components/pages/UsersPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { TareasPage } from './components/pages/TareasPage';
import { SucursalesPage } from './components/pages/SucursalesPage';
import { HighCostPatientsPage } from './components/pages/HighCostPatientsPage';

function AppContent() {
  const { user, profile, loading, isAdmin, canAccessAltoCosto } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-2xl shadow-lg shadow-blue-500/30 mb-4 animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">MediControl</h2>
          <p className="text-gray-600">Cargando sistema...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    console.log('App: Redirecting to AuthPage. user:', user, 'profile:', profile);
    return <AuthPage />;
  }

  const getPageTitle = () => {
    const titles: Record<string, { title: string; subtitle: string }> = {
      dashboard: { title: 'Inicio', subtitle: 'Panel de control general del sistema' },
      alto_costo: { title: 'Pacientes Alto Costo', subtitle: 'Gestion de pacientes de alto costo' },
      inventory: { title: 'Inventario', subtitle: 'Gestion de medicamentos y lotes' },
      deliveries: { title: 'Control de Entregas', subtitle: 'Registro de salidas de medicamentos' },
      statistics: { title: 'Estadisticas', subtitle: 'Analisis y reportes' },
      audit: { title: 'Auditoria', subtitle: 'Registro de actividades del sistema' },
      backup: { title: 'Respaldo de Datos', subtitle: 'Exportar e importar informacion' },
      users: { title: 'Gestion de Usuarios', subtitle: 'Administracion de personal' },
      settings: { title: 'Configuracion', subtitle: 'Ajustes del sistema' },
      tareas: { title: 'Tareas', subtitle: 'Gestion de tareas pendientes' },
      sucursales: { title: 'Gestión de Sedes', subtitle: 'Crear y administrar sedes del sistema' }
    };
    return titles[currentPage] || titles.dashboard;
  };

  const renderPage = () => {
    const adminOnlyPages = ['audit', 'backup', 'users', 'settings', 'sucursales'];

    if (!isAdmin && adminOnlyPages.includes(currentPage)) {
      setCurrentPage('dashboard');
      return <DashboardPage onNavigate={setCurrentPage} />;
    }

    if (currentPage === 'alto_costo' && !isAdmin && !canAccessAltoCosto) {
      setCurrentPage('dashboard');
      return <DashboardPage onNavigate={setCurrentPage} />;
    }

    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentPage} />;
      case 'alto_costo':
        return <HighCostPatientsPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'deliveries':
        return <DeliveriesPage />;
      case 'statistics':
        return <StatisticsPage />;
      case 'audit':
        return <AuditPage />;
      case 'backup':
        return <BackupPage />;
      case 'users':
        return <UsersPage />;
      case 'settings':
        return <SettingsPage />;
      case 'tareas':
        return <TareasPage />;
      case 'sucursales':
        return <SucursalesPage />;
      default:
        return <DashboardPage onNavigate={setCurrentPage} />;
    }
  };

  const { title, subtitle } = getPageTitle();

  return (
    <DashboardLayout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      title={title}
      subtitle={subtitle}
    >
      {renderPage()}
    </DashboardLayout>
  );
}

import { TourProvider } from './contexts/TourContext';

export default function App() {
  return (
    <AuthProvider>
      <TourProvider>
        <AppContent />
      </TourProvider>
    </AuthProvider>
  );
}
