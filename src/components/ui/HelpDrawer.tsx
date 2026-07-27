import { useState } from 'react';
import {
  X,
  Search,
  HelpCircle,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Package,
  Activity,
  TrendingDown,
  BarChart3,
  ShieldCheck,
  Users,
  LayoutDashboard,
  FileText,
  Database,
  CheckSquare,
  Building2,
  Lightbulb,
  Info
} from 'lucide-react';

interface HelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage?: string;
}

// ============================================================
// BASE DE DATOS DE PREGUNTAS FRECUENTES (FAQ)
// ============================================================
const FAQ_LIST = [
  {
    pregunta: '¿Cómo registrar un medicamento nuevo y su stock inicial?',
    categoria: 'Inventario',
    respuesta:
      'Dirígete al módulo "Inventario" y presiona el botón "+ Nuevo Medicamento". Ingresa el Nombre Comercial, Principio Activo, Presentación y Stock Mínimo. En el mismo formulario podrás registrar el lote inicial con su fecha de vencimiento.',
    tip: '💡 El stock mínimo activará alertas automáticas en el Panel de Inicio cuando la suma de todos los lotes sea igual o menor a esa cantidad.'
  },
  {
    pregunta: '¿Cómo funciona la regla de despacho FIFO (Primero en Vencer, Primero en Salir)?',
    categoria: 'Entregas',
    respuesta:
      'Al momento de registrar una entrega en el módulo "Entregas", el sistema analiza automáticamente la fecha de caducidad de los lotes disponibles y selecciona en primer lugar el lote que vence más pronto para prevenir pérdidas.',
    tip: '⚡ El descuento de stock es inmediato en la base de datos sin necesidad de recargar la página.'
  },
  {
    pregunta: '¿Qué hacer cuando un lote aparece en alerta por vencer o bajo stock?',
    categoria: 'Alertas & Lotes',
    respuesta:
      'Los lotes con fecha de vencimiento menor a 30 días o con stock inferior a 50 unidades generan notificaciones automáticas en la campanita del encabezado y se resaltan en rojo/amarillo en el Panel de Inicio. Se recomienda agilizar su despacho o procesar la desincorporación si el lote expiró.',
    tip: '🗓️ En el módulo Inventario puedes desplegar cada medicamento para ver y auditar sus lotes.'
  },
  {
    pregunta: '¿Cómo generar reportes PDF con membrete oficial del IVSS?',
    categoria: 'Reportes & PDF',
    respuesta:
      'Ve al módulo "Estadísticas" o "Auditoría" y haz clic en el botón "Descargar Reporte PDF". El sistema compilará la información seleccionada y generará un documento oficial listo para imprimir con el encabezado institucional.',
    tip: '📄 Los reportes incluyen fecha, hora, usuario emisor y sello digital institucional.'
  },
  {
    pregunta: '¿Cómo registrar pacientes y despachar tratamientos de Alto Costo?',
    categoria: 'Alto Costo',
    respuesta:
      'En el módulo "Alto Costo", haz clic en "+ Registrar Paciente", ingresa la Cédula de Identidad, Nombre Completo, Código IVSS y el total de ciclos autorizados (ej. 6 u 8). Para despachar, ubica al paciente activo y presiona "Despachar Ciclo".',
    tip: '🩺 El sistema llevará la cuenta regresiva de los ciclos entregados hasta completar el esquema médico.'
  },
  {
    pregunta: '¿Cómo cambiar de sede hospitalaria como Administrador?',
    categoria: 'Multi-Sede',
    respuesta:
      'En la barra superior del sistema (Header), los administradores disponen del botón "Selector de Sede" (con ícono de edificio/globo). Al hacer clic podrás alternar entre "Sede Principal", "Sede Chacao", "Sede Catia" o "Todas las Sedes" para ver datos consolidados.',
    tip: '🏢 Toda la información de inventario, movimientos y reportes se filtrará al instante según la sede activa.'
  },
  {
    pregunta: '¿Cómo aprobar usuarios registrados y cambiar sus roles?',
    categoria: 'Usuarios',
    respuesta:
      'Los Administradores van al módulo "Usuarios", donde verán las solicitudes registradas con la etiqueta "Pendiente". Presionando el botón "Aprobar", se le otorga acceso al sistema y se le asigna su rol (Farmacéutico, Almacenista, Médico, etc.).',
    tip: '🔒 Por seguridad, ninguna persona puede ingresar al sistema hasta ser aprobada por un Administrador.'
  },
  {
    pregunta: '¿Cómo realizar un respaldo de seguridad de la base de datos?',
    categoria: 'Seguridad',
    respuesta:
      'En el módulo "Respaldo", los administradores pueden hacer clic en "Generar Copia de Seguridad" para descargar un archivo estructurado con todos los medicamentos, lotes, entregas y auditorías.',
    tip: '💾 Se sugiere realizar respaldos periódicos al cierre de cada mes.'
  }
];

