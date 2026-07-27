import { useState, useEffect, Fragment } from 'react';
import { Package, Search, Plus, Filter, Edit2, Trash2, ArrowUpDown, AlertTriangle, ShieldAlert, X, ClipboardList, ChevronDown, ChevronRight } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { Medication } from '../../types/database';
import { useAuth } from '../../contexts/AuthContext';
import { ModuleHelp } from '../ui/ModuleHelp';
import { Tooltip } from '../ui/Tooltip';

const INVENTORY_HELP = [
  {
    title: 'Registrar medicamento',
    steps: [
      { text: 'Presiona "Nuevo Medicamento" e ingresa nombre, principio activo, presentación y stock mínimo.' },
      { text: 'También ingresa el número de lote inicial y la fecha de vencimiento.' },
      { text: 'Presiona "Guardar" para agregar al catálogo.' },
    ],
    example: 'Ejemplo: Para registrar una entrada, selecciona "Paracetamol", ingresa la cantidad "50" y presiona Guardar.',
    exampleFields: [
      { label: 'Nombre', value: 'Amoxicilina 500mg' },
      { label: 'Lote', value: 'LOT-2026-AMX-08' },
      { label: 'Vencimiento', value: '2027-08-31' },
      { label: 'Stock mínimo', value: '50 unidades' },
    ]
  },
  {
    title: 'Añadir lote',
    steps: [
      { text: 'Localiza el medicamento en la tabla y haz clic en la flecha para desplegar sus lotes.' },
      { text: 'Presiona el botón de agregar lote e ingresa número de lote, cantidad y fecha de vencimiento.' },
      { text: 'El sistema alertará en amarillo cuando el lote esté a menos de 30 días de vencer.' },
    ],
    example: 'Ejemplo: En "Metformina 850mg", haz clic en la flecha, selecciona "+ Añadir Lote", ingresa lote LOT-MET-09 con 200 unidades.',
    exampleFields: [
      { label: 'Lote', value: 'LOT-MET-09' },
      { label: 'Cantidad', value: '200 unidades' },
      { label: 'Vencimiento', value: '2028-01-15' },
    ]
  },
];

// ===== MODAL DE CONFIRMACIÓN DE ELIMINACIÓN =====
type DeleteTarget = 
  | { type: 'medication'; id: string; name: string; stock: number } 
  | { type: 'batch'; id: string; medicationId: string; name: string; batchNumber: string; quantity: number };

