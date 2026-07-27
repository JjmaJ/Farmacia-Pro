import { useState, useEffect } from 'react';
import { 
  BarChart as BarChartIcon, TrendingUp, AlertTriangle, Activity, 
  FileText, Calendar, Search, PackageSearch, HelpCircle, Package, ArrowUpRight,
  TrendingDown as TrendingDownIcon, ArrowRightLeft, Settings
} from 'lucide-react';
import {
  BarChart as ReChartsBar,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReChartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
  Legend
} from 'recharts';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTour } from '../../contexts/TourContext';
import { tourSteps } from '../tour/tourSteps';
import { generateIvssPdfReport } from '../../utils/pdfGenerator';

interface DispatchReportRow {
  codigo: string;
  nombre: string;
  principio_activo: string;
  presentacion: string;
  total_despachado: number;
}

interface ComparativeRow {
  codigo: string;
  nombre: string;
  principio_activo: string;
  presentacion: string;
  total_a: number;
  total_b: number;
  diferencia: number;
  pct_change: number;
  rotacion_status: 'MAYOR_ROTACION' | 'MENOR_ROTACION' | 'SIN_CAMBIO';
}

export function StatisticsPage() {
  const { startTour } = useTour();
  const { profile, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({ medications: 0, movements: 0, users: 0, lowStock: 0 });
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfType, setPdfType] = useState('comparativa');

  // --- Membrete Configuration & Admin Editing ---
  const [showEditMembreteModal, setShowEditMembreteModal] = useState(false);
  const [membreteLine1, setMembreteLine1] = useState('Ministerio del Poder Popular para el Proceso Social de Trabajo');
  const [membreteLine2, setMembreteLine2] = useState('Instituto Venezolano de los Seguros Sociales');
  const [savingMembrete, setSavingMembrete] = useState(false);

  // --- Statistical Dashboard States ---
  const [stockData, setStockData] = useState<any[]>([]);
  const [trendsData, setTrendsData] = useState<any[]>([]);
  const [topMedsData, setTopMedsData] = useState<any[]>([]);

  // --- Dispatch Report State ---
  const today = new Date();
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(today.getDate() - 14);
  const toISO = (d: Date) => d.toISOString().split('T')[0];

  const [reportStartDate, setReportStartDate] = useState(toISO(twoWeeksAgo));
  const [reportEndDate, setReportEndDate] = useState(toISO(today));
  const [reportData, setReportData] = useState<DispatchReportRow[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportFetched, setReportFetched] = useState(false);

  // --- Comparative Statistics State (Period A vs Period B) ---
  const firstDayPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastDayPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
  const firstDayCurrMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [compStartDateA, setCompStartDateA] = useState(toISO(firstDayPrevMonth));
  const [compEndDateA, setCompEndDateA] = useState(toISO(lastDayPrevMonth));
  const [compStartDateB, setCompStartDateB] = useState(toISO(firstDayCurrMonth));
  const [compEndDateB, setCompEndDateB] = useState(toISO(today));
  const [comparativeData, setComparativeData] = useState<ComparativeRow[]>([]);
  const [compLoading, setCompLoading] = useState(false);
  const [compError, setCompError] = useState<string | null>(null);
  const [compFetched, setCompFetched] = useState(false);

  // Load System Configuration for Membrete Text
  useEffect(() => {
    apiFetch('/system_configuration').then(conf => {
      if (conf) {
        if (conf.membrete_line1) setMembreteLine1(conf.membrete_line1);
        if (conf.membrete_line2) setMembreteLine2(conf.membrete_line2);
      }
    }).catch(() => {});
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [
        meds, movs, users, batches, deliveriesData,
        stockRes, trendsRes, topMedsRes
      ] = await Promise.all([
        apiFetch('/medications'),
        apiFetch('/inventory_movements'),
        apiFetch('/user_profiles'),
        apiFetch('/inventory_batches'),
        apiFetch('/statistics/deliveries'),
        apiFetch('/statistics/stock-by-medication'),
        apiFetch('/statistics/inventory-trends'),
        apiFetch('/statistics/top-demanded'),
      ]);

      setStats({
        medications: meds.length,
        movements: movs.length,
        users: users.length,
        lowStock: batches.filter((b: any) => b.quantity < 50).length,
      });
      setDeliveries(deliveriesData || []);
      setStockData(stockRes || []);
      setTrendsData(trendsRes || []);
      setTopMedsData(topMedsRes || []);
    } catch (err) {
      console.error('Error fetching statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchComparativeStats();
  }, []);

  const fetchDispatchReport = async () => {
    setReportLoading(true);
    setReportError(null);
    setReportFetched(true);
    try {
      const params = new URLSearchParams();
      if (reportStartDate) params.append('startDate', reportStartDate);
      if (reportEndDate) params.append('endDate', reportEndDate);
      const data = await apiFetch(`/statistics/dispatches-report?${params.toString()}`);
      setReportData(data || []);
    } catch (err: any) {
      console.error('Report error:', err);
      setReportError(err.error || 'No se pudo cargar el reporte');
    } finally {
      setReportLoading(false);
    }
  };

  const fetchComparativeStats = async () => {
    setCompLoading(true);
    setCompError(null);
    setCompFetched(true);
    try {
      const params = new URLSearchParams({
        startDateA: compStartDateA,
        endDateA: compEndDateA,
        startDateB: compStartDateB,
        endDateB: compEndDateB
      });
      const data = await apiFetch(`/statistics/comparative-dispatches?${params.toString()}`);
      setComparativeData(data || []);
    } catch (err: any) {
      console.error('Comparative stats error:', err);
      setCompError(err.error || 'No se pudieron cargar las estadísticas comparativas');
    } finally {
      setCompLoading(false);
    }
  };

  const handleSaveMembrete = async () => {
    if (!isAdmin) return;
    try {
      setSavingMembrete(true);
      await apiFetch('/system_configuration', {
        method: 'PUT',
        body: JSON.stringify({
          membrete_line1: membreteLine1,
          membrete_line2: membreteLine2
        })
      });
      alert('Membrete institucional actualizado correctamente.');
      setShowEditMembreteModal(false);
    } catch (err: any) {
      console.error('Error updating membrete:', err);
      alert('Error al actualizar el membrete: ' + (err.error || 'Error de servidor'));
    } finally {
      setSavingMembrete(false);
    }
  };

  const generatePDF = async () => {
    try {
      let title = 'Reporte de Estadísticas de Inventario';
      let subtitle = `Sede: ${profile?.sucursal_nombre || 'Sede Principal'}`;
      let headers: string[] = [];
      let rows: (string | number)[][] = [];
      let summaryKpis: { label: string; value: string | number }[] = [];

      if (pdfType === 'comparativa') {
        title = 'Reporte Estadístico Comparativo de Rotación de Medicamentos';
        subtitle = `Período A (${compStartDateA} al ${compEndDateA}) vs Período B (${compStartDateB} al ${compEndDateB})`;
        headers = ['Código', 'Medicamento', 'Presentación', 'Período A (uds)', 'Período B (uds)', 'Variación Neta', 'Clasificación Rotación'];
        rows = comparativeData.map(r => [
          r.codigo,
          r.nombre,
          r.presentacion,
          r.total_a,
          r.total_b,
          `${r.diferencia > 0 ? '+' : ''}${r.diferencia} (${r.pct_change}%)`,
          r.rotacion_status === 'MAYOR_ROTACION' ? 'Mayor Rotación ↑' : r.rotacion_status === 'MENOR_ROTACION' ? 'Menor Rotación ↓' : 'Sin Cambio ='
        ]);
      } else if (pdfType === 'despachos') {
        title = 'Reporte de Despacho por Período';
        subtitle = `Rango de fechas: del ${reportStartDate} al ${reportEndDate}`;
        headers = ['Código', 'Medicamento', 'Principio Activo', 'Presentación', 'Total Despachado'];
        rows = reportData.map(r => [
          r.codigo,
          r.nombre,
          r.principio_activo || '-',
          r.presentacion,
          r.total_despachado
        ]);
      } else if (pdfType === 'movimientos') {
        title = 'Historial de Movimientos Recientes de Inventario';
        headers = ['Lote ID', 'Tipo Movimiento', 'Cantidad', 'Motivo', 'Fecha'];
        const movs = await apiFetch('/inventory_movements');
        rows = movs.slice(0, 50).map((m: any) => [
          m.batch_id ? m.batch_id.slice(0, 8) : '-',
          m.type === 'in' ? 'Entrada' : m.type === 'out' ? 'Salida' : m.type,
          m.quantity,
          m.reason || '-',
          new Date(m.created_at).toLocaleDateString('es-ES')
        ]);
      } else {
        title = 'Reporte General de Estadísticas del Sistema';
        summaryKpis = [
          { label: 'Total Medicamentos en Catálogo', value: stats.medications },
          { label: 'Movimientos Globales de Inventario', value: stats.movements },
          { label: 'Usuarios Activos', value: stats.users },
          { label: 'Lotes en Nivel Crítico (Bajo Stock)', value: stats.lowStock },
        ];
        headers = ['Indicador', 'Valor Actual'];
        rows = [
          ['Total Medicamentos en Catálogo', stats.medications],
          ['Movimientos Globales de Inventario', stats.movements],
          ['Alertas de Bajo Stock', stats.lowStock],
          ['Usuarios Registrados', stats.users],
        ];
      }

      await generateIvssPdfReport({
        title,
        subtitle,
        pdfType,
        headers,
        rows,
        summaryKpis: summaryKpis.length > 0 ? summaryKpis : undefined,
        sucursalNombre: profile?.sucursal_nombre || 'Sede Principal',
        membreteLine1,
        membreteLine2
      });

      setShowPdfModal(false);
    } catch (error) {
      console.error('Error generating PDF', error);
      alert('No se pudo generar el PDF. Verifica la consola.');
    }
  };

  // KPIs derived from comparative data
  const highestGain = comparativeData.length > 0
    ? [...comparativeData].sort((a, b) => b.diferencia - a.diferencia)[0]
    : null;

  const highestDrop = comparativeData.length > 0
    ? [...comparativeData].sort((a, b) => a.diferencia - b.diferencia)[0]
    : null;

  return (
    <div className="space-y-6">
      {/* Header de la página */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estadísticas e Informes</h1>
          <p className="text-sm text-gray-500 mt-1">Métricas generales y análisis comparativo de rotación de inventarios.</p>
        </div>
        {!loading && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => startTour(tourSteps)}
              data-tour="tour-start-btn"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition shadow-sm font-medium gap-2 text-sm"
            >
              <HelpCircle className="w-4 h-4 text-gray-500" />
              Ayuda
            </button>

            {/* Opción de edición manual restringida en exclusiva al rol Administrador */}
            {isAdmin && (
              <button
                onClick={() => setShowEditMembreteModal(true)}
                className="inline-flex items-center px-4 py-2 border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition shadow-sm font-medium text-sm gap-2"
                title="Editar datos del membrete institucional (Exclusivo Administrador)"
              >
                <Settings className="w-4 h-4 text-indigo-600" />
                Editar Membrete
              </button>
            )}

            <button
              onClick={() => setShowPdfModal(true)}
              data-tour="stats-pdf-report"
              className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-sm font-medium text-sm gap-2"
            >
              <FileText className="w-4 h-4" />
              Generar reporte
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Cargando métricas...</div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div data-tour="stats-kpi-cards" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Medicamentos</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.medications}</p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><BarChartIcon className="w-6 h-6" /></div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Movimientos de Inventario</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.movements}</p>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><Activity className="w-6 h-6" /></div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Alertas de Bajo Stock</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.lowStock}</p>
                </div>
                <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><AlertTriangle className="w-6 h-6" /></div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Usuarios Registrados</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.users}</p>
                </div>
                <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><TrendingUp className="w-6 h-6" /></div>
              </div>
            </div>
          </div>

          {/* ===== SECCIÓN DE ESTADÍSTICAS COMPARATIVAS ===== */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-6 p-6">
            <div className="border-b border-gray-100 pb-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <ArrowRightLeft className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 uppercase tracking-wider text-base">
                    Módulo de Estadísticas Comparativas de Inventario
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Cruce de rotación y salida de medicamentos entre dos rangos de fechas (Período A vs Período B).
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setPdfType('comparativa');
                  setShowPdfModal(true);
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition text-xs font-semibold shadow-sm"
              >
                <FileText className="w-4 h-4" />
                Exportar PDF
              </button>
            </div>

            {/* Recuadros Duales de Selección de Fechas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              {/* Recuadro Período A */}
              <div className="lg:col-span-2 bg-white p-3.5 rounded-xl border border-purple-200 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-purple-700 font-bold text-xs uppercase tracking-wider">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span>Período A (Base de Comparación)</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] text-gray-500 font-semibold mb-1">Fecha Inicio A:</label>
                    <input
                      type="date"
                      value={compStartDateA}
                      onChange={e => setCompStartDateA(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 font-semibold mb-1">Fecha Fin A:</label>
                    <input
                      type="date"
                      value={compEndDateA}
                      onChange={e => setCompEndDateA(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Recuadro Período B */}
              <div className="lg:col-span-2 bg-white p-3.5 rounded-xl border border-teal-200 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-teal-700 font-bold text-xs uppercase tracking-wider">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  <span>Período B (Período Objetivo)</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] text-gray-500 font-semibold mb-1">Fecha Inicio B:</label>
                    <input
                      type="date"
                      value={compStartDateB}
                      onChange={e => setCompStartDateB(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 font-semibold mb-1">Fecha Fin B:</label>
                    <input
                      type="date"
                      value={compEndDateB}
                      onChange={e => setCompEndDateB(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Botón de Acción Comparar */}
              <div className="lg:col-span-1 flex items-end">
                <button
                  onClick={fetchComparativeStats}
                  disabled={compLoading}
                  className="w-full h-11 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:from-purple-700 hover:to-indigo-700 disabled:opacity-60 transition shadow-md"
                >
                  <ArrowRightLeft className={`w-4 h-4 ${compLoading ? 'animate-spin' : ''}`} />
                  {compLoading ? 'Analizando...' : 'Comparar'}
                </button>
              </div>
            </div>

            {/* Error state if comparative fetch failed */}
            {compError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{compError}</span>
              </div>
            )}

            {/* Comparación Visual: KPIs de Rotación */}
            {compFetched && !compLoading && comparativeData.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                  <div className="p-3 bg-emerald-500 text-white rounded-lg">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-emerald-800 uppercase">Mayor Incremento en Rotación</p>
                    <p className="text-sm font-black text-gray-900">{highestGain?.nombre || '—'}</p>
                    <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                      +{highestGain?.diferencia || 0} unidades despachadas ({highestGain?.pct_change}% Δ)
                    </p>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                  <div className="p-3 bg-red-500 text-white rounded-lg">
                    <TrendingDownIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-red-800 uppercase">Mayor Contracción en Rotación</p>
                    <p className="text-sm font-black text-gray-900">{highestDrop?.nombre || '—'}</p>
                    <p className="text-xs text-red-700 font-semibold mt-0.5">
                      {highestDrop?.diferencia || 0} unidades despachadas ({highestDrop?.pct_change}% Δ)
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                  <div className="p-3 bg-blue-500 text-white rounded-lg">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-blue-800 uppercase">Total Medicamentos Evaluados</p>
                    <p className="text-sm font-black text-gray-900">{comparativeData.length} Fármacos</p>
                    <p className="text-xs text-blue-700 font-semibold mt-0.5">
                      Análisis cruzado Período A vs B
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Gráfico Comparativo Recharts BarChart Agrupado */}
            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4">
                Gráfico Comparativo de Salidas: Período A (Morado) vs Período B (Verde Turquesa)
              </h4>
              <div className="h-72 w-full">
                {compLoading ? (
                  <div className="h-full flex items-center justify-center text-xs text-gray-400">Procesando gráfica comparativa...</div>
                ) : comparativeData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-xs text-gray-400 italic py-8">
                    <PackageSearch className="w-8 h-8 text-gray-300 mb-2" />
                    <span>Sin información de salidas registrada en alguno de los dos períodos seleccionados.</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ReChartsBar data={comparativeData.slice(0, 10)} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="nombre" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => v.length > 10 ? v.substring(0, 10) + '...' : v} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <ReChartsTooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                      <Bar name={`Período A (${compStartDateA} al ${compEndDateA})`} dataKey="total_a" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={16} />
                      <Bar name={`Período B (${compStartDateB} al ${compEndDateB})`} dataKey="total_b" fill="#14b8a6" radius={[4, 4, 0, 0]} barSize={16} />
                    </ReChartsBar>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Tabla Comparativa de Rotación */}
            {compFetched && comparativeData.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 text-gray-700 font-bold uppercase tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3">Código</th>
                      <th className="px-4 py-3">Medicamento / Presentación</th>
                      <th className="px-4 py-3 text-center">Salida Período A</th>
                      <th className="px-4 py-3 text-center">Salida Período B</th>
                      <th className="px-4 py-3 text-center">Diferencia ($\Delta$)</th>
                      <th className="px-4 py-3 text-center">Variación %</th>
                      <th className="px-4 py-3 text-center">Indicador de Rotación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {comparativeData.map((row) => {
                      const isUp = row.rotacion_status === 'MAYOR_ROTACION';
                      const isDown = row.rotacion_status === 'MENOR_ROTACION';

                      return (
                        <tr key={row.codigo} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3 font-mono font-semibold text-gray-600">{row.codigo}</td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-gray-900">{row.nombre}</p>
                            <p className="text-[10px] text-gray-500">{row.presentacion} {row.principio_activo ? `• ${row.principio_activo}` : ''}</p>
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-purple-700 bg-purple-50/50">{row.total_a} uds.</td>
                          <td className="px-4 py-3 text-center font-semibold text-teal-700 bg-teal-50/50">{row.total_b} uds.</td>
                          <td className={`px-4 py-3 text-center font-bold ${isUp ? 'text-emerald-600' : isDown ? 'text-red-600' : 'text-gray-600'}`}>
                            {row.diferencia > 0 ? `+${row.diferencia}` : row.diferencia}
                          </td>
                          <td className="px-4 py-3 text-center font-bold">
                            {row.pct_change > 0 ? `+${row.pct_change}%` : `${row.pct_change}%`}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isUp ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <TrendingUp className="w-3 h-3 text-emerald-600" />
                                Mayor Rotación
                              </span>
                            ) : isDown ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                                <TrendingDownIcon className="w-3 h-3 text-red-600" />
                                Menor Rotación
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                                Sin Cambio
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ===== SECCIÓN DE GRÁFICOS DINÁMICOS GENERALES ===== */}
          <div data-tour="stats-dashboard" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Gráfico 1: Barras Horizontales - Stock de Medicamentos */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                      Stock Actual de Medicamentos
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">Nivel de inventario en lote activo. Los colores alertan criticidad.</p>
                  </div>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Package className="w-4 h-4" />
                  </div>
                </div>
                <div className="h-72 w-full flex-1">
                  {stockData.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-xs text-gray-400 italic gap-2 py-8">
                      <PackageSearch className="w-8 h-8 text-gray-300" />
                      <span>No hay stock registrado en esta sede.</span>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <ReChartsBar data={stockData} layout="vertical" margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis dataKey="medicamento" type="category" tick={{ fontSize: 9, fill: '#475569' }} axisLine={false} tickLine={false} width={90} />
                        <ReChartsTooltip 
                          contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                          labelStyle={{ fontWeight: 'bold', color: '#38bdf8' }}
                        />
                        <Bar dataKey="stock_total" radius={[0, 4, 4, 0]} barSize={12}>
                          {stockData.map((entry, index) => {
                            const val = Number(entry.stock_total);
                            const fill = val < 50 ? '#ef4444' : val < 150 ? '#f59e0b' : '#10b981';
                            return <Cell key={`cell-${index}`} fill={fill} />;
                          })}
                        </Bar>
                      </ReChartsBar>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Gráfico 2: Barras Verticales - Medicamentos Más Demandados */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                      Fármacos Más Entregados
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">Medicamentos con mayor volumen despachado históricamente.</p>
                  </div>
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="h-72 w-full flex-1">
                  {topMedsData.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-xs text-gray-400 italic gap-2 py-8">
                      <PackageSearch className="w-8 h-8 text-gray-300" />
                      <span>No hay despachos registrados para esta sede.</span>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <ReChartsBar data={topMedsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="medicamento" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => v.length > 8 ? v.substring(0, 8) + '...' : v} />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <ReChartsTooltip 
                          contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                          labelStyle={{ fontWeight: 'bold', color: '#a78bfa' }}
                        />
                        <Bar dataKey="total_entregado" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={20} />
                      </ReChartsBar>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Gráfico 3: Área - Movimientos de Inventario (Tendencias 30 días) */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                    Tendencia de Movimientos de Inventario (Últimos 30 días)
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">Seguimiento temporal diario de Ingresos (Entradas) vs Despachos (Salidas).</p>
                </div>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="h-72 w-full">
                {trendsData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-xs text-gray-400 italic gap-2 py-8">
                    <Activity className="w-8 h-8 text-gray-300" />
                    <span>No hay registros de movimientos en los últimos 30 días.</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorSalidas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="fecha" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => v.substring(5)} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <ReChartsTooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                        labelStyle={{ fontWeight: 'bold', color: '#f8fafc' }}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                      <Area name="Entradas (Ingresos)" type="monotone" dataKey="entradas" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorEntradas)" />
                      <Area name="Salidas (Despachos)" type="monotone" dataKey="salidas" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSalidas)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* ===== REPORTE DE DESPACHO POR RANGO DE FECHAS ===== */}
          <div data-tour="stats-dispatch-filters" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-purple-50 to-white">
              <div className="flex items-center gap-2">
                <PackageSearch className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-gray-900 uppercase tracking-wider text-sm">
                  Reporte de Despacho de Medicamentos
                </h3>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <label className="text-xs text-gray-500 font-medium whitespace-nowrap">Desde:</label>
                  <input
                    type="date"
                    value={reportStartDate}
                    onChange={e => setReportStartDate(e.target.value)}
                    className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 font-medium whitespace-nowrap">Hasta:</label>
                  <input
                    type="date"
                    value={reportEndDate}
                    onChange={e => setReportEndDate(e.target.value)}
                    className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                  />
                </div>
                <button
                  onClick={fetchDispatchReport}
                  disabled={reportLoading}
                  className="inline-flex items-center justify-center gap-2 px-4 py-1.5 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-60 transition shadow-sm"
                >
                  <Search className="w-4 h-4" />
                  {reportLoading ? 'Consultando...' : 'Filtrar'}
                </button>
              </div>
            </div>

            {!reportFetched ? (
              <div className="py-16 flex flex-col items-center text-gray-400">
                <PackageSearch className="w-12 h-12 mb-3 text-gray-300" />
                <p className="text-sm">
                  Selecciona un rango de fechas y presiona{' '}
                  <span className="font-semibold text-purple-600">Filtrar</span> para ver el reporte.
                </p>
              </div>
            ) : reportLoading ? (
              <div className="py-12 flex items-center justify-center gap-3 text-gray-500">
                <div className="animate-spin rounded-full h-7 w-7 border-2 border-purple-500 border-t-transparent" />
                <span className="text-sm">Generando reporte...</span>
              </div>
            ) : reportError ? (
              <div className="py-10 text-center text-red-600">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-400" />
                <p className="text-sm font-medium">{reportError}</p>
              </div>
            ) : reportData.length === 0 ? (
              <div className="py-14 flex flex-col items-center text-gray-400">
                <PackageSearch className="w-12 h-12 mb-3 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">No se encontraron despachos en ese período.</p>
                <p className="text-xs mt-1">Intenta ampliar el rango de fechas.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="px-6 py-3 bg-purple-50/60 border-b border-purple-100 flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-purple-700 font-semibold">
                    {reportData.length} medicamento{reportData.length !== 1 ? 's' : ''} despachados
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-purple-700 font-semibold">
                    Total unidades: {reportData.reduce((acc, r) => acc + Number(r.total_despachado), 0).toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">Del {reportStartDate} al {reportEndDate}</span>
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase text-xs">
                    <tr>
                      <th className="px-6 py-3">#</th>
                      <th className="px-6 py-3">Medicamento</th>
                      <th className="px-6 py-3">Presentación</th>
                      <th className="px-6 py-3 text-right">Total Despachado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reportData.map((row, idx) => (
                      <tr key={row.codigo} className="hover:bg-purple-50/30 transition">
                        <td className="px-6 py-3 text-gray-400 text-xs font-mono">{idx + 1}</td>
                        <td className="px-6 py-3">
                          <p className="font-bold text-gray-900">{row.nombre}</p>
                          {row.principio_activo && (
                            <p className="text-xs text-gray-400 italic mt-0.5">{row.principio_activo}</p>
                          )}
                          <span className="text-xs font-mono text-gray-400">{row.codigo}</span>
                        </td>
                        <td className="px-6 py-3 text-gray-500 text-xs">{row.presentacion}</td>
                        <td className="px-6 py-3 text-right">
                          <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold bg-purple-100 text-purple-800">
                            {Number(row.total_despachado).toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Historial Detallado de Entregas Recientes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-150 flex items-center gap-2 bg-gray-50/50">
              <Activity className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-gray-950 uppercase tracking-wider text-sm">
                Historial de Entregas Recientes (Esta Sucursal)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4">Medicamento / Principio Activo</th>
                    <th className="px-6 py-4">Presentación</th>
                    <th className="px-6 py-4">Lote</th>
                    <th className="px-6 py-4">Cantidad</th>
                    <th className="px-6 py-4">Destinatario</th>
                    <th className="px-6 py-4">Fecha y Hora Exacta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {deliveries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">
                        No se han registrado entregas o despachos en esta sucursal todavía.
                      </td>
                    </tr>
                  ) : (
                    deliveries.map((delivery, idx) => {
                      const dateObj = new Date(delivery.fecha_hora);
                      const formattedTime = !isNaN(dateObj.getTime())
                        ? dateObj.toLocaleString('es-ES', {
                            year: 'numeric', month: 'long', day: 'numeric',
                            hour: '2-digit', minute: '2-digit', second: '2-digit'
                          })
                        : 'No disponible';
                      return (
                        <tr key={idx} className="hover:bg-gray-50/50 transition">
                          <td className="px-6 py-4">
                            <p className="font-bold text-gray-900">{delivery.name}</p>
                            {delivery.generic_name && (
                              <p className="text-xs text-gray-500 font-medium italic">{delivery.generic_name}</p>
                            )}
                          </td>
                          <td className="px-6 py-4 text-gray-600">{delivery.presentation}</td>
                          <td className="px-6 py-4">
                            <span className="font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                              {delivery.batch_number || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-semibold text-gray-800">{delivery.cantidad}</td>
                          <td className="px-6 py-4 text-gray-600">{delivery.destino || 'Despacho'}</td>
                          <td className="px-6 py-4 text-xs font-semibold text-gray-500">{formattedTime}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Editar Membrete (Solo Administrador) */}
      {showEditMembreteModal && isAdmin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-gray-100">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3 mb-4">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Editar Membrete Institucional</h3>
                <p className="text-xs text-gray-500">Acceso exclusivo para el rol Administrador</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Línea 1: Ministerio / Ente Superior
                </label>
                <input
                  type="text"
                  value={membreteLine1}
                  onChange={e => setMembreteLine1(e.target.value)}
                  placeholder="Ministerio del Poder Popular para el Proceso Social de Trabajo"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Línea 2: Instituto / Entidad Ejecutora
                </label>
                <input
                  type="text"
                  value={membreteLine2}
                  onChange={e => setMembreteLine2(e.target.value)}
                  placeholder="Instituto Venezolano de los Seguros Sociales"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <p className="font-bold text-slate-700">Vista Previa del Membrete:</p>
                <p className="font-semibold text-slate-800">[Logo IVSS en Línea Superior]</p>
                <p className="text-slate-600 font-bold">{membreteLine1}</p>
                <p className="text-teal-700 font-bold">{membreteLine2}</p>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-gray-100">
                <button 
                  onClick={() => setShowEditMembreteModal(false)} 
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveMembrete}
                  disabled={savingMembrete}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition shadow-sm"
                >
                  {savingMembrete ? 'Guardando...' : 'Guardar Membrete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Generar Reporte PDF */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3 mb-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Generar reporte</h3>
                <p className="text-xs text-gray-500">Selecciona el tipo de informe a exportar en PDF</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Tipo de Reporte</label>
                <div className="space-y-2">
                  <label className="flex items-center p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer text-xs font-semibold text-gray-800 transition">
                    <input type="radio" value="comparativa" checked={pdfType === 'comparativa'} onChange={() => setPdfType('comparativa')} className="mr-2 text-indigo-600 focus:ring-indigo-500" />
                    <span>Estadística Comparativa (Período A vs Período B)</span>
                  </label>
                  <label className="flex items-center p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer text-xs font-semibold text-gray-800 transition">
                    <input type="radio" value="estadistica" checked={pdfType === 'estadistica'} onChange={() => setPdfType('estadistica')} className="mr-2 text-emerald-600 focus:ring-emerald-500" />
                    <span>Estadísticas Generales y KPIs</span>
                  </label>
                  <label className="flex items-center p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer text-xs font-semibold text-gray-800 transition">
                    <input type="radio" value="despachos" checked={pdfType === 'despachos'} onChange={() => setPdfType('despachos')} className="mr-2 text-purple-600 focus:ring-purple-500" />
                    <span>Reporte de Despacho de Medicamentos</span>
                  </label>
                  <label className="flex items-center p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer text-xs font-semibold text-gray-800 transition">
                    <input type="radio" value="movimientos" checked={pdfType === 'movimientos'} onChange={() => setPdfType('movimientos')} className="mr-2 text-blue-600 focus:ring-blue-500" />
                    <span>Historial de Movimientos de Inventario</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-gray-100">
                <button 
                  onClick={() => setShowPdfModal(false)} 
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={generatePDF} 
                  className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition shadow-sm"
                >
                  Generar reporte
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