// ============================================================
// MATRIZ DE ROLES Y PERMISOS DE LA APLICACIÓN
// ============================================================
const ROLES_INFO = [
  {
    role: 'Administrador Global',
    icon: ShieldCheck,
    color: 'from-purple-600 to-indigo-700',
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
    descripcion: 'Supervisión total y control absoluto de la plataforma en todas las sedes hospitalarias.',
    modulos: [
      { nombre: 'Panel de Inicio', acceso: 'Acceso Total — visualización global y por sede' },
      { nombre: 'Gestión de Inventario', acceso: 'Acceso Total — crear, editar, eliminar fármacos y lotes' },
      { nombre: 'Control de Entregas', acceso: 'Acceso Total — despachar y auditar todos los movimientos' },
      { nombre: 'Pacientes Alto Costo', acceso: 'Acceso Total — expedientes, códigos IVSS y ciclos' },
      { nombre: 'Estadísticas & Reportes', acceso: 'Acceso Total — análisis comparativo y exportación PDF' },
      { nombre: 'Sedes Hospitalarias', acceso: 'Exclusivo — crear y configurar sedes del sistema' },
      { nombre: 'Gestión de Usuarios', acceso: 'Exclusivo — aprobar registros y asignar roles' },
      { nombre: 'Bitácora de Auditoría', acceso: 'Exclusivo — rastreo de IP, fechas y acciones' },
      { nombre: 'Respaldos de Seguridad', acceso: 'Exclusivo — exportación e importación de datos' },
      { nombre: 'Configuración', acceso: 'Exclusivo — membrete IVSS, umbrales y políticas' }
    ]
  },
  {
    role: 'Asistente Técnico / Farmacéutico',
    icon: Users,
    color: 'from-blue-600 to-cyan-600',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    descripcion: 'Gestión operativa de farmacia, control de dispensación y atención de pacientes.',
    modulos: [
      { nombre: 'Panel de Inicio', acceso: 'Consulta — métricas y alertas de la sede asignada' },
      { nombre: 'Gestión de Inventario', acceso: 'Operativo — añadir nuevos fármacos y registrar lotes' },
      { nombre: 'Control de Entregas', acceso: 'Operativo — registrar salidas y entregas diarias' },
      { nombre: 'Pacientes Alto Costo', acceso: 'Operativo — dispensar tratamientos por ciclo' },
      { nombre: 'Estadísticas & Reportes', acceso: 'Operativo — visualizar gráficos y generar PDF' },
      { nombre: 'Tareas del Equipo', acceso: 'Operativo — crear y marcar tareas completadas' },
      { nombre: 'Administración de Usuarios', acceso: '✗ Sin acceso' },
      { nombre: 'Configuración & Sedes', acceso: '✗ Sin acceso' }
    ]
  },
  {
    role: 'Almacenista / Insumos',
    icon: Package,
    color: 'from-amber-500 to-orange-600',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    descripcion: 'Control de recepción de droguerías, organización de estantes y despachos.',
    modulos: [
      { nombre: 'Panel de Inicio', acceso: 'Consulta — alertas de bajo stock e inventario' },
      { nombre: 'Gestión de Inventario', acceso: 'Operativo — ingresar stock y nuevos lotes' },
      { nombre: 'Control de Entregas', acceso: 'Operativo — despacho de pedidos a departamentos' },
      { nombre: 'Tareas del Equipo', acceso: 'Operativo — realizar conteos físicos y tareas' },
      { nombre: 'Pacientes Alto Costo', acceso: '✗ Sin acceso' },
      { nombre: 'Módulos Administrativos', acceso: '✗ Sin acceso' }
    ]
  },
  {
    role: 'Médico / Personal Sanitario (Enfermería)',
    icon: Activity,
    color: 'from-emerald-500 to-teal-600',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    descripcion: 'Consulta de disponibilidad de tratamientos y solicitud de despachos.',
    modulos: [
      { nombre: 'Panel de Inicio', acceso: 'Consulta — disponibilidad de fármacos' },
      { nombre: 'Gestión de Inventario', acceso: 'Consulta — ver stock disponible y vencimientos' },
      { nombre: 'Control de Entregas', acceso: 'Parcial — registrar solicitudes de servicio' },
      { nombre: 'Pacientes Alto Costo', acceso: 'Consulta — verificar ciclos de pacientes asignados' },
      { nombre: 'Configuración & Usuarios', acceso: '✗ Sin acceso' }
    ]
  }
];

