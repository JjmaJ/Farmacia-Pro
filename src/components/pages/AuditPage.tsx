import { useState, useEffect, Fragment } from 'react';
import { 
  Activity, Search, ChevronDown, ChevronRight, RefreshCw, Filter, Package, 
  ArrowDownCircle, ArrowUpCircle, Trash2, AlertTriangle, LogIn, LogOut, 
  UserPlus, UserCheck, UserMinus, ShieldAlert, CheckCircle, Settings,
  ChevronLeft, ChevronsLeft, ChevronsRight, Building2
} from 'lucide-react';
import { getAuditLogs } from '../../services/auditService';
import { ModuleHelp } from '../ui/ModuleHelp';

const AUDIT_HELP = [
  {
    title: 'Consultar bitácora',
    steps: [
      { text: 'Usa la barra de búsqueda para filtrar por nombre de usuario, correo o tipo de acción.' },
      { text: 'Presiona los botones de filtro rápido (Inicios de Sesión, Entregas, etc.) para acotar resultados.' },
      { text: 'Haz clic en la flecha de cada fila para expandir los detalles de la acción e IP de origen.' },
      { text: 'Usa los controles de paginación inferiores para navegar entre páginas.' },
    ],
    example: 'Ejemplo: Escribe "admin@ivss" en el buscador y selecciona el filtro "Inicios de Sesión" para ver todos los accesos de ese usuario.',
    exampleFields: [
      { label: 'Búsqueda', value: 'admin@ivss.gob.ve' },
      { label: 'Filtro', value: 'Inicios de Sesión' },
      { label: 'Página', value: '1 de N (15 por pág.)' },
    ]
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  DELETE_MEDICATION:    { label: 'Eliminación Medicamento', color: 'text-red-700',    bg: 'bg-red-100 border-red-200',    icon: Trash2 },
  DELETE_BATCH:         { label: 'Eliminación Lote',        color: 'text-red-700',    bg: 'bg-red-100 border-red-200',    icon: Trash2 },
  STOCK_INGRESO:        { label: 'Ingreso de Stock',        color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-200', icon: ArrowUpCircle },
  INGRESO_MOVIMIENTO:   { label: 'Movimiento Entrada',      color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-200', icon: ArrowUpCircle },
  DESPACHO_ENTREGA:     { label: 'Despacho / Entrega',      color: 'text-blue-700',   bg: 'bg-blue-100 border-blue-200',   icon: ArrowDownCircle },
  DESPACHO_ALTO_COSTO:  { label: 'Despacho Alto Costo',     color: 'text-purple-700', bg: 'bg-purple-100 border-purple-200', icon: Activity },
  AJUSTE_INVENTARIO:    { label: 'Ajuste Inventario',       color: 'text-amber-700',  bg: 'bg-amber-100 border-amber-200',  icon: Package },
  USER_LOGIN:           { label: 'Inicio de Sesión',        color: 'text-emerald-800', bg: 'bg-emerald-100 border-emerald-300', icon: LogIn },
  USER_LOGIN_FAILED:    { label: 'Login Fallido',           color: 'text-red-800',     bg: 'bg-red-100 border-red-300',     icon: ShieldAlert },
  USER_LOGOUT:          { label: 'Cierre de Sesión',        color: 'text-slate-700',   bg: 'bg-slate-100 border-slate-300',   icon: LogOut },
  USER_CREATE:          { label: 'Usuario Creado',          color: 'text-cyan-800',    bg: 'bg-cyan-100 border-cyan-300',    icon: UserPlus },
  USER_UPDATE:          { label: 'Usuario Modificado',      color: 'text-blue-800',    bg: 'bg-blue-100 border-blue-300',    icon: UserCheck },
  USER_DELETE:          { label: 'Usuario Eliminado',       color: 'text-red-800',     bg: 'bg-red-100 border-red-300',     icon: UserMinus },
  USER_APPROVE:         { label: 'Usuario Aprobado',        color: 'text-emerald-800', bg: 'bg-emerald-100 border-emerald-300', icon: CheckCircle },
  SETTINGS_UPDATE:      { label: 'Configuración Sistema',   color: 'text-indigo-800',  bg: 'bg-indigo-100 border-indigo-300', icon: Settings },
  SUCURSAL_CREATE:      { label: 'Sede Creada',             color: 'text-teal-800',    bg: 'bg-teal-100 border-teal-300',    icon: Building2 },
};

const getActionCfg = (action: string) =>
  ACTION_CONFIG[action] || { label: action, color: 'text-gray-700', bg: 'bg-gray-100 border-gray-200', icon: Activity };

function ActionBadge({ action }: { action: string }) {
  const cfg = getActionCfg(action);
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

function renderLogDetails(details: any, ipAddress?: string) {
  if (!details && !ipAddress) return <p className="text-gray-400 text-xs italic">Sin detalles adicionales.</p>;

  let d = details;
  if (typeof details === 'string') {
    try { d = JSON.parse(details); } catch {
      return <pre className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap border border-gray-200">{details}</pre>;
    }
  }

  // Logins & Logouts
  if (d?.email || d?.reason) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs border-l-4 border-emerald-500 pl-4 py-2 rounded-r-lg bg-emerald-50/30">
        <div className="space-y-1">
          <p><span className="font-semibold text-gray-500">Correo Electrónico:</span> <span className="font-bold text-gray-900">{d.email || '—'}</span></p>
          {d.role && <p><span className="font-semibold text-gray-500">Rol asignado:</span> <span className="font-semibold text-emerald-700">{d.role}</span></p>}
          {d.sucursal && <p><span className="font-semibold text-gray-500">Sede Activa:</span> {d.sucursal}</p>}
        </div>
        <div className="space-y-1">
          {ipAddress && <p><span className="font-semibold text-gray-500">Dirección IP:</span> <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{ipAddress}</code></p>}
          {d.reason && <p><span className="font-semibold text-red-500">Motivo de Fallo:</span> <span className="font-semibold text-red-700">{d.reason}</span></p>}
          {d.timestamp && <p><span className="font-semibold text-gray-500">Registro Temporal:</span> {new Date(d.timestamp).toLocaleString('es-ES')}</p>}
        </div>
      </div>
    );
  }

  // Eliminaciones
  if (d?.accion === 'ELIMINACION_MEDICAMENTO' || d?.accion === 'ELIMINACION_LOTE' || d?.motivo_eliminacion) {
    const isLote = d.accion === 'ELIMINACION_LOTE' || d.lote_numero;
    const motivoLabel = d.motivo_eliminacion === 'vencimiento' ? '🗓️ Vencimiento del producto'
      : d.motivo_eliminacion === 'deterioro' ? '⚠️ Deterioro o daño físico'
      : d.motivo_eliminacion === 'mala_contabilidad' ? '📋 Error de contabilidad'
      : d.motivo_eliminacion || '—';

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs border-l-4 border-red-500 pl-4 py-2 rounded-r-lg bg-red-50/30">
        <div className="space-y-2">
          <p><span className="font-semibold text-gray-500">Tipo:</span> <span className="font-bold text-gray-800">{isLote ? 'Lote de Inventario' : 'Medicamento Catálogo'}</span></p>
          <p><span className="font-semibold text-gray-500">Elemento:</span> <span className="font-bold text-gray-900">{d.medicamento_nombre}</span></p>
          {d.medicamento_generico && <p><span className="font-semibold text-gray-500">Genérico:</span> {d.medicamento_generico}</p>}
          {isLote && d.lote_numero && <p><span className="font-semibold text-gray-500">Nº Lote:</span> <code className="bg-gray-100 px-1 rounded">{d.lote_numero}</code></p>}
          {d.presentacion && <p><span className="font-semibold text-gray-500">Presentación:</span> {d.presentacion}</p>}
        </div>
        <div className="space-y-2">
          <p><span className="font-semibold text-gray-500">Cantidad al eliminar:</span> <span className="font-bold text-red-600">{isLote ? d.cantidad_al_eliminar : d.stock_al_eliminar} uds.</span></p>
          <p><span className="font-semibold text-gray-500">Motivo:</span> <span className="inline-block bg-amber-50 border border-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded text-[10px] uppercase">{motivoLabel}</span></p>
          {d.notas_adicionales && <p><span className="font-semibold text-gray-500">Notas:</span> <em className="text-gray-600">"{d.notas_adicionales}"</em></p>}
          {d.eliminado_por && <p><span className="font-semibold text-gray-500">Por:</span> {d.eliminado_por}</p>}
        </div>
      </div>
    );
  }

  // Ingresos de stock
  if (d?.accion === 'INGRESO_DE_STOCK') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs border-l-4 border-emerald-500 pl-4 py-2 rounded-r-lg bg-emerald-50/30">
        <div className="space-y-2">
          <p><span className="font-semibold text-gray-500">Medicamento:</span> <span className="font-bold text-gray-900">{d.medicamento}</span></p>
          <p><span className="font-semibold text-gray-500">Lote:</span> <code className="bg-gray-100 px-1 rounded">{d.lote}</code></p>
        </div>
        <div className="space-y-2">
          <p><span className="font-semibold text-gray-500">Cantidad ingresada:</span> <span className="font-bold text-emerald-600">+{d.cantidad_ingresada} uds.</span></p>
          <p><span className="font-semibold text-gray-500">Motivo:</span> {d.motivo}</p>
        </div>
      </div>
    );
  }

  // Movimientos (entregas / salidas / ajustes)
  if (d?.accion === 'DESPACHO_ENTREGA' || d?.accion === 'INGRESO_MOVIMIENTO' || d?.accion === 'AJUSTE_INVENTARIO') {
    const isOut = d.tipo_movimiento === 'out' || d.tipo_movimiento === 'exit';
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 text-xs border-l-4 ${isOut ? 'border-blue-500 bg-blue-50/30' : 'border-emerald-500 bg-emerald-50/30'} pl-4 py-2 rounded-r-lg`}>
        <div className="space-y-2">
          <p><span className="font-semibold text-gray-500">Medicamento:</span> <span className="font-bold text-gray-900">{d.medicamento}</span></p>
          <p><span className="font-semibold text-gray-500">Lote:</span> <code className="bg-gray-100 px-1 rounded">{d.lote}</code></p>
          <p><span className="font-semibold text-gray-500">Motivo:</span> {d.motivo}</p>
        </div>
        <div className="space-y-2">
          <p><span className="font-semibold text-gray-500">Cantidad:</span> <span className={`font-bold ${isOut ? 'text-red-600' : 'text-emerald-600'}`}>{isOut ? '-' : '+'}{d.cantidad} uds.</span></p>
          {d.destino && d.destino !== '—' && <p><span className="font-semibold text-gray-500">Destino:</span> {d.destino}</p>}
        </div>
      </div>
    );
  }

  // Despacho alto costo
  if (d?.accion === 'DESPACHO_ALTO_COSTO') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs border-l-4 border-purple-500 pl-4 py-2 rounded-r-lg bg-purple-50/30">
        <div className="space-y-2">
          <p><span className="font-semibold text-gray-500">Paciente:</span> <span className="font-bold text-gray-900">{d.paciente}</span></p>
          <p><span className="font-semibold text-gray-500">Documento:</span> {d.documento}</p>
          <p><span className="font-semibold text-gray-500">Ciclo entregado:</span> <span className="font-bold text-purple-700">#{d.ciclo_entregado}</span></p>
        </div>
        <div className="space-y-2">
          <p><span className="font-semibold text-gray-500">Cantidad:</span> <span className="font-bold text-red-600">-{d.cantidad} uds.</span></p>
          <p><span className="font-semibold text-gray-500">Lote:</span> <code className="bg-gray-100 px-1 rounded">{d.batch_number}</code></p>
          {d.notas && d.notas !== '—' && <p><span className="font-semibold text-gray-500">Notas:</span> <em>{d.notas}</em></p>}
        </div>
      </div>
    );
  }

  // Genérico (cualquier otro)
  return (
    <div className="text-xs bg-gray-50 p-3 rounded-lg border border-gray-200">
      <div className="flex justify-between items-center mb-2">
        <p className="font-semibold text-gray-500 uppercase text-[10px] tracking-wider">Detalles del Registro:</p>
        {ipAddress && <span className="text-[10px] text-gray-400 font-mono">IP: {ipAddress}</span>}
      </div>
      <pre className="font-mono text-gray-700 overflow-x-auto max-w-full whitespace-pre-wrap">
        {JSON.stringify(d, null, 2)}
      </pre>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
const FILTER_OPTIONS = [
  { value: 'ALL',               label: 'Todos' },
  { value: 'USER_LOGIN',        label: 'Inicios de Sesión' },
  { value: 'USER_LOGOUT',       label: 'Cierres de Sesión' },
  { value: 'STOCK_INGRESO',     label: 'Ingresos Stock' },
  { value: 'DESPACHO_ENTREGA',  label: 'Entregas' },
  { value: 'DESPACHO_ALTO_COSTO', label: 'Alto Costo' },
  { value: 'DELETE_MEDICATION', label: 'Eliminaciones' },
];

export function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalLogs, setTotalLogs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const toggleExpandLog = (logId: string) =>
    setExpandedLogs(prev => ({ ...prev, [logId]: !prev[logId] }));

  const fetchLogs = async (targetPage = page, targetLimit = limit, targetSearch = searchTerm, targetAction = filterAction) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAuditLogs({
        page: targetPage,
        limit: targetLimit,
        search: targetSearch,
        action: targetAction
      });

      if (res && res.logs) {
        setLogs(res.logs);
        setTotalLogs(res.pagination?.total || 0);
        setTotalPages(res.pagination?.totalPages || 1);
      } else if (Array.isArray(res)) {
        setLogs(res);
        setTotalLogs(res.length);
        setTotalPages(1);
      }
    } catch (err: any) {
      console.error('Error fetching audit logs:', err);
      setError('No se pudieron cargar los registros. Comprueba que el servidor está activo.');
    } finally {
      setLoading(false);
    }
  };

  // Debounced search trigger & Filter changes
  useEffect(() => {
    setPage(1);
    const timer = setTimeout(() => {
      fetchLogs(1, limit, searchTerm, filterAction);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, filterAction, limit]);

  // Page navigation
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    setPage(newPage);
    fetchLogs(newPage, limit, searchTerm, filterAction);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auditoría del Sistema</h1>
          <p className="text-sm text-gray-500 mt-1">
            Registro completo y trazabilidad de todas las acciones realizadas en MediControl Pro.
          </p>
        </div>
        <button
          onClick={() => fetchLogs(page, limit, searchTerm, filterAction)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Ayuda contextual del módulo */}
      <ModuleHelp sections={AUDIT_HELP} />

      {/* Filters + Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 min-w-0 max-w-sm">
          <input
            type="text"
            placeholder="Buscar por acción, tipo o usuario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilterAction(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                filterAction === opt.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2 shrink-0 text-xs text-gray-500">
          <span>Mostrar:</span>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={10}>10 por pág.</option>
            <option value={15}>15 por pág.</option>
            <option value={25}>25 por pág.</option>
            <option value={50}>50 por pág.</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase text-xs">
              <tr>
                <th className="w-10 px-4 py-4"></th>
                <th className="px-6 py-4">Fecha y Hora</th>
                <th className="px-6 py-4">Acción</th>
                <th className="px-6 py-4">Entidad / Módulo</th>
                <th className="px-6 py-4">Usuario Responsable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-4"><div className="w-6 h-6 bg-gray-200 rounded mx-auto" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-36" /></td>
                    <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded w-40" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32" /></td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center">
                    <AlertTriangle className="w-10 h-10 mx-auto text-red-400 mb-3" />
                    <p className="font-semibold text-red-600">{error}</p>
                    <button onClick={() => fetchLogs()} className="mt-3 text-sm text-blue-600 hover:underline">Reintentar</button>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center text-gray-500">
                    <Activity className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-lg font-semibold text-gray-800">Sin registros de auditoría</p>
                    <p className="text-sm mt-1">
                      {totalLogs === 0
                        ? 'Aún no se han registrado acciones en el sistema.'
                        : 'No hay resultados para la búsqueda o filtro aplicado.'}
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = !!expandedLogs[log.id];

                  return (
                    <Fragment key={log.id}>
                      <tr
                        onClick={() => toggleExpandLog(log.id)}
                        className="hover:bg-gray-50/80 transition cursor-pointer"
                      >
                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            className="p-1 hover:bg-gray-200/60 rounded transition text-gray-400 flex items-center justify-center mx-auto"
                            title="Ver Detalles"
                          >
                            {isExpanded
                              ? <ChevronDown className="w-4 h-4 text-blue-500" />
                              : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="px-6 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('es-ES', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', second: '2-digit'
                          })}
                        </td>
                        <td className="px-6 py-3.5">
                          <ActionBadge action={log.action} />
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                            {log.entity_type || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {(log.usuario_nombre || log.usuario_email || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-800 leading-none">{log.usuario_nombre || 'Usuario'}</p>
                              {log.usuario_email && (
                                <p className="text-[10px] text-gray-400 mt-0.5">{log.usuario_email}</p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-gray-50/40">
                          <td colSpan={5} className="px-10 py-4 border-t border-b border-gray-100">
                            {renderLogDetails(log.details, log.ip_address)}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server Pagination Footer */}
        {!loading && totalLogs > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">
              Mostrando registros <span className="font-semibold text-gray-900">{Math.min((page - 1) * limit + 1, totalLogs)}</span> a <span className="font-semibold text-gray-900">{Math.min(page * limit, totalLogs)}</span> de <span className="font-semibold text-gray-900">{totalLogs}</span> totales
            </p>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handlePageChange(1)}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white text-gray-600 transition"
                title="Primera Página"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white text-gray-600 transition"
                title="Página Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg">
                Página {page} de {totalPages}
              </span>

              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white text-gray-600 transition"
                title="Página Siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white text-gray-600 transition"
                title="Última Página"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

