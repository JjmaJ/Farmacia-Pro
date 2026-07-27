import { useState, useEffect } from 'react';
import {
  Building2, Plus, Edit2, Trash2, UserCheck, Search,
  CheckCircle, XCircle, Phone, MapPin, Shield, ChevronDown
} from 'lucide-react';
import { apiFetch, apiUploadFile } from '../../lib/api';
import { sedeSchema } from '../../schemas/sede.schema';
import type { ZodIssue } from 'zod';
import { ModuleHelp } from '../ui/ModuleHelp';

const SUCURSALES_HELP = [
  {
    title: 'Crear sede',
    steps: [
      { text: 'Presiona "Nueva Sede" e ingresa el nombre institucional y dirección.' },
      { text: 'Sube la foto o logotipo de la sede en formato JPG o PNG.' },
      { text: 'Presiona "Guardar" para activar la sede en el sistema.' },
    ],
    example: 'Ejemplo: Crea la sede "Hospital Dr. Domingo Luciani", dirección "El Llanito, Caracas", teléfono "0212-2563344".',
    exampleFields: [
      { label: 'Sede', value: 'Hospital Dr. Domingo Luciani' },
      { label: 'Dirección', value: 'El Llanito, Caracas' },
      { label: 'Teléfono', value: '0212-2563344' },
    ]
  },
  {
    title: 'Asignar admin local',
    steps: [
      { text: 'En la tarjeta de la sede, haz clic en "Asignar Admin Local".' },
      { text: 'Selecciona al usuario responsable de administrar esa sede.' },
      { text: 'Presiona "Guardar" para otorgar los permisos de gestión local.' },
    ],
    example: 'Ejemplo: En la sede "Hospital Central", selecciona al usuario "dra.mendoza@ivss.gob.ve" y presiona Guardar.',
    exampleFields: [
      { label: 'Sede', value: 'Hospital Central' },
      { label: 'Admin Local', value: 'dra.mendoza@ivss.gob.ve' },
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
  admin_local_id: string | null;
  admin_local_email: string | null;
  admin_local_nombre: string | null;
  admin_local_apellido: string | null;
  created_at: string;
}

interface UserOption {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

const emptyForm = {
  nombre: '',
  direccion: '',
  telefono: '',
  estado: 'activo' as 'activo' | 'inactivo',
  imagen_url: '',
};

export function SucursalesPage() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal: crear/editar sede
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  // Modal: asignar admin local
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedSucursal, setSelectedSucursal] = useState<Sucursal | null>(null);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [assigningAdmin, setAssigningAdmin] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sData, uData] = await Promise.all([
        apiFetch('/sucursales'),
        apiFetch('/users'),
      ]);
      setSucursales(sData || []);
      setUsers(uData || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('No se pudo cargar la información de sedes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleInputChange = (field: string, value: string) => {
    const updatedForm = { ...formData, [field]: value };
    setFormData(updatedForm);

    const result = sedeSchema.safeParse(updatedForm);
    if (result.success) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    } else {
      const match = result.error.issues.find((issue: ZodIssue) => String(issue.path[0]) === field);
      setErrors(prev => ({ ...prev, [field]: match ? match.message : '' }));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const data = await apiUploadFile('/upload', file);
      setFormData(prev => ({ ...prev, imagen_url: data.url }));
      showSuccess('Imagen cargada correctamente.');
    } catch (err: any) {
      setError('Error al subir la imagen: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleOpenCreate = () => {
    setFormData({ ...emptyForm });
    setEditingId(null);
    setShowModal(true);
    setError(null);
    setErrors({});
  };

  const handleOpenEdit = (s: Sucursal) => {
    setFormData({
      nombre: s.nombre,
      direccion: s.direccion || '',
      telefono: s.telefono || '',
      estado: s.estado,
      imagen_url: s.imagen_url || '',
    });
    setEditingId(s.id);
    setShowModal(true);
    setError(null);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar con Zod
    const result = sedeSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue: ZodIssue) => {
        const path = String(issue.path[0]);
        if (issue.path.length > 0) {
          fieldErrors[path] = issue.message;
        }
      });
      setErrors(fieldErrors);
      setError('Por favor, corrige los errores en el formulario.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      if (editingId) {
        await apiFetch(`/sucursales/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        showSuccess('Sede actualizada correctamente.');
      } else {
        await apiFetch('/sucursales', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        showSuccess('Sede creada correctamente.');
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Error guardando la sede.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar la sede "${nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await apiFetch(`/sucursales/${id}`, { method: 'DELETE' });
      showSuccess('Sede eliminada correctamente.');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'No se pudo eliminar la sede.');
    }
  };

  const handleOpenAssignAdmin = (s: Sucursal) => {
    setSelectedSucursal(s);
    setSelectedAdminId(s.admin_local_id || '');
    setShowAdminModal(true);
    setError(null);
  };

  const handleAssignAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSucursal) return;
    setAssigningAdmin(true);
    setError(null);
    try {
      await apiFetch(`/sucursales/${selectedSucursal.id}/admin`, {
        method: 'PATCH',
        body: JSON.stringify({ user_id: selectedAdminId || null }),
      });
      showSuccess('Administrador local asignado correctamente.');
      setShowAdminModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Error asignando el administrador local.');
    } finally {
      setAssigningAdmin(false);
    }
  };

  const filteredSucursales = sucursales.filter(s =>
    s.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.direccion || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Only show users eligible as local admin (all users except global administrators)
  const eligibleAdmins = users.filter(u =>
    !['Administrator', 'admin'].includes(u.role)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-blue-600" />
            Gestión de Sedes
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Crea, edita y administra las sedes del sistema. Asigna un Administrador Local a cada una.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            id="btn-nueva-sede"
            data-tour="sede-create-btn"
            onClick={handleOpenCreate}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm font-medium gap-2 text-sm"
          >
            <Plus className="w-5 h-5" />
            Nueva Sede
          </button>
        </div>
      </div>

      {/* Ayuda contextual del módulo */}
      <ModuleHelp sections={SUCURSALES_HELP} />

      {/* Feedback messages */}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 font-medium text-sm animate-fade-in">
          <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
          {successMsg}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium text-sm">
          <XCircle className="w-5 h-5 shrink-0 text-red-500" />
          {error}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{sucursales.length}</p>
            <p className="text-xs text-gray-500 font-medium">Sedes Totales</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{sucursales.filter(s => s.estado === 'activo').length}</p>
            <p className="text-xs text-gray-500 font-medium">Sedes Activas</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
            <UserCheck className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{sucursales.filter(s => s.admin_local_id).length}</p>
            <p className="text-xs text-gray-500 font-medium">Con Admin Local</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-4">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              data-tour="sede-search-input"
              placeholder="Buscar por nombre o dirección..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Sede</th>
                <th className="px-6 py-4">Dirección / Teléfono</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Administrador Local</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5"><div className="h-4 bg-gray-200 rounded w-36" /></td>
                    <td className="px-6 py-5"><div className="h-4 bg-gray-200 rounded w-48" /></td>
                    <td className="px-6 py-5"><div className="h-5 bg-gray-200 rounded-full w-16" /></td>
                    <td className="px-6 py-5"><div className="h-4 bg-gray-200 rounded w-40" /></td>
                    <td className="px-6 py-5"><div className="h-8 bg-gray-200 rounded w-24 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredSucursales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-gray-500">
                    <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-lg font-medium text-gray-900">No hay sedes registradas</p>
                    <p className="text-sm mt-1">Haz clic en "Nueva Sede" para comenzar.</p>
                  </td>
                </tr>
              ) : (
                filteredSucursales.map(s => (
                  <tr key={s.id} data-tour="sede-card" className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {s.imagen_url ? (
                          <img
                            src={s.imagen_url}
                            alt={s.nombre}
                            className="w-10 h-10 object-cover rounded-xl border border-slate-100 shadow-sm"
                            onError={(e) => {
                              // Si falla la imagen, ocultarla y mostrar el avatar de letra
                              (e.target as HTMLImageElement).style.display = 'none';
                              const parent = (e.target as HTMLImageElement).parentElement;
                              if (parent) {
                                const fallback = parent.querySelector('.img-fallback') as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div
                          className="img-fallback w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                          style={{ display: s.imagen_url ? 'none' : 'flex' }}
                        >
                          {s.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{s.nombre}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Creada: {new Date(s.created_at).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {s.direccion ? (
                        <div className="flex items-start gap-1.5 text-gray-600 text-xs">
                          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400" />
                          <span>{s.direccion}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Sin dirección</span>
                      )}
                      {s.telefono && (
                        <div className="flex items-center gap-1.5 text-gray-500 text-xs mt-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span>{s.telefono}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {s.estado === 'activo' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                          Activa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                          Inactiva
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {s.admin_local_id ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                            {(s.admin_local_nombre || 'A').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-900">
                              {s.admin_local_nombre} {s.admin_local_apellido}
                            </p>
                            <p className="text-[10px] text-gray-400">{s.admin_local_email}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-medium">
                          <Shield className="w-3 h-3" />
                          Sin asignar
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenAssignAdmin(s)}
                          data-tour="sede-assign-admin-btn"
                          title="Asignar Administrador Local"
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(s)}
                          title="Editar Sede"
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id, s.nombre)}
                          title="Eliminar Sede"
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Crear / Editar Sede */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'Editar Sede' : 'Nueva Sede'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Nombre de la Sede <span className="text-red-500">*</span>
                </label>
                <input
                  id="sede-nombre"
                  required
                  type="text"
                  placeholder="Ej. Sede Caracas Norte"
                  value={formData.nombre}
                  onChange={e => handleInputChange('nombre', e.target.value)}
                  className={`w-full px-3.5 py-2.5 border rounded-xl outline-none transition text-sm ${
                    errors.nombre
                      ? 'border-red-500 focus:ring-2 focus:ring-red-500/25 focus:border-red-500 bg-red-50/10'
                      : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                {errors.nombre && (
                  <p className="text-xs text-red-650 mt-1 font-medium">{errors.nombre}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Dirección <span className="text-red-500">*</span>
                </label>
                <input
                  id="sede-direccion"
                  required
                  type="text"
                  placeholder="Ej. Av. Principal, Edif. Torre Médica"
                  value={formData.direccion}
                  onChange={e => handleInputChange('direccion', e.target.value)}
                  className={`w-full px-3.5 py-2.5 border rounded-xl outline-none transition text-sm ${
                    errors.direccion
                      ? 'border-red-500 focus:ring-2 focus:ring-red-500/25 focus:border-red-500 bg-red-50/10'
                      : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                {errors.direccion && (
                  <p className="text-xs text-red-650 mt-1 font-medium">{errors.direccion}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Teléfono
                </label>
                <input
                  id="sede-telefono"
                  type="text"
                  placeholder="Ej. +58-212-555-0100"
                  value={formData.telefono}
                  onChange={e => handleInputChange('telefono', e.target.value)}
                  className={`w-full px-3.5 py-2.5 border rounded-xl outline-none transition text-sm ${
                    errors.telefono
                      ? 'border-red-500 focus:ring-2 focus:ring-red-500/25 focus:border-red-500 bg-red-50/10'
                      : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                {errors.telefono && (
                  <p className="text-xs text-red-655 mt-1 font-medium">{errors.telefono}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Estado
                </label>
                <div className="relative">
                  <select
                    id="sede-estado"
                    value={formData.estado}
                    onChange={e => setFormData({ ...formData, estado: e.target.value as 'activo' | 'inactivo' })}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm appearance-none bg-white"
                  >
                    <option value="activo">✅ Activa</option>
                    <option value="inactivo">⏸️ Inactiva</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Subir Foto / Logo de la Sede */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Imagen o Logo Institucional
                </label>
                <div className="flex items-center gap-4">
                  {formData.imagen_url ? (
                    <div className="relative w-16 h-16">
                      <img
                        src={formData.imagen_url}
                        alt="Previsualización Sede"
                        className="w-16 h-16 object-cover rounded-xl border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, imagen_url: '' }))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 text-white rounded-full flex items-center justify-center text-[10px] hover:bg-red-650 transition shadow-sm bg-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400">
                      Sin Foto
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={handleFileChange}
                      disabled={uploading}
                      className="hidden"
                      id="sede-logo-upload"
                    />
                    <label
                      htmlFor="sede-logo-upload"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition shadow-sm"
                    >
                      {uploading ? 'Cargando archivo...' : 'Seleccionar Imagen'}
                    </label>
                    <p className="text-[10px] text-gray-400 mt-1">Soporta JPG, JPEG, PNG hasta 10MB.</p>
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || uploading}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Crear Sede'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Asignar Admin Local */}
      {showAdminModal && selectedSucursal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Asignar Administrador Local</h2>
                <p className="text-xs text-gray-500 mt-0.5">Sede: <span className="font-semibold text-gray-700">{selectedSucursal.nombre}</span></p>
              </div>
            </div>

            <div className="my-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
              <strong>¿Qué es un Administrador Local?</strong> Es un usuario con permisos para gestionar
              usuarios y movimientos de una sede específica. Al asignarlo, su rol cambiará a <strong>Local_Admin</strong>.
            </div>

            <form onSubmit={handleAssignAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Seleccionar Administrador
                </label>
                <div className="relative">
                  <select
                    id="admin-local-select"
                    value={selectedAdminId}
                    onChange={e => setSelectedAdminId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition text-sm appearance-none bg-white"
                  >
                    <option value="">— Sin administrador local —</option>
                    {eligibleAdmins.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name} ({u.email}) — {u.role}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  Selecciona "Sin administrador local" para remover la asignación actual.
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAdminModal(false); setError(null); }}
                  className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={assigningAdmin}
                  className="px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 text-sm font-semibold transition disabled:opacity-50"
                >
                  {assigningAdmin ? 'Asignando...' : 'Confirmar Asignación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