// ============================================================
// GUÍA DE TODOS LOS MÓDULOS DE LA APLICACIÓN
// ============================================================
const MODULES_INFO = [
  {
    id: 'inicio',
    title: 'Panel de Inicio (Dashboard)',
    icon: LayoutDashboard,
    color: 'from-blue-600 to-indigo-700',
    accentBg: 'bg-blue-50 text-blue-800 border-blue-200',
    descripcion: 'Centro de mando con indicadores clave, alertas críticas de stock y accesos rápidos.',
    pasos: [
      'Visualiza los 4 indicadores KPI: Total de Medicamentos, Alertas de Bajo Stock, Movimientos Recientes y Lotes Por Vencer.',
      'Revisa las tarjetas de alerta en rojo/amarillo para detectar vencimientos a menos de 30 días.',
      'Usa el bloque de tareas rápidas para anotar asignaciones del turno.',
      'Si eres Administrador, usa el selector en el encabezado para filtrar por sede.'
    ]
  },
  {
    id: 'inventory',
    title: 'Gestión de Inventario',
    icon: Package,
    color: 'from-indigo-600 to-blue-600',
    accentBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    descripcion: 'Catálogo institucional de medicamentos, lotes, ubicaciones físicas y caducidades.',
    pasos: [
      'Haz clic en "+ Nuevo Medicamento" para agregar un producto al catálogo con su lote inicial.',
      'Establece el Stock Mínimo para recibir alertas automáticas cuando la cantidad descienda.',
      'Usa el botón de desplegar (▶) en la tabla para ver todos los lotes asociados a un medicamento.',
      'Agrega nuevos lotes con "+ Lote" para aumentar la existencia con su correspondiente vencimiento.'
    ]
  },
  {
    id: 'deliveries',
    title: 'Control de Entregas y Despachos',
    icon: TrendingDown,
    color: 'from-amber-500 to-orange-600',
    accentBg: 'bg-amber-50 text-amber-800 border-amber-200',
    descripcion: 'Despacho diario de fármacos con algoritmo automático FIFO para reducir pérdidas.',
    pasos: [
      'Haz clic en "+ Registrar Entrega" para procesar una salida de insumos.',
      'Selecciona el medicamento deseado; el sistema sugerirá en primer lugar el lote con vencimiento más próximo.',
      'Ingresa la cantidad a entregar, el servicio o departamento de destino y una breve nota.',
      'Al guardar, el stock del lote se descuenta inmediatamente y se genera la bitácora.'
    ]
  },
  {
    id: 'alto_costo',
    title: 'Pacientes de Alto Costo',
    icon: Activity,
    color: 'from-emerald-600 to-teal-600',
    accentBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    descripcion: 'Trazabilidad estricta de medicamentos oncológicos, biológicos e inmunosupresores por ciclos.',
    pasos: [
      'Registra al paciente con su Cédula de Identidad, Nombre Completo y Código de Autorización IVSS.',
      'Indica la cantidad de ciclos médicos autorizados para el tratamiento (ej. 6 u 8 ciclos).',
      'Haz clic en "Despachar Ciclo" para entregar el medicamento correspondiente descontando stock.',
      'El sistema mantiene la historia cronológica de entregas y el estado del tratamiento (Activo / Completado).'
    ]
  },
  {
    id: 'statistics',
    title: 'Estadísticas y Reportes PDF',
    icon: BarChart3,
    color: 'from-purple-600 to-indigo-700',
    accentBg: 'bg-purple-50 text-purple-800 border-purple-200',
    descripcion: 'Análisis visual de consumo, comparativa entre períodos y emisión de informes impresos IVSS.',
    pasos: [
      'Observa las gráficas interactivas de consumo mensual y medicamentos de mayor rotación.',
      'Usa el Módulo Comparativo seleccionando Período A vs Período B para medir variaciones.',
      'Haz clic en "Descargar Reporte PDF" para generar el informe oficial en formato auditable.',
      'El PDF incluye el membrete institucional, firma del usuario y resumen cuantitativo.'
    ]
  },
  {
    id: 'tareas',
    title: 'Gestión de Tareas',
    icon: CheckSquare,
    color: 'from-teal-600 to-emerald-600',
    accentBg: 'bg-teal-50 text-teal-800 border-teal-200',
    descripcion: 'Organización del trabajo diario del equipo sanitario y listas de verificación.',
    pasos: [
      'Crea tareas pendientes como "Conteo físico en cava" o "Revisión de vencimientos".',
      'Asigna descripciones detalladas y fechas estimadas.',
      'Marca las casillas conforme el personal complete cada actividad.'
    ]
  },
  {
    id: 'sucursales',
    title: 'Sedes Hospitalarias (Multi-Sede)',
    icon: Building2,
    color: 'from-cyan-600 to-blue-700',
    accentBg: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    descripcion: 'Administración de las distintas unidades hospitalarias o sedes del sistema.',
    pasos: [
      'Visualiza la lista de sedes registradas (ej. Sede Principal, Sede Chacao, Sede Catia).',
      'Crea nuevas sedes ingresando su nombre, dirección y datos de contacto.',
      'Asigna administradores locales para gestionar sedes específicas.'
    ]
  },
  {
    id: 'users',
    title: 'Gestión de Usuarios y Accesos',
    icon: Users,
    color: 'from-blue-700 to-indigo-800',
    accentBg: 'bg-blue-50 text-blue-800 border-blue-200',
    descripcion: 'Control de seguridad, aprobación de cuentas y asignación de roles de usuario.',
    pasos: [
      'Revisa las solicitudes de cuenta registradas en estado "Pendiente".',
      'Presiona "Aprobar" asignando el rol operativo adecuado (Farmacéutico, Almacenista, Médico, etc.).',
      'Modifica el rol o la sede asignada a un usuario según sea requerido por la dirección.'
    ]
  },
  {
    id: 'audit',
    title: 'Bitácora de Auditoría',
    icon: FileText,
    color: 'from-rose-600 to-red-700',
    accentBg: 'bg-rose-50 text-rose-800 border-rose-200',
    descripcion: 'Registro imborrable de seguridad de todas las transacciones y eventos del sistema.',
    pasos: [
      'Filtra los eventos por tipo de acción (Logins, Despachos, Creación de Stock, Eliminaciones).',
      'Filtra por nombre de usuario o fecha específica.',
      'Despliega el detalle técnico para inspeccionar la dirección IP y los parámetros exactos.'
    ]
  },
  {
    id: 'backup',
    title: 'Respaldos de Seguridad',
    icon: Database,
    color: 'from-slate-700 to-slate-900',
    accentBg: 'bg-slate-100 text-slate-800 border-slate-300',
    descripcion: 'Resguardo de la información del sistema para prevención ante contingencias.',
    pasos: [
      'Haz clic en "Generar Copia de Seguridad" para descargar el archivo de respaldo.',
      'Almacena la copia de seguridad en un medio externo seguro.',
      'En caso de migración o restauración, usa la herramienta de importación.'
    ]
  }
];

