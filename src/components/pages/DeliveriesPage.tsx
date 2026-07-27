import { useState, useEffect } from 'react';
import { Package, Search, Plus, AlertCircle, CheckCircle } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { InventoryMovement } from '../../types/database';
import { useAuth } from '../../contexts/AuthContext';
import { ModuleHelp } from '../ui/ModuleHelp';
import { Tooltip } from '../ui/Tooltip';

const DELIVERIES_HELP = [
  {
    title: 'Registrar entrega',
    steps: [
      { text: 'Presiona el botón "Nueva Entrega" en la parte superior derecha.' },
      { text: 'Selecciona el medicamento y luego el lote específico disponible.' },
      { text: 'Ingresa la cantidad y el motivo o destinatario del despacho.' },
      { text: 'Presiona "Confirmar" para registrar y descontar el stock automáticamente.' },
    ],
    example: 'Ejemplo: Selecciona "Paracetamol 500mg", elige el lote LOT-PAR-2026, ingresa cantidad 40 y como motivo "Servicio de Emergencia". Presiona Confirmar.',
    exampleFields: [
      { label: 'Medicamento', value: 'Paracetamol 500mg' },
      { label: 'Lote', value: 'LOT-PAR-2026' },
      { label: 'Cantidad', value: '40 unidades' },
      { label: 'Motivo', value: 'Servicio de Emergencia' },
    ]
  },
];

