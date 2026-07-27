import { useState, useEffect, useRef } from 'react';
import {
  Settings, Save, AlertTriangle, Building2, Edit2, CheckCircle,
  XCircle, ChevronDown, MapPin, Phone, Image as ImageIcon
} from 'lucide-react';
import { apiFetch, apiUploadFile } from '../../lib/api';
import { ModuleHelp } from '../ui/ModuleHelp';

const SETTINGS_HELP = [
  {
    title: 'Ajustes globales',
    steps: [
      { text: 'Edita el nombre del centro de salud o institución.' },
      { text: 'Ajusta los días del umbral de alerta de bajo stock (ej. 30 u 80 días).' },
      { text: 'Presiona "Guardar Preferencias" para aplicar los cambios.' },
    ],
    example: 'Ejemplo: Cambia el nombre a "Hospital Universitario IVSS", define el umbral en "45" días y presiona Guardar.',
    exampleFields: [
      { label: 'Hospital', value: 'Hospital Universitario IVSS' },
      { label: 'Umbral stock bajo', value: '45 días' },
    ]
  },
];

interface Sucursal {
  id: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  estado: 'activo' | 'inactivo';
  imagen_url: string | null;
}

export function SettingsPage() {
  // System Config state
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [configSuccess, setConfigSuccess] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [hospitalName, setHospitalName] = useState('');
  const [lowStockDays, setLowStockDays] = useState(30);
  const [currency, setCurrency] = useState('USD');

  // Sedes state
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [sedesLoading, setSedesLoading] = useState(true);
  const [editingSedeId, setEditingSedeId] = useState<string | null>(null);
  const [sedeForm, setSedeForm] = useState<Partial<Sucursal>>({});
  const [sedeErrors, setSedeErrors] = useState<Record<string, string>>({});
  const [sedeSaving, setSedeSaving] = useState(false);
  const [uploadingSede, setUploadingSede] = useState(false);
  const [sedeSuccess, setSedeSuccess] = useState<string | null>(null);
  const [sedeError, setSedeError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showConfigSuccess = (msg: string) => {
    setConfigSuccess(msg);
    setTimeout(() => setConfigSuccess(null), 3000);
  };

  const showSedeSuccess = (msg: string) => {
    setSedeSuccess(msg);
    setTimeout(() => setSedeSuccess(null), 3000);
  };

  // Fetch system configuration
  const fetchConfig = async () => {
    try {
      setConfigLoading(true);
      const data = await apiFetch('/system_configuration');
      setHospitalName(data.hospital_name || '');
      setLowStockDays(data.low_stock_threshold_days || 30);
      setCurrency(data.currency || 'USD');
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setConfigLoading(false);
    }
  };

  // Fetch all sedes
  const fetchSucursales = async () => {
    try {
      setSedesLoading(true);
      const data = await apiFetch('/sucursales');
      setSucursales(data || []);
    } catch (err) {
      console.error('Error fetching sucursales:', err);
    } finally {
      setSedesLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchSucursales();
  }, []);

  // Save system configuration
  const handleSaveConfig = async () => {
    if (!hospitalName.trim()) {
      setConfigError('El nombre de la institución es obligatorio.');
      return;
    }
    setConfigSaving(true);
    setConfigError(null);
    try {
      await apiFetch('/system_configuration', {
        method: 'PUT',
        body: JSON.stringify({
          hospital_name: hospitalName.trim(),
          low_stock_threshold_days: lowStockDays,
          currency,
        }),
      });
      showConfigSuccess('Configuración guardada correctamente.');
      fetchConfig();
    } catch (err: any) {
      setConfigError(err.message || 'Error al guardar la configuración.');
    } finally {
      setConfigSaving(false);
    }
  };

  // Open edit for a sede
  const handleEditSede = (s: Sucursal) => {
    setEditingSedeId(s.id);
    setSedeForm({
      nombre: s.nombre,
      direccion: s.direccion || '',
      telefono: s.telefono || '',
      estado: s.estado,
      imagen_url: s.imagen_url || '',
    });
    setSedeErrors({});
    setSedeError(null);
  };

  const handleCancelSede = () => {
    setEditingSedeId(null);
    setSedeForm({});
    setSedeErrors({});
    setSedeError(null);
  };

  const validateSedeField = (name: string, value: string) => {
    let msg = '';
    if (name === 'nombre' && !value.trim()) msg = 'El nombre es obligatorio.';
    if (name === 'nombre' && value.trim().length < 4) msg = 'Mínimo 4 caracteres.';
    setSedeErrors(prev => ({ ...prev, [name]: msg }));
    return msg === '';
  };

  // Upload image for a sede
  const handleSedeImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSede(true);
    setSedeError(null);
    try {
      const data = await apiUploadFile('/upload', file);
      setSedeForm(prev => ({ ...prev, imagen_url: data.url }));
    } catch (err: any) {
      setSedeError('Error al subir la imagen: ' + err.message);
    } finally {
      setUploadingSede(false);
    }
  };

  // Save sede edits
  const handleSaveSede = async () => {
    const isNombreValid = validateSedeField('nombre', sedeForm.nombre || '');
    if (!isNombreValid) {
      setSedeError('Corrige los errores antes de guardar.');
      return;
    }
    setSedeSaving(true);
    setSedeError(null);
    try {
      await apiFetch(`/sucursales/${editingSedeId}`, {
        method: 'PUT',
        body: JSON.stringify(sedeForm),
      });
      showSedeSuccess('Sede actualizada correctamente.');
      setEditingSedeId(null);
      fetchSucursales();
    } catch (err: any) {
      setSedeError(err.message || 'Error al guardar la sede.');
    } finally {
      setSedeSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">

      {/* ── CABECERA ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración del Sistema</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona los parámetros globales de la aplicación y de tus sedes.
          </p>
        </div>
      </div>

      {/* Ayuda contextual del módulo */}
      <ModuleHelp sections={SETTINGS_HELP} />

      {/* ── SECCIÓN 1: CONFIGURACIÓN INSTITUCIONAL ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-gradient-to-r from-blue-50 to-white">
          <Settings className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-gray-900 uppercase tracking-wider text-sm">Preferencias de la Institución</h3>
        </div>

        {configLoading ? (
          <div className="p-6 space-y-4 animate-pulse">
            <div className="h-10 bg-gray-100 rounded-xl w-full" />
            <div className="h-10 bg-gray-100 rounded-xl w-1/2" />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {configSuccess && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
                {configSuccess}
              </div>
            )}
            {configError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
                <XCircle className="w-4 h-4 shrink-0 text-red-500" />
                {configError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">
                  Nombre de la Clínica / Hospital <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={hospitalName}
                  onChange={e => setHospitalName(e.target.value)}
                  placeholder="Ej. Hospital Central Universitario"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Moneda del Sistema</label>
                <div className="relative">
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm appearance-none bg-white"
                  >
                    <option value="USD">🇺🇸 USD — Dólar Americano</option>
                    <option value="VES">🇻🇪 VES — Bolívar Venezolano</option>
                    <option value="EUR">🇪🇺 EUR — Euro</option>
                    <option value="COP">🇨🇴 COP — Peso Colombiano</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Días de alerta de vencimiento de lotes</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={lowStockDays}
                  onChange={e => setLowStockDays(Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
                />
                <p className="text-xs text-gray-400">
                  El sistema alertará cuando un lote venza en menos de este número de días.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveConfig}
                disabled={configSaving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-semibold text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {configSaving ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── SECCIÓN 2: GESTIÓN RÁPIDA DE SEDES ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-gray-900 uppercase tracking-wider text-sm">Configuración de Sedes</h3>
          </div>
          <span className="text-xs text-gray-400 font-medium">{sucursales.length} sede{sucursales.length !== 1 ? 's' : ''} registrada{sucursales.length !== 1 ? 's' : ''}</span>
        </div>

        {sedeSuccess && (
          <div className="mx-6 mt-4 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
            {sedeSuccess}
          </div>
        )}

        {sedesLoading ? (
          <div className="p-6 space-y-3 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
          </div>
        ) : sucursales.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-sm">No hay sedes registradas. Créalas desde el módulo de Sedes.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sucursales.map(s => (
              <div key={s.id} className="p-6">
                {editingSedeId === s.id ? (
                  /* ── FORMULARIO DE EDICIÓN INLINE ── */
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                      {sedeForm.imagen_url ? (
                        <img src={sedeForm.imagen_url} alt={sedeForm.nombre} className="w-12 h-12 object-cover rounded-xl border border-gray-200" />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                          {(sedeForm.nombre || s.nombre).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-gray-900 text-sm">Editando: {s.nombre}</p>
                        <p className="text-xs text-gray-400">Los cambios se guardan al hacer clic en "Guardar".</p>
                      </div>
                    </div>

                    {sedeError && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                        <XCircle className="w-4 h-4 shrink-0" />
                        {sedeError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600">Nombre <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={sedeForm.nombre || ''}
                          onChange={e => {
                            setSedeForm(p => ({ ...p, nombre: e.target.value }));
                            validateSedeField('nombre', e.target.value);
                          }}
                          className={`w-full px-3.5 py-2.5 border rounded-xl outline-none transition text-sm ${
                            sedeErrors.nombre
                              ? 'border-red-400 focus:ring-2 focus:ring-red-400/25 bg-red-50/10'
                              : 'border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                          }`}
                        />
                        {sedeErrors.nombre && <p className="text-xs text-red-600 font-medium">{sedeErrors.nombre}</p>}
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600">Teléfono</label>
                        <input
                          type="text"
                          value={sedeForm.telefono || ''}
                          onChange={e => setSedeForm(p => ({ ...p, telefono: e.target.value }))}
                          placeholder="+58-212-555-0100"
                          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm"
                        />
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-semibold text-gray-600">Dirección</label>
                        <input
                          type="text"
                          value={sedeForm.direccion || ''}
                          onChange={e => setSedeForm(p => ({ ...p, direccion: e.target.value }))}
                          placeholder="Av. Principal, Edif. Torre Médica"
                          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600">Estado</label>
                        <div className="relative">
                          <select
                            value={sedeForm.estado || 'activo'}
                            onChange={e => setSedeForm(p => ({ ...p, estado: e.target.value as 'activo' | 'inactivo' }))}
                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm appearance-none bg-white"
                          >
                            <option value="activo">✅ Activa</option>
                            <option value="inactivo">⏸️ Inactiva</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      {/* Imagen / Logo */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600">Logo / Imagen Institucional</label>
                        <div className="flex items-center gap-3">
                          {sedeForm.imagen_url ? (
                            <div className="relative">
                              <img src={sedeForm.imagen_url} alt="preview" className="w-12 h-12 object-cover rounded-xl border border-gray-200" />
                              <button
                                type="button"
                                onClick={() => setSedeForm(p => ({ ...p, imagen_url: '' }))}
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center"
                              >✕</button>
                            </div>
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded-xl border border-dashed border-gray-300 flex items-center justify-center">
                              <ImageIcon className="w-5 h-5 text-gray-300" />
                            </div>
                          )}
                          <div>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/png,image/jpeg,image/jpg"
                              onChange={handleSedeImageUpload}
                              disabled={uploadingSede}
                              className="hidden"
                              id={`sede-img-${s.id}`}
                            />
                            <label
                              htmlFor={`sede-img-${s.id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              {uploadingSede ? 'Subiendo...' : 'Cambiar imagen'}
                            </label>
                            <p className="text-[10px] text-gray-400 mt-0.5">JPG, PNG hasta 10MB</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={handleCancelSede}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium transition"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveSede}
                        disabled={sedeSaving || uploadingSede}
                        className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-semibold transition disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {sedeSaving ? 'Guardando...' : 'Guardar Sede'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── VISTA DE LECTURA DE LA SEDE ── */
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {s.imagen_url ? (
                        <img
                          src={s.imagen_url}
                          alt={s.nombre}
                          className="w-12 h-12 object-cover rounded-xl border border-gray-200 shadow-sm"
                          onError={e => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm">
                          {s.nombre.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{s.nombre}</p>
                        {s.direccion && (
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            <span>{s.direccion}</span>
                          </div>
                        )}
                        {s.telefono && (
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                            <Phone className="w-3 h-3" />
                            <span>{s.telefono}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        s.estado === 'activo'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.estado === 'activo' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        {s.estado === 'activo' ? 'Activa' : 'Inactiva'}
                      </span>
                      <button
                        onClick={() => handleEditSede(s)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-indigo-600 border border-indigo-200 hover:bg-indigo-50 rounded-xl transition text-xs font-semibold"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Editar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Para crear o eliminar sedes, ve al módulo <strong>Gestión de Sedes</strong> en el menú lateral.
          </p>
        </div>
      </div>

      {/* ── SECCIÓN 3: ALERTAS ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-gradient-to-r from-amber-50 to-white">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 className="font-bold text-gray-900 uppercase tracking-wider text-sm">Información del Sistema</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">{sucursales.length}</p>
              <p className="text-xs text-blue-600 font-medium mt-1">Sedes Totales</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-700">{sucursales.filter(s => s.estado === 'activo').length}</p>
              <p className="text-xs text-emerald-600 font-medium mt-1">Sedes Activas</p>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-purple-700">{currency}</p>
              <p className="text-xs text-purple-600 font-medium mt-1">Moneda Configurada</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}