// ============================================================
// COMPONENTE PRINCIPAL HELP DRAWER / MODAL DE MANUAL
// ============================================================
export function HelpDrawer({ isOpen, onClose, currentPage: _currentPage = 'general' }: HelpDrawerProps) {
  const [activeTab, setActiveTab] = useState<'guia' | 'roles' | 'faq'>('guia');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [expandedRole, setExpandedRole] = useState<number | null>(0);
  const [selectedModuleIdx, setSelectedModuleIdx] = useState(0);

  if (!isOpen) return null;

  const currentModule = MODULES_INFO[selectedModuleIdx] || MODULES_INFO[0];
  const CurrentModuleIcon = currentModule.icon || BookOpen;

  // Búsqueda en tiempo real
  const hasSearch = searchTerm.trim().length > 0;
  const filteredFaqs = FAQ_LIST.filter(f =>
    f.pregunta.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.respuesta.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredModules = MODULES_INFO.filter(m =>
    m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.pasos.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fadeIn">
      {/* Fondo borroso / Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Contenedor Modal de Ayuda */}
      <div className="relative w-full max-w-4xl h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden z-10">

        {/* ── ENCABEZADO PRINCIPAL ── */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-gradient-to-tr from-blue-500 to-emerald-400 rounded-2xl shadow-lg shadow-blue-500/20">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">Manual de Usuario & Centro de Ayuda</h2>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-400/30 uppercase tracking-wider">
                  IVSS MediControl PRO
                </span>
              </div>
              <p className="text-xs text-blue-200/80 font-medium mt-0.5">Guía de uso, matriz de roles y respuestas frecuentes del sistema</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar manual de ayuda"
            className="p-2 rounded-2xl hover:bg-white/10 text-slate-300 hover:text-white transition-all duration-200 border border-transparent hover:border-white/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── BARRA DE BÚSQUEDA ── */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar en el manual de usuario... (ej. 'lote', 'roles', 'entregas', 'PDF', 'paciente')..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none shadow-xs transition-all"
            />
            <Search className="w-4 h-4 text-blue-600 absolute left-4 top-3" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── PESTAÑAS DE NAVEGACIÓN ── */}
        {!hasSearch && (
          <div className="flex border-b border-slate-200 bg-white shrink-0">
            {[
              { id: 'guia', label: 'Guía de Módulos', icon: LayoutDashboard },
              { id: 'roles', label: 'Matriz de Roles y Permisos', icon: ShieldCheck },
              { id: 'faq', label: 'Preguntas Frecuentes (FAQ)', icon: HelpCircle }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-3 text-xs font-extrabold flex items-center justify-center gap-2 border-b-2 transition-all duration-200 ${
                    isActive
                      ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* ── CUERPO PRINCIPAL DEL MANUAL ── */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/60 space-y-6">

          {/* ===== MODO BÚSQUEDA ACTIVA ===== */}
          {hasSearch && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  Resultados para: "{searchTerm}"
                </h3>
                <span className="text-xs font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                  {filteredModules.length + filteredFaqs.length} coincidencias encontradas
                </span>
              </div>

              {filteredModules.length === 0 && filteredFaqs.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
                  <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-extrabold text-slate-700">Sin resultados para "{searchTerm}"</p>
                  <p className="text-xs text-slate-400 mt-1">Prueba con palabras clave como: "lote", "PDF", "sede", "admin", "entrega", "paciente".</p>
                </div>
              )}

              {/* Módulos coincidentes */}
              {filteredModules.map((m) => (
                <div key={m.id} className="p-5 bg-white rounded-2xl border border-blue-200 shadow-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                      Módulo: {m.title}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-700">{m.descripcion}</p>
                  <div className="space-y-1.5 pt-1">
                    {m.pasos.map((p, i) => (
                      <p key={i} className="text-xs text-slate-600 pl-3 border-l-2 border-blue-500 font-medium">
                        {p}
                      </p>
                    ))}
                  </div>
                </div>
              ))}

              {/* Preguntas frecuentes coincidentes */}
              {filteredFaqs.map((faq, i) => (
                <div key={i} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
                  <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                    FAQ: {faq.categoria}
                  </span>
                  <h4 className="font-extrabold text-slate-900 text-sm">{faq.pregunta}</h4>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">{faq.respuesta}</p>
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-semibold mt-2">
                    {faq.tip}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ===== PESTAÑA 1: GUÍA DE MÓDULOS ===== */}
          {!hasSearch && activeTab === 'guia' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Columna Izquierda: Selector de Módulo */}
              <div className="space-y-2">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider px-1">Módulos del Sistema</p>
                <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                  {MODULES_INFO.map((mod, idx) => {
                    const Icon = mod.icon;
                    const isSelected = selectedModuleIdx === idx;
                    return (
                      <button
                        key={mod.id}
                        onClick={() => setSelectedModuleIdx(idx)}
                        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left transition-all duration-200 border ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md font-extrabold'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/60 font-semibold'
                        }`}
                      >
                        <div className={`p-2 rounded-xl flex-shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs truncate flex-1">{mod.title}</span>
                        <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Columna Derecha: Detalle del Módulo Seleccionado */}
              <div className="md:col-span-2 space-y-4">
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-5">
                  <div className="flex items-start gap-4 pb-4 border-b border-slate-100">
                    <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${currentModule.color} text-white shadow-md flex-shrink-0`}>
                      <CurrentModuleIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-base">{currentModule.title}</h3>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5 leading-relaxed">{currentModule.descripcion}</p>
                    </div>
                  </div>

                  {/* Lista de pasos */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Pasos para operar este módulo</h4>
                    </div>

                    <div className="space-y-2.5">
                      {currentModule.pasos.map((paso, pIdx) => (
                        <div key={pIdx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                          <span className="w-6 h-6 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center flex-shrink-0 text-xs shadow-xs">
                            {pIdx + 1}
                          </span>
                          <p className="text-xs text-slate-700 font-semibold pt-0.5 leading-relaxed">{paso}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Control de navegación entre módulos */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button
                      onClick={() => setSelectedModuleIdx(p => Math.max(0, p - 1))}
                      disabled={selectedModuleIdx === 0}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 rounded-xl border border-slate-200 disabled:opacity-40 transition flex items-center gap-1.5"
                    >
                      <ChevronLeft className="w-4 h-4" /> Anterior
                    </button>
                    <span className="text-xs font-extrabold text-slate-500">
                      Módulo {selectedModuleIdx + 1} de {MODULES_INFO.length}
                    </span>
                    <button
                      onClick={() => setSelectedModuleIdx(p => Math.min(MODULES_INFO.length - 1, p + 1))}
                      disabled={selectedModuleIdx === MODULES_INFO.length - 1}
                      className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-40 transition flex items-center gap-1.5"
                    >
                      Siguiente <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* ===== PESTAÑA 2: MATRIZ DE ROLES ===== */}
          {!hasSearch && activeTab === 'roles' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-5 rounded-3xl shadow-md flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                  <ShieldCheck className="w-6 h-6 text-purple-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Matriz Institucional de Roles y Permisos</h3>
                  <p className="text-xs text-purple-200 mt-0.5">El sistema controla el acceso según la responsabilidad del funcionario sanitario.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ROLES_INFO.map((rol, idx) => {
                  const Icon = rol.icon;
                  const isExpanded = expandedRole === idx;
                  return (
                    <div key={idx} className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
                      <div
                        onClick={() => setExpandedRole(isExpanded ? null : idx)}
                        className="p-5 cursor-pointer hover:bg-slate-50/80 transition flex items-center gap-3.5 border-b border-slate-100"
                      >
                        <div className={`p-3 rounded-2xl bg-gradient-to-br ${rol.color} text-white flex-shrink-0 shadow-md`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${rol.badge}`}>
                            {rol.role}
                          </span>
                          <p className="text-xs text-slate-600 font-medium mt-1.5 line-clamp-2">{rol.descripcion}</p>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180 text-blue-600' : ''}`} />
                      </div>

                      {/* Lista de módulos del rol */}
                      <div className="p-4 space-y-2 bg-slate-50/50 flex-1">
                        {rol.modulos.map((mod, mIdx) => (
                          <div key={mIdx} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-200/50 last:border-0">
                            <span className="font-bold text-slate-800">{mod.nombre}</span>
                            <span className={`text-right font-bold text-[11px] ${
                              mod.acceso.startsWith('✗')
                                ? 'text-red-500'
                                : mod.acceso.includes('Exclusivo') || mod.acceso.includes('Total')
                                ? 'text-purple-700'
                                : 'text-emerald-700'
                            }`}>
                              {mod.acceso}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== PESTAÑA 3: PREGUNTAS FRECUENTES (FAQ) ===== */}
          {!hasSearch && activeTab === 'faq' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Preguntas y Respuestas de Operación</h3>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                  {FAQ_LIST.length} Respuestas Disponibles
                </span>
              </div>

              {FAQ_LIST.map((faq, idx) => {
                const isExpanded = expandedFaq === idx;
                return (
                  <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all">
                    <button
                      onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                      className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-blue-50/40 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-[10px] font-black rounded-lg uppercase flex-shrink-0">
                          {faq.categoria}
                        </span>
                        <span className="font-extrabold text-slate-800 text-xs sm:text-sm">{faq.pregunta}</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180 text-blue-600' : ''}`} />
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 border-t border-slate-100 bg-slate-50/60 space-y-3 animate-fadeIn">
                        <p className="text-xs text-slate-700 font-medium leading-relaxed">{faq.respuesta}</p>
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 font-semibold flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>{faq.tip}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* ── PIE DEL MODAL ── */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-semibold shrink-0">
          <span>MediControl PRO · Sistema Hospitalario IVSS v1.0</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition"
          >
            Cerrar Manual
          </button>
        </div>

      </div>
    </div>
  );
}