export function DeliveriesPage() {
  const { profile } = useAuth();
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [medications, setMedications] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newDelivery, setNewDelivery] = useState({
    medication_id: '',
    batch_id: '',
    quantity: 1,
    reason: '',
    recipient_name: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [movData, medData] = await Promise.all([
        apiFetch('/inventory_movements'),
        apiFetch('/medications')
      ]);
      const exits = movData.filter((m: any) => m.type === 'exit' || m.type === 'out');
      setMovements(exits);
      setMedications(medData);
    } catch (err) {
      console.error('Error fetching deliveries data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (newDelivery.medication_id) {
        fetchBatches(newDelivery.medication_id);
    } else {
        setBatches([]);
    }
  }, [newDelivery.medication_id]);

  const fetchBatches = async (medId: string) => {
    try {
        const data = await apiFetch(`/inventory_batches?medication_id=${medId}`);
        setBatches(data);
        if (data.length > 0) {
            setNewDelivery(prev => ({ ...prev, batch_id: data[0].id }));
        }
    } catch (err) {
        console.error('Error fetching batches:', err);
    }
  };

  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDelivery.batch_id) { setFormError('Debe seleccionar un lote.'); return; }
    setIsSubmitting(true);
    setFormError(null);
    try {
      await apiFetch('/inventory_movements', {
        method: 'POST',
        body: JSON.stringify({
          batch_id: newDelivery.batch_id,
          quantity: newDelivery.quantity,
          reason: newDelivery.reason,
          destination: newDelivery.recipient_name,
          type: 'out'
        })
      });
      setShowAddModal(false);
      setNewDelivery({ medication_id: '', batch_id: '', quantity: 1, reason: '', recipient_name: '' });
      setFormError(null);
      setSuccessMsg('Entrega registrada correctamente.');
      setTimeout(() => setSuccessMsg(null), 3500);
      fetchData();
    } catch (err: any) {
      // Mostrar el mensaje exacto del servidor (ej. "Stock insuficiente para procesar el despacho")
      const serverMsg = err?.message || 'Error al registrar la salida. Intenta de nuevo.';
      setFormError(serverMsg);
      console.error('Fallo al crear entrega', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMovements = movements.filter(m => 
    m.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Obtener el stock del lote actualmente seleccionado
  const selectedBatch = batches.find(b => b.id === newDelivery.batch_id);
  const selectedBatchStock = selectedBatch ? parseInt(selectedBatch.quantity, 10) : null;
  const stockInsuficiente = selectedBatchStock !== null && newDelivery.quantity > selectedBatchStock;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Control de Entregas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona y registra las salidas de medicamentos del inventario.
          </p>
        </div>
        <Tooltip content="Registrar despacho de medicamentos descontando del stock disponible" position="left">
          <button
            id="btn-nueva-entrega"
            onClick={() => { setShowAddModal(true); setFormError(null); }}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition shadow-md font-bold text-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nueva Entrega
          </button>
        </Tooltip>
      </div>

      {/* Ayuda contextual del módulo */}
      <ModuleHelp sections={DELIVERIES_HELP} />

      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 font-medium text-sm">
          <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
          {successMsg}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50">
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder="Buscar entregas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase text-xs">
              <tr>
                <th className="px-6 py-4">ID/Lote</th>
                <th className="px-6 py-4">Motivo / Paciente</th>
                <th className="px-6 py-4">Cantidad (Salida)</th>
                <th className="px-6 py-4">Fecha</th>
                {!profile?.sucursal_id && <th className="px-6 py-4">Sede</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                   <td colSpan={!profile?.sucursal_id ? 5 : 4} className="px-6 py-12 text-center text-gray-500">
                     Cargando entregas...
                   </td>
                </tr>
              ) : filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={!profile?.sucursal_id ? 5 : 4} className="px-6 py-12 text-center text-gray-500">
                    <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-lg font-medium text-gray-900">No hay entregas registradas</p>
                  </td>
                </tr>
              ) : (
                filteredMovements.map((mov) => (
                  <tr key={mov.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-mono text-gray-600 text-xs">{mov.batch_id || mov.id.slice(0,8)}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{mov.reason}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{(mov as any).destination || '-'}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-red-600">-{mov.quantity}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(mov.performed_at || (mov as any).created_at).toLocaleDateString('es-ES', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    {!profile?.sucursal_id && (
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded font-medium">
                          {(mov as any).sucursal_nombre || '—'}
                        </span>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Registrar Nueva Salida</h3>
            <form onSubmit={handleCreateDelivery} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medicamento</label>
                <select required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newDelivery.medication_id} onChange={e => setNewDelivery({...newDelivery, medication_id: e.target.value, batch_id: ''})}>
                  <option value="">-- Seleccionar Medicamento --</option>
                  {medications.map(m => (
                    <option key={m.id} value={m.id}>{m.name} (Stock: {m.stock})</option>
                  ))}
                </select>
              </div>
              {newDelivery.medication_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lote</label>
                  <select required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newDelivery.batch_id} onChange={e => setNewDelivery({...newDelivery, batch_id: e.target.value})}>
                    <option value="">-- Seleccionar Lote --</option>
                    {batches.map(b => {
                      const isExpired = new Date(b.expiration_date) < new Date();
                      const statusText = b.quantity === 0
                        ? 'Agotado'
                        : isExpired
                        ? `Vencido (${b.quantity} disp.)`
                        : `${b.quantity} disponibles`;
                      return (
                        <option key={b.id} value={b.id}>
                          {b.batch_number} ({statusText} - Vence: {new Date(b.expiration_date).toLocaleDateString('es-ES')})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de Salida</label>
                <input required placeholder="Ej. Prescripcion, Descarte..." type="text" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={newDelivery.reason} onChange={e => setNewDelivery({...newDelivery, reason: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                  <input
                    required
                    type="number"
                    min="1"
                    max={selectedBatchStock || undefined}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none transition ${
                      stockInsuficiente
                        ? 'border-red-400 focus:ring-red-400 bg-red-50'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    value={newDelivery.quantity}
                    onChange={e => setNewDelivery({...newDelivery, quantity: parseInt(e.target.value) || 1})}
                  />
                  {/* Indicador de stock disponible en tiempo real */}
                  {selectedBatch && (
                    <p className={`text-xs mt-1 font-medium ${
                      stockInsuficiente ? 'text-red-600' : 'text-emerald-600'
                    }`}>
                      {stockInsuficiente
                        ? `⚠️ Stock insuficiente. Disponible: ${selectedBatchStock} unidades.`
                        : `✅ Disponible en lote: ${selectedBatchStock} unidades`
                      }
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recibe (Paciente/Dpto)</label>
                  <input type="text" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={newDelivery.recipient_name} onChange={e => setNewDelivery({...newDelivery, recipient_name: e.target.value})} />
                </div>
              </div>

              {/* Error del servidor (incluye "Stock insuficiente para procesar el despacho") */}
              {formError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span className="font-medium">{formError}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => { setShowAddModal(false); setFormError(null); }} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button
                  type="submit"
                  disabled={isSubmitting || stockInsuficiente}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Registrando...' : 'Registrar Entrega'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}