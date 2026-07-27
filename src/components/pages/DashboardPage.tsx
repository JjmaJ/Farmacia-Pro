import { useState, useEffect } from 'react';
import { 
  Package, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  Activity, 
  Circle, 
  Plus, 
  ListTodo
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { ModuleHelp } from '../ui/ModuleHelp';

const DASHBOARD_HELP = [
  {
    title: 'Monitorear alertas',
    steps: [
      { text: 'Revisa las 4 tarjetas superiores: Total Productos, Bajo Stock, Movimientos y Por Vencer.' },
      { text: 'Los lotes con menos de 50 unidades generan alertas automáticas de bajo stock.' },
      { text: 'Haz clic en "Ver Inventario" para ir directamente al lote crítico.' },
    ],
    example: 'Ejemplo: Si ves "Bajo Stock: 3", significa que 3 lotes tienen menos de 50 unidades disponibles y requieren reposición.',
    exampleFields: [
      { label: 'Umbral bajo stock', value: '< 50 unidades' },
      { label: 'Por vencer', value: 'Próximos 30 días' },
    ]
  },
  {
    title: 'Crear tarea rápida',
    steps: [
      { text: 'Escribe el título de la tarea en el campo inferior del panel.' },
      { text: 'Presiona "Agregar" para guardar la tarea pendiente.' },
      { text: 'Marca el checkbox para completar la tarea.' },
    ],
    example: 'Ejemplo: Escribe "Revisar vencimiento Insulina" y presiona Agregar. La tarea aparecerá en el listado.',
    exampleFields: [
      { label: 'Tarea', value: 'Revisar Insulina' },
      { label: 'Acción', value: 'Checkbox para completar' },
    ]
  },
];

interface DashboardPageProps {
  onNavigate?: (page: string) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { profile } = useAuth();

  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    recentMovements: 0,
    expiringSoon: 0,
  });

  const [recentMovements, setRecentMovements] = useState<any[]>([]);
  const [tareas, setTareas] = useState<any[]>([]);
  const [lowStockBatches, setLowStockBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [submittingTask, setSubmittingTask] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [medications, movements, batches, tasksData] = await Promise.all([
        apiFetch('/medications'),
        apiFetch('/inventory_movements'),
        apiFetch('/inventory_batches'),
        apiFetch('/tareas').catch(() => []),
      ]);

      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const safeMedications = Array.isArray(medications) ? medications : [];
      const safeMovements = Array.isArray(movements) ? movements : [];
      const safeBatches = Array.isArray(batches) ? batches : [];
      const safeTasks = Array.isArray(tasksData) ? tasksData : [];

      setStats({
        totalProducts: safeMedications.length,
        lowStock: safeBatches.filter((b: any) => b.quantity < 50).length,
        recentMovements: safeMovements.filter((m: any) => {
          const mDate = new Date(m.created_at || m.performed_at);
          return mDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }).length,
        expiringSoon: safeBatches.filter((b: any) => {
          const expDate = new Date(b.expiration_date);
          return expDate > now && expDate <= thirtyDaysFromNow;
        }).length,
      });

      // Map medications to a lookup dictionary
      const medsMap = safeMedications.reduce((acc: any, med: any) => {
        acc[med.id] = med;
        return acc;
      }, {});

      // For movements, resolve medication names and batch details
      const resolvedMovements = safeMovements.slice(0, 5).map((m: any) => {
        const batch = safeBatches.find((b: any) => b.id === m.batch_id);
        const med = batch ? medsMap[batch.medication_id] : null;
        return {
          ...m,
          medication_name: med ? med.name : 'Med. Sin Registrar',
          batch_number: batch ? batch.batch_number : null,
        };
      });

      setRecentMovements(resolvedMovements);
      setTareas(safeTasks);

      // Low stock batches join
      const sortedLowStock = safeBatches
        .filter((b: any) => b.quantity < 50 && b.status === 'active')
        .map((b: any) => {
          const med = medsMap[b.medication_id];
          return {
            ...b,
            medication_name: med ? med.name : 'Medicamento Desconocido',
          };
        })
        .slice(0, 4);
      
      setLowStockBatches(sortedLowStock);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);


  const toggleTarea = async (id: string, completada: boolean) => {
    try {
      const data = await apiFetch(`/tareas/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ completada: !completada }),
      });
      setTareas(tareas.map(t => (t.id === id ? data : t)));
    } catch (error) {
      console.error('Error toggling tarea:', error);
    }
  };

  const addTarea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      setSubmittingTask(true);
      const data = await apiFetch('/tareas', {
        method: 'POST',
        body: JSON.stringify({ titulo: newTitle, descripcion: 'Registrado desde Dashboard' }),
      });
      setTareas([data, ...tareas]);
      setNewTitle('');
    } catch (error) {
      console.error('Error adding tarea:', error);
    } finally {
      setSubmittingTask(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500/10" />
          <div className="absolute inset-0 rounded-full border-4 border-t-emerald-500 animate-spin" />
        </div>
        <p className="text-sm font-semibold text-slate-500 animate-pulse">Cargando panel de control...</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Productos',
      value: stats.totalProducts,
      icon: Package,
      color: 'blue',
      description: 'Medicamentos registrados',
      progress: '100%',
      progressBarColor: 'bg-blue-500',
    },
    {
      title: 'Bajo Stock',
      value: stats.lowStock,
      icon: AlertTriangle,
      color: 'amber',
      description: 'Lotes requieren atencion',
      progress: stats.totalProducts > 0 ? `${Math.min(100, Math.round((stats.lowStock / stats.totalProducts) * 100))}%` : '0%',
      progressBarColor: 'bg-amber-500',
    },
    {
      title: 'Movimientos (7d)',
      value: stats.recentMovements,
      icon: Activity,
      color: 'emerald',
      description: 'Entradas y salidas',
      progress: '70%',
      progressBarColor: 'bg-emerald-500',
    },
    {
      title: 'Por Vencer (30d)',
      value: stats.expiringSoon,
      icon: Clock,
      color: 'red',
      description: 'Lotes en riesgo',
      progress: stats.totalProducts > 0 ? `${Math.min(100, Math.round((stats.expiringSoon / stats.totalProducts) * 100))}%` : '0%',
      progressBarColor: 'bg-red-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Saludo Ejecutivo con Animación ECG ─── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/40 to-emerald-50/30 border border-slate-200/70 rounded-2xl px-6 py-5 shadow-sm">
        {/* Animated ECG pulse strip — background decoration */}
        <div className="absolute inset-0 flex items-center justify-end pointer-events-none pr-6 opacity-20">
          <svg viewBox="0 0 320 60" className="w-72 h-16" xmlns="http://www.w3.org/2000/svg">
            <polyline
              points="0,30 40,30 55,10 65,50 75,5 90,55 100,30 160,30 175,10 185,50 195,5 210,55 220,30 280,30 295,10 305,50 315,5 320,30"
              fill="none"
              stroke="url(#ecgGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 600,
                strokeDashoffset: 600,
                animation: 'ecgDraw 2.4s ease-in-out infinite'
              }}
            />
            <defs>
              <linearGradient id="ecgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Pulse dot decoration */}
        <div className="absolute top-4 right-8 w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-lg shadow-emerald-400/40"
          style={{ animation: 'pulse 1.6s ease-in-out infinite' }} />
        <div className="absolute top-4 right-14 w-1.5 h-1.5 bg-blue-400 rounded-full opacity-60"
          style={{ animation: 'pulse 2s ease-in-out infinite 0.3s' }} />

        <style>{`
          @keyframes ecgDraw {
            0%   { stroke-dashoffset: 600; opacity: 0.3; }
            30%  { opacity: 1; }
            70%  { stroke-dashoffset: 0; opacity: 1; }
            100% { stroke-dashoffset: -600; opacity: 0.3; }
          }
          @keyframes shimmerText {
            0%, 100% { background-position: 0% 50%; }
            50%       { background-position: 100% 50%; }
          }
          @keyframes floatIcon {
            0%, 100% { transform: translateY(0px) rotate(0deg); box-shadow: 0 8px 30px rgba(59,130,246,0.2); }
            33%      { transform: translateY(-6px) rotate(1deg); box-shadow: 0 16px 40px rgba(59,130,246,0.35); }
            66%      { transform: translateY(-3px) rotate(-1deg); box-shadow: 0 12px 35px rgba(16,185,129,0.25); }
          }
        `}</style>

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Ilustración médica animada — insumos y medicamentos */}
            <div className="relative flex-shrink-0">
              <div
                className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200/60 flex items-center justify-center shadow-lg shadow-blue-200/50 overflow-hidden"
                style={{ animation: 'floatIcon 3s ease-in-out infinite' }}
              >
                <img
                  src="/medical-illustration.png"
                  alt=""
                  aria-hidden="true"
                  className="w-20 h-20 object-contain drop-shadow-md"
                />
              </div>
              {/* Live indicator */}
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white" />
              </span>
            </div>


            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Bienvenido,{' '}
                <span
                  className="text-transparent bg-clip-text"
                  style={{
                    backgroundImage: 'linear-gradient(90deg, #2563eb, #10b981, #6366f1, #2563eb)',
                    backgroundSize: '200% auto',
                    animation: 'shimmerText 3s linear infinite',
                    WebkitBackgroundClip: 'text',
                  }}
                >
                  {profile?.first_name || 'Usuario'}
                </span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-slate-500 text-xs font-medium">
                  Panel de control
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="text-blue-600 text-xs font-bold">MediControl Pro</span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="text-slate-500 text-xs font-medium">
                  {new Date().toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap gap-2 flex-shrink-0">
            <button
              onClick={() => onNavigate && onNavigate('deliveries')}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 hover:scale-[1.02] transition-all duration-200"
            >
              + Registrar Entrega
            </button>
            <button
              onClick={() => onNavigate && onNavigate('inventory')}
              className="px-3.5 py-2 bg-white hover:bg-blue-50 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 hover:scale-[1.02] transition-all duration-200 shadow-sm"
            >
              Gestionar Catálogo
            </button>
            <button
              onClick={() => onNavigate && onNavigate('tareas')}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 hover:scale-[1.02] transition-all duration-200 shadow-sm"
            >
              Lista de Tareas
            </button>
          </div>
        </div>
      </div>

      {/* Ayuda contextual del módulo Dashboard */}
      <ModuleHelp sections={DASHBOARD_HELP} />




      {/* Grid de Tarjetas de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const config = ({
            blue: {
              bg: 'bg-blue-50/20 hover:bg-blue-50/50 text-blue-600 border-blue-100 hover:border-blue-300 shadow-blue-500/5',
              iconBg: 'bg-blue-50 text-blue-600 border border-blue-100',
            },
            emerald: {
              bg: 'bg-emerald-50/20 hover:bg-emerald-50/50 text-emerald-600 border-emerald-100 hover:border-emerald-300 shadow-emerald-500/5',
              iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
            },
            amber: {
              bg: 'bg-amber-50/20 hover:bg-amber-50/50 text-amber-600 border-amber-100 hover:border-amber-300 shadow-amber-500/5',
              iconBg: 'bg-amber-50 text-amber-600 border border-amber-100',
            },
            red: {
              bg: 'bg-red-50/20 hover:bg-red-50/50 text-red-600 border-red-100 hover:border-red-300 shadow-red-500/5',
              iconBg: 'bg-red-50 text-red-600 border border-red-100',
            },
          }[stat.color as 'blue' | 'emerald' | 'amber' | 'red']) || { bg: '', iconBg: '' };

          return (
            <div 
              key={index} 
              className={`group bg-white/80 backdrop-blur-sm rounded-2xl border p-6 hover:shadow-xl hover:shadow-slate-100/50 transition-all duration-300 hover:-translate-y-1 cursor-default ${config.bg}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl transition-transform duration-300 group-hover:scale-110 ${config.iconBg}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100/80 px-2 py-0.5 rounded-full">
                  Métrica
                </span>
              </div>
              <div>
                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">{stat.value}</h3>
                <p className="text-sm font-bold text-slate-700 mt-1">{stat.title}</p>
                <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed">{stat.description}</p>
              </div>
              
              {/* Subtle bar indicator */}
              <div className="w-full bg-slate-200/50 h-1.5 rounded-full mt-4 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${stat.progressBarColor}`} style={{ width: stat.progress }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid Principal Dividido */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna Izquierda: Movimientos Recientes (2 columnas de ancho en pantallas grandes) */}
        <div className="lg:col-span-2 bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-250/80 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Movimientos Recientes</h3>
                <p className="text-xs text-slate-400 font-medium">Últimas entradas y salidas del inventario</p>
              </div>
              <button 
                onClick={() => onNavigate && onNavigate('statistics')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50/50 hover:bg-blue-100/80 px-3 py-1.5 rounded-xl transition-all border border-blue-100/50"
              >
                Ver Historial
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Medicamento</th>
                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Motivo</th>
                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Cantidad</th>
                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentMovements.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                        No hay movimientos registrados recientemente.
                      </td>
                    </tr>
                  ) : (
                    recentMovements.map((movement) => (
                      <tr key={movement.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            movement.type === 'entry' || movement.type === 'in' 
                              ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/10' 
                              : 'bg-red-500/10 text-red-700 border border-red-500/10'
                          }`}>
                            {movement.type === 'entry' || movement.type === 'in' ? (
                              <><ArrowDownRight className="w-3.5 h-3.5" /> Entrada</>
                            ) : (
                              <><ArrowUpRight className="w-3.5 h-3.5" /> Salida</>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-800">{movement.medication_name}</div>
                          {movement.batch_number && (
                            <span className="text-[10px] text-slate-400 font-mono">Lote: {movement.batch_number}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium text-xs max-w-[160px] truncate">{movement.reason}</td>
                        <td className="px-6 py-4 font-bold text-slate-800 text-xs">{movement.quantity} uds</td>
                        <td className="px-6 py-4 text-slate-400 font-medium text-xs">
                          {new Date(movement.created_at || movement.performed_at).toLocaleDateString('es-ES', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Widgets */}
        <div className="space-y-6">
          {/* Widget 1: Tareas Rápidas */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <ListTodo className="w-4.5 h-4.5 text-blue-500" />
                Tareas Pendientes
              </h4>
              <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                {tareas.filter(t => !t.completada).length} Activas
              </span>
            </div>

            {/* Formulario de Tarea Rápida */}
            <form onSubmit={addTarea} className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Nueva tarea rápida..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="flex-1 text-xs border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all font-medium"
                disabled={submittingTask}
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/10 flex items-center justify-center hover:scale-105"
                disabled={submittingTask}
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            {/* Listado Corto de Tareas */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {tareas.filter(t => !t.completada).length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs font-medium bg-slate-50/50 rounded-xl border border-slate-100 border-dashed">
                  ¡No hay tareas pendientes! 🎉
                </div>
              ) : (
                tareas.filter(t => !t.completada).slice(0, 3).map(tarea => (
                  <div 
                    key={tarea.id} 
                    className="flex items-center gap-3 p-3 bg-slate-50/40 hover:bg-slate-50 border border-slate-100 rounded-xl transition-all duration-200 group"
                  >
                    <button
                      onClick={() => toggleTarea(tarea.id, tarea.completada)}
                      className="text-slate-350 hover:text-emerald-500 hover:scale-110 transition-all flex-shrink-0"
                    >
                      <Circle className="w-4 h-4" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{tarea.titulo}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Widget 2: Alertas de Stock Crítico */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2 border-b border-slate-100 pb-3">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-500" />
              Alertas de Bajo Stock
            </h4>
            
            {lowStockBatches.length === 0 ? (
              <p className="text-xs text-emerald-800 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50 font-medium">
                ✓ Todo el stock está en niveles seguros.
              </p>
            ) : (
              <div className="space-y-2.5">
                {lowStockBatches.map((batch: any, i: number) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between p-3 bg-amber-500/[0.03] hover:bg-amber-500/[0.06] border border-amber-100/50 rounded-xl transition-all duration-200"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-800 truncate">{batch.medication_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">Lote: {batch.batch_number}</p>
                    </div>
                    <span className="text-xs font-extrabold text-amber-600 bg-amber-100/80 px-2.5 py-1 rounded-lg">
                      {batch.quantity} uds
                    </span>
                  </div>
                ))}
                
                {stats.lowStock > 4 && (
                  <button 
                    onClick={() => onNavigate && onNavigate('inventory')}
                    className="w-full text-center text-xs font-bold text-amber-600 hover:text-amber-700 mt-2 block"
                  >
                    Ver las {stats.lowStock} alertas &rarr;
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