interface DeleteConfirmModalProps {
  target: DeleteTarget;
  onConfirm: (motivo: string, notas: string) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const MOTIVOS_ELIMINACION = [
  { value: 'vencimiento', label: '🗓️ Vencimiento del producto' },
  { value: 'deterioro', label: '⚠️ Deterioro o daño físico' },
  { value: 'mala_contabilidad', label: '📋 Error de contabilidad / registro incorrecto' },
];

function DeleteConfirmModal({ target, onConfirm, onCancel, isSubmitting }: DeleteConfirmModalProps) {
  const [motivo, setMotivo] = useState('');
  const [notas, setNotas] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo) return;
    onConfirm(motivo, notas);
  };

  const isLote = target.type === 'batch';
  const stockLabel = isLote
    ? `Cantidad en lote: ${(target as any).quantity ?? 0} unidades`
    : `Stock actual: ${(target as any).stock ?? 0} unidades`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-red-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white bg-opacity-20 rounded-full p-2">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">
              Confirmación de Eliminación
            </h3>
          </div>
          <button onClick={onCancel} className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning banner */}
        <div className="mx-6 mt-5 bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-800">⚠️ Esta acción es irreversible</p>
            <p className="text-amber-700 mt-1">
              {isLote
                ? <>Estás a punto de eliminar el <strong>Lote {(target as any).batchNumber}</strong> de <strong>{target.name}</strong>.</>
                : <>Estás a punto de eliminar el medicamento <strong>{target.name}</strong> y todos sus lotes.</>
              }
            </p>
            <p className="text-amber-700 font-medium mt-1">{stockLabel}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-4">
          {/* Motivo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <ClipboardList className="w-4 h-4 inline mr-1 text-red-500" />
              Motivo de eliminación <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {MOTIVOS_ELIMINACION.map((m) => (
                <label
                  key={m.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    motivo === m.value
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="motivo"
                    value={m.value}
                    checked={motivo === m.value}
                    onChange={() => setMotivo(m.value)}
                    className="w-4 h-4 text-red-600 accent-red-600"
                  />
                  <span className="text-sm font-medium text-gray-800">{m.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Notas adicionales */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas adicionales <span className="text-gray-400">(opcional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Describe brevemente la razón o detalles adicionales..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none resize-none transition"
            />
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!motivo || isSubmitting}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Confirmar Eliminación
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== COMPONENTE PRINCIPAL =====
export function InventoryPage() {
  const { isAdmin, profile } = useAuth();

  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newMed, setNewMed] = useState({
    name: '',
    generic_name: '',
    category: 'Analgesics',
    presentation: '',
    min_stock_level: 10,
    requires_prescription: false,
    batch_number: '',
    expiration_date: '',
    initial_quantity: 0,
    supplier: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    generic_name: '',
    category: 'Analgesics',
    presentation: '',
    min_stock_level: 10,
    requires_prescription: false
  });
  
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockFormData, setStockFormData] = useState({
    medication_id: '',
    medication_name: '',
    quantity: 1,
    reason: 'Ingreso manual',
    batch_number: '',
    expiration_date: ''
  });

  // ===== ESTADO PARA EL MODAL DE ELIMINACIÓN =====
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ===== ESTADOS PARA LOTES COLAPSABLES =====
  const [expandedMeds, setExpandedMeds] = useState<Record<string, boolean>>({});
  const [medicationBatches, setMedicationBatches] = useState<Record<string, any[]>>({});
  const [loadingBatches, setLoadingBatches] = useState<Record<string, boolean>>({});

  const toggleExpandMed = async (medId: string) => {
    const isCurrentlyExpanded = !!expandedMeds[medId];
    setExpandedMeds(prev => ({ ...prev, [medId]: !isCurrentlyExpanded }));
    
    if (!isCurrentlyExpanded && !medicationBatches[medId]) {
      setLoadingBatches(prev => ({ ...prev, [medId]: true }));
      try {
        const data = await apiFetch(`/inventory_batches?medication_id=${medId}`);
        setMedicationBatches(prev => ({ ...prev, [medId]: data }));
      } catch (err) {
        console.error('Error fetching batches:', err);
      } finally {
        setLoadingBatches(prev => ({ ...prev, [medId]: false }));
      }
    }
  };

  const fetchMedications = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/medications');
      setMedications(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching inventory:', err);
      setError('No se pudo cargar el inventario. Asegúrate de que el servidor está corriendo en el puerto 3000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedications();
  }, []);

  const filteredMeds = Array.isArray(medications) ? medications.filter(med => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    const n = med.name ? String(med.name).toLowerCase() : '';
    const g = med.generic_name ? String(med.generic_name).toLowerCase() : '';
    const c = med.category ? String(med.category).toLowerCase() : '';
    return n.includes(s) || g.includes(s) || c.includes(s);
  }) : [];

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const medResponse = await apiFetch('/medications', {
        method: 'POST',
        body: JSON.stringify({
          name: newMed.name,
          generic_name: newMed.generic_name,
          category: newMed.category,
          presentation: newMed.presentation,
          min_stock_level: newMed.min_stock_level,
          requires_prescription: newMed.requires_prescription,
          code: `MED-${Math.floor(Math.random() * 10000)}`,
          unit: newMed.presentation,
        })
      });

      if (newMed.batch_number && newMed.initial_quantity > 0) {
        await apiFetch('/inventory_batches', {
            method: 'POST',
            body: JSON.stringify({
                medication_id: medResponse.id,
                batch_number: newMed.batch_number,
                expiration_date: newMed.expiration_date,
                quantity: newMed.initial_quantity,
                supplier: newMed.supplier,
                location: 'Bodega Principal'
            })
        });
      }

      setShowAddModal(false);
      setNewMed({ 
          name: '', generic_name: '', category: 'Analgesics', presentation: '', 
          min_stock_level: 10, requires_prescription: false,
          batch_number: '', expiration_date: '', initial_quantity: 0, supplier: ''
      });
      fetchMedications();
    } catch (err) {
      console.error('Failed to create medication or batch', err);
      setError('Fallo al crear medicamento o lote.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== NUEVO: Solicitar confirmación antes de eliminar =====
  const handleRequestDelete = (med: Medication) => {
    setDeleteTarget({
      type: 'medication',
      id: med.id,
      name: med.name,
      stock: (med as any).stock || 0
    });
  };

  // ===== NUEVO: Ejecutar eliminación con motivo =====
  const handleConfirmDelete = async (motivo: string, notas: string) => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'medication') {
        await apiFetch(`/medications/${deleteTarget.id}`, {
          method: 'DELETE',
          body: JSON.stringify({ motivo_eliminacion: motivo, notas_eliminacion: notas })
        });
      } else {
        await apiFetch(`/inventory_batches/${deleteTarget.id}`, {
          method: 'DELETE',
          body: JSON.stringify({ motivo_eliminacion: motivo, notas_eliminacion: notas })
        });
        
        // Refresh batches for this specific medication
        const medId = deleteTarget.medicationId;
        try {
          const data = await apiFetch(`/inventory_batches?medication_id=${medId}`);
          setMedicationBatches(prev => ({ ...prev, [medId]: data }));
        } catch (err) {
          console.error('Error refreshing batches:', err);
        }
      }
      setDeleteTarget(null);
      fetchMedications();
      setError(null);
    } catch (err: any) {
      console.error('Error deleting:', err);
      setError(err?.message || 'No se pudo eliminar el elemento.');
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = (med: Medication) => {
    setEditingMed(med);
    setEditFormData({
      name: med.name,
      generic_name: med.generic_name || '',
      category: med.category || 'Analgesics',
      presentation: (med as any).presentation || med.unit || '',
      min_stock_level: med.min_stock_level || 0,
      requires_prescription: (med as any).requires_prescription || false
    });
  };

  const handleUpdateMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMed) return;
    setIsSubmitting(true);
    try {
      await apiFetch(`/medications/${editingMed.id}`, {
        method: 'PUT',
        body: JSON.stringify(editFormData)
      });
      setEditingMed(null);
      fetchMedications();
      setError(null);
    } catch (err) {
      console.error('Error updating medication:', err);
      setError('No se pudo actualizar el medicamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStockClick = (med: Medication) => {
    setStockFormData({
      medication_id: med.id,
      medication_name: med.name,
      quantity: 1,
      reason: 'Ingreso manual',
      batch_number: '',
      expiration_date: ''
    });
    setShowStockModal(true);
  };

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiFetch(`/medications/${stockFormData.medication_id}/stock`, {
        method: 'PATCH',
        body: JSON.stringify({
            quantity: stockFormData.quantity,
            reason: stockFormData.reason,
            batch_number: stockFormData.batch_number,
            expiration_date: stockFormData.expiration_date
        })
      });
      setShowStockModal(false);
      fetchMedications();
      setError(null);
    } catch (err) {
      console.error('Error updating stock:', err);
      setError('No se pudo actualizar el stock.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex items-center justify-center h-64"><div className="animate-pulse bg-blue-100 h-12 w-12 rounded-full"></div></div>;
  }

  if (!medications) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario de Medicamentos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona el catalogo completo de medicamentos y suministros.
          </p>
        </div>
        <Tooltip content="Agregar nuevo fármaco al catálogo e ingresar lote inicial" position="left">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition shadow-md font-bold text-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Medicamento
          </button>
        </Tooltip>
      </div>

      {/* Ayuda contextual del módulo */}
      <ModuleHelp sections={INVENTORY_HELP} />

      {/* Banner de permisos de admin */}
      {isAdmin && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">
          <ShieldAlert className="w-4 h-4 flex-shrink-0 text-red-500" />
          <span>
            <strong>Modo Administrador:</strong> Tienes permisos para eliminar medicamentos y lotes. Esta acción quedará registrada en el historial de auditoría.
          </span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50">
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder="Buscar por nombre, generico o categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
          <button className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition shadow-sm font-medium whitespace-nowrap">
            <Filter className="w-4 h-4 mr-2" />
            Filtrar
          </button>
        </div>

        {error ? (
          <div className="p-8 text-center text-red-600">
            <AlertTriangle className="w-12 h-12 mx-auto text-red-400 mb-3" />
            <p className="font-medium">{error}</p>
            <button onClick={fetchMedications} className="mt-4 text-sm text-blue-600 hover:underline">Reintentar</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase text-xs">
                <tr>
                  <th className="w-10 px-4 py-4"></th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition"><div className="flex items-center">Nombre <ArrowUpDown className="w-3 h-3 ml-1" /></div></th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4">Presentacion</th>
                  <th className="px-6 py-4 text-center">Stock Actual (und.)</th>
                  <th className="px-6 py-4 text-center">Stock Mín. (und.)</th>
                  <th className="px-6 py-4">Receta</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-4"></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-48"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12 mx-auto"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                      <td className="px-6 py-4"></td>
                    </tr>
                  ))
                ) : filteredMeds.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-lg font-medium text-gray-900">No hay medicamentos</p>
                      <p className="text-sm">No se encontraron resultados para tu busqueda o el inventario esta vacio.</p>
                    </td>
                  </tr>
                ) : (
                  filteredMeds.map((med) => {
                    const stockActual = (med as any).stock || 0;
                    const stockBajo = stockActual <= (med.min_stock_level || 0);
                    const stockVacio = stockActual === 0;
                    const isExpanded = !!expandedMeds[med.id];

                    return (
                      <Fragment key={med.id}>
                        <tr className={`hover:bg-gray-50 transition ${stockVacio ? 'bg-red-50' : stockBajo ? 'bg-amber-50' : ''}`}>
                          <td className="px-4 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => toggleExpandMed(med.id)}
                              className="p-1 hover:bg-gray-200/50 rounded transition text-gray-500 flex items-center justify-center mx-auto"
                              title="Ver Lotes"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{med.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{med.generic_name || 'Sin genetico'}</div>
                            {stockVacio && (
                              <span className="inline-flex items-center gap-1 text-xs text-red-700 font-semibold bg-red-100 px-1.5 py-0.5 rounded mt-1">
                                <AlertTriangle className="w-3 h-3" /> Sin stock
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {med.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600">{med.presentation}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`font-bold ${stockVacio ? 'text-red-600' : stockBajo ? 'text-amber-600' : 'text-green-600'}`}>
                              {stockActual} und.
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center font-medium text-gray-900">
                            {med.min_stock_level || 0} und.
                          </td>
                          <td className="px-6 py-4">
                            {med.requires_prescription ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">Si</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => handleStockClick(med)}
                                className="p-1.5 text-gray-400 hover:text-green-600 transition" 
                                title="Aumentar Stock"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleEditClick(med)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 transition" 
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {/* Botón eliminar SOLO para administradores */}
                              {isAdmin && (
                                <button 
                                  onClick={() => handleRequestDelete(med)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 transition" 
                                  title="Eliminar (Solo Administrador)"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-gray-50/50">
                            <td colSpan={8} className="px-6 py-4 border-t border-b border-gray-100">
                              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 overflow-hidden">
                                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                                    <Package className="w-3.5 h-3.5 text-blue-500" />
                                    {profile?.sucursal_id ? 'Lotes registrados para este medicamento en esta sede' : 'Lotes registrados — Todas las sedes'}
                                  </h4>
                                  <span className="text-xs text-gray-400 font-medium">
                                    {loadingBatches[med.id] ? 'Cargando lotes...' : `${medicationBatches[med.id]?.length || 0} lote(s) encontrado(s)`}
                                  </span>
                                </div>
                                
                                {loadingBatches[med.id] ? (
                                  <div className="flex justify-center py-4">
                                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                  </div>
                                ) : !medicationBatches[med.id] || medicationBatches[med.id].length === 0 ? (
                                  <p className="text-sm text-gray-500 py-2 text-center">No hay lotes registrados para este medicamento en esta sede.</p>
                                ) : (
                                  <table className="w-full text-left text-xs">
                                    <thead>
                                      <tr className="text-gray-500 font-semibold border-b border-gray-100 pb-1 text-[11px] uppercase tracking-wider">
                                        <th className="py-2">Número de Lote</th>
                                        <th className="py-2">Fecha de Vencimiento</th>
                                        <th className="py-2 text-center">Cantidad / Stock</th>
                                        <th className="py-2">Estado</th>
                                        {!profile?.sucursal_id && <th className="py-2">Sede</th>}
                                        {isAdmin && <th className="py-2 text-right">Acciones</th>}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {medicationBatches[med.id].map((batch) => {
                                        const isExpired = new Date(batch.expiration_date) < new Date();
                                        const isLow = batch.quantity <= 5;
                                        
                                        return (
                                          <tr key={batch.id} className="hover:bg-gray-50/80 transition">
                                            <td className="py-2.5 font-semibold text-gray-800">{batch.batch_number}</td>
                                            <td className="py-2.5 text-gray-600">
                                              <span className={isExpired ? 'text-red-600 font-semibold flex items-center gap-1' : ''}>
                                                {isExpired && <AlertTriangle className="w-3 h-3 text-red-500" />}
                                                {new Date(batch.expiration_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                {isExpired && ' (Vencido)'}
                                              </span>
                                            </td>
                                            <td className="py-2.5 text-center font-bold">
                                              <span className={batch.quantity === 0 ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-gray-700'}>
                                                {batch.quantity}
                                              </span>
                                            </td>
                                            <td className="py-2.5">
                                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                                batch.quantity === 0
                                                  ? 'bg-red-100 text-red-800'
                                                  : isExpired
                                                  ? 'bg-red-100 text-red-800'
                                                  : 'bg-green-100 text-green-800'
                                              }`}>
                                                {batch.quantity === 0 ? 'Agotado' : isExpired ? 'Vencido' : 'Activo'}
                                              </span>
                                            </td>
                                            {!profile?.sucursal_id && (
                                              <td className="py-2.5 text-gray-500 text-[11px]">
                                                <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                                                  {(batch as any).sucursal_nombre || '—'}
                                                </span>
                                              </td>
                                            )}
                                            {isAdmin && (
                                              <td className="py-2.5 text-right">
                                                <button
                                                  type="button"
                                                  onClick={() => setDeleteTarget({
                                                    type: 'batch',
                                                    id: batch.id,
                                                    medicationId: med.id,
                                                    name: med.name,
                                                    batchNumber: batch.batch_number,
                                                    quantity: batch.quantity
                                                  })}
                                                  className="p-1 text-gray-400 hover:text-red-600 transition"
                                                  title="Eliminar Lote (Solo Administrador)"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </td>
                                            )}
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                )}
                              </div>
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
        )}
      </div>

      {/* Modal Añadir Medicamento */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Añadir Nuevo Medicamento</h3>
            <form onSubmit={handleAddMedication} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Comercial</label>
                <input required type="text" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newMed.name} onChange={e => setNewMed({ ...newMed, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Genérico (opcional)</label>
                <input type="text" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newMed.generic_name} onChange={e => setNewMed({ ...newMed, generic_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newMed.category} onChange={e => setNewMed({ ...newMed, category: e.target.value })}>
                    <option value="Analgesics">Analgesics</option>
                    <option value="Antibiotics">Antibiotics</option>
                    <option value="Cardiovascular">Cardiovascular</option>
                    <option value="Jarabe">Jarabe</option>
                    <option value="Insumos">Insumos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Presentación</label>
                  <input required placeholder="Ej. Caja 20 pastillas" type="text" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newMed.presentation} onChange={e => setNewMed({ ...newMed, presentation: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alerta Stock Mínimo</label>
                <input required type="number" min="0" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={newMed.min_stock_level} onChange={e => setNewMed({...newMed, min_stock_level: parseInt(e.target.value)})} />
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Información de Lote Inicial</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Número de Lote</label>
                        <input placeholder="LOT-001" type="text" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                            value={newMed.batch_number} onChange={e => setNewMed({...newMed, batch_number: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vencimiento</label>
                        <input type="date" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                            value={newMed.expiration_date} onChange={e => setNewMed({...newMed, expiration_date: e.target.value})} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad Inicial</label>
                        <input type="number" min="0" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                            value={newMed.initial_quantity} onChange={e => setNewMed({...newMed, initial_quantity: parseInt(e.target.value)})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor (opcional)</label>
                        <input type="text" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                            value={newMed.supplier} onChange={e => setNewMed({...newMed, supplier: e.target.value})} />
                    </div>
                </div>
              </div>

              <div className="flex items-center">
                <input type="checkbox" id="rx" className="h-4 w-4 text-blue-600 rounded border-gray-300"
                  checked={newMed.requires_prescription} onChange={e => setNewMed({ ...newMed, requires_prescription: e.target.checked })} />
                <label htmlFor="rx" className="ml-2 text-sm text-gray-700">Requiere Receta Médica</label>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {isSubmitting ? 'Guardando...' : 'Añadir Medicamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Medicamento */}
      {editingMed && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Editar Medicamento</h3>
            <form onSubmit={handleUpdateMedication} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Comercial</label>
                <input required type="text" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={editFormData.name} onChange={e => setEditFormData({ ...editFormData, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Genérico</label>
                <input type="text" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={editFormData.generic_name} onChange={e => setEditFormData({ ...editFormData, generic_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={editFormData.category} onChange={e => setEditFormData({ ...editFormData, category: e.target.value })}>
                    <option value="Analgesics">Analgesics</option>
                    <option value="Antibiotics">Antibiotics</option>
                    <option value="Cardiovascular">Cardiovascular</option>
                    <option value="Jarabe">Jarabe</option>
                    <option value="Insumos">Insumos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Presentación</label>
                  <input required type="text" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={editFormData.presentation} onChange={e => setEditFormData({ ...editFormData, presentation: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alerta Stock Mínimo</label>
                <input required type="number" min="0" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={editFormData.min_stock_level} onChange={e => setEditFormData({...editFormData, min_stock_level: parseInt(e.target.value)})} />
              </div>

              <div className="flex items-center">
                <input type="checkbox" id="rx-edit" className="h-4 w-4 text-blue-600 rounded border-gray-300"
                  checked={editFormData.requires_prescription} onChange={e => setEditFormData({ ...editFormData, requires_prescription: e.target.checked })} />
                <label htmlFor="rx-edit" className="ml-2 text-sm text-gray-700">Requiere Receta Médica</label>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setEditingMed(null)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {isSubmitting ? 'Actualizando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Aumentar Stock */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Aumentar Stock</h3>
            <p className="text-center text-gray-600 mb-6 font-medium bg-blue-50 py-2 rounded-lg border border-blue-100">
                {stockFormData.medication_name}
            </p>
            <form onSubmit={handleUpdateStock} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad a Sumar</label>
                  <input required type="number" min="1" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={stockFormData.quantity} onChange={e => setStockFormData({...stockFormData, quantity: parseInt(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                  <input type="text" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={stockFormData.reason} onChange={e => setStockFormData({...stockFormData, reason: e.target.value})} />
                </div>
              </div>

              <div className="border-t pt-4 mt-2">
                  <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-tighter">Opciones de Lote (Opcional)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nº Lote</label>
                        <input placeholder="Nuevo o existente" type="text" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                            value={stockFormData.batch_number} onChange={e => setStockFormData({...stockFormData, batch_number: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vencimiento</label>
                        <input type="date" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                            value={stockFormData.expiration_date} onChange={e => setStockFormData({...stockFormData, expiration_date: e.target.value})} />
                    </div>
                  </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowStockModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                  {isSubmitting ? 'Actualizando...' : 'Confirmar Ingreso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL DE CONFIRMACIÓN DE ELIMINACIÓN ===== */}
      {deleteTarget && (
        <DeleteConfirmModal
          target={deleteTarget}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
          isSubmitting={isDeleting}
        />
      )}
    </div>
  );
}