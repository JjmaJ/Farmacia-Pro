import React, { useState, useEffect } from 'react';
import { Activity, Search, Plus, Eye, PackagePlus, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { apiFetch, apiUploadFile } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { ModuleHelp } from '../ui/ModuleHelp';

const HIGH_COST_HELP = [
  {
    title: 'Registrar paciente',
    steps: [
      { text: 'Presiona "Registrar Paciente" e ingresa la cédula y nombre completo.' },
      { text: 'Ingresa el código de autorización y la cantidad total de ciclos asignados (ej. 6 ciclos).' },
      { text: 'Adjunta la historia clínica digital si está disponible y presiona "Guardar".' },
    ],
    example: 'Ejemplo: Paciente "María Pérez", cédula V-18459203, código AUT-IVSS-99, 6 ciclos totales. Presiona Guardar.',
    exampleFields: [
      { label: 'Cédula', value: 'V-18459203' },
      { label: 'Nombre', value: 'María Pérez' },
      { label: 'Ciclos', value: '6 Ciclos' },
      { label: 'Autorización', value: 'AUT-IVSS-99' },
    ]
  },
  {
    title: 'Despachar ciclo',
    steps: [
      { text: 'En la lista de pacientes, ubica al paciente activo y haz clic en "Despachar".' },
      { text: 'Selecciona el medicamento de alto costo y el lote con disponibilidad.' },
      { text: 'Ingresa la cantidad a entregar y confirma para descontar el stock e incrementar el ciclo del paciente.' },
    ],
    example: 'Ejemplo: En el paciente "María Pérez", selecciona el medicamento "Rituximab 500mg", lote LOT-RIT-01, cantidad 1. Presiona Entregar.',
    exampleFields: [
      { label: 'Medicamento', value: 'Rituximab 500mg' },
      { label: 'Lote', value: 'LOT-RIT-01' },
      { label: 'Ciclo entregado', value: 'Ciclo 1/6' },
    ]
  },
];

interface Patient {
  id: string;
  documento_identidad: string;
  nombre_completo: string;
  codigo_autorizacion?: string;
  historia_clinica_url?: string;
  ciclos_totales: number;
  ciclos_entregados: number;
  estado: string;
  created_at: string;
}

interface Medication {
  id: string;
  name: string;
  stock: number;
}

interface DispatchHistoryItem {
  id: string;
  paciente_id: string;
  medication_id: string;
  medication_name?: string;
  batch_number?: string;
  cantidad: number;
  user_id: string;
  fecha_entrega: string;
  fecha_hora?: string;
  nombre_completo?: string;
  notas?: string;
}

export function HighCostPatientsPage() {
  const { profile } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  // Data for dispatch
  const [medications, setMedications] = useState<Medication[]>([]);
  
  // History states
  const [dispatchHistory, setDispatchHistory] = useState<DispatchHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);


  // Form states
  const [newPatient, setNewPatient] = useState({
    documento_identidad: '',
    nombre_completo: '',
    codigo_autorizacion: '',
    historia_clinica_url: '',
    ciclos_totales: 6
  });
  const [historiaFile, setHistoriaFile] = useState<File | null>(null);

  const [dispatchData, setDispatchData] = useState({
    medication_id: '',
    batch_number: '',
    cantidad: 1,
    notas: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [patientsData, medsData] = await Promise.all([
        apiFetch('/pacientes_alto_costo'),
        apiFetch('/medications')
      ]);
      setPatients(patientsData);
      setMedications(medsData);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError('No se pudo cargar la información.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Cargar lotes al seleccionar un medicamento
  useEffect(() => {
    if (dispatchData.medication_id) {
      setLoadingBatches(true);
      setDispatchError(null);
      apiFetch(`/inventory_batches?medication_id=${dispatchData.medication_id}`)
        .then(data => {
          setBatches(data || []);
          if (data && data.length > 0) {
            setDispatchData(prev => ({ ...prev, batch_number: data[0].batch_number }));
          } else {
            setDispatchData(prev => ({ ...prev, batch_number: '' }));
          }
        })
        .catch(err => {
          console.error('Error fetching batches:', err);
          setBatches([]);
        })
        .finally(() => {
          setLoadingBatches(false);
        });
    } else {
      setBatches([]);
    }
  }, [dispatchData.medication_id]);

  const filteredPatients = patients.filter(p => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return p.nombre_completo.toLowerCase().includes(s) || p.documento_identidad.toLowerCase().includes(s);
  });

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let finalUrl = newPatient.historia_clinica_url;
      
      if (historiaFile) {
        const uploadRes = await apiUploadFile('/upload', historiaFile);
        finalUrl = uploadRes.url;
      }

      const p = await apiFetch('/pacientes_alto_costo', {
        method: 'POST',
        body: JSON.stringify({ ...newPatient, historia_clinica_url: finalUrl })
      });
      setPatients([p, ...patients]);
      setShowAddModal(false);
      setNewPatient({
        documento_identidad: '',
        nombre_completo: '',
        codigo_autorizacion: '',
        historia_clinica_url: '',
        ciclos_totales: 6
      });
      setHistoriaFile(null);
    } catch (err: any) {
      console.error('Add patient error', err);
      alert('Error: ' + (err.error || 'Server error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !dispatchData.medication_id) return;
    setIsSubmitting(true);
    setDispatchError(null);
    try {
      await apiFetch(`/pacientes_alto_costo/${selectedPatient.id}/despacho`, {
        method: 'POST',
        body: JSON.stringify(dispatchData)
      });
      setShowDispatchModal(false);
      setDispatchData({ medication_id: '', batch_number: '', cantidad: 1, notas: '' });
      setSelectedPatient(null);
      fetchData(); // Refresh to get updated cycles and status
    } catch (err: any) {
      console.error('Dispatch error', err);
      setDispatchError(err.message || err.error || 'No se pudo registrar el despacho');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDocModal = async (p: Patient) => {
    setSelectedPatient(p);
    setShowDocModal(true);
    setLoadingHistory(true);
    try {
      const history = await apiFetch(`/pacientes_alto_costo/${p.id}/despachos`);
      setDispatchHistory(history || []);
    } catch (err) {
      console.error('Error fetching dispatch history:', err);
      setDispatchHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const openDispatchModal = (p: Patient) => {
    setSelectedPatient(p);
    setDispatchError(null);
    setBatches([]);
    setDispatchData({ medication_id: '', batch_number: '', cantidad: 1, notas: '' });
    setShowDispatchModal(true);
  };

  if (loading) {
    return <div className="p-8 flex items-center justify-center h-64"><div className="animate-pulse bg-blue-100 h-12 w-12 rounded-full"></div></div>;
  }

  const selectedBatch = batches.find(b => b.batch_number === dispatchData.batch_number);
  const selectedBatchStock = selectedBatch ? parseInt(selectedBatch.quantity, 10) : null;
  const stockInsuficiente = selectedBatchStock !== null && dispatchData.cantidad > selectedBatchStock;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pacientes Alto Costo</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión y seguimiento de ciclos de tratamiento continuo.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition shadow-sm font-medium"
        >
          <Plus className="w-5 h-5 mr-2" />
          Registrar Paciente
        </button>
      </div>

      {/* Ayuda contextual del módulo */}
      <ModuleHelp sections={HIGH_COST_HELP} />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center bg-gray-50">
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder="Buscar por nombre o documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
        </div>

        {error ? (
          <div className="p-8 text-center text-red-600">
             <AlertTriangle className="w-12 h-12 mx-auto text-red-400 mb-3" />
             <p className="font-medium">{error}</p>
             <button onClick={fetchData} className="mt-4 text-sm text-blue-600 hover:underline">Reintentar</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase text-xs">
                <tr>
                  <th className="px-6 py-4">Paciente</th>
                  <th className="px-6 py-4 text-center">Progreso de Ciclos</th>
                  <th className="px-6 py-4">Estado</th>
                  {!profile?.sucursal_id && <th className="px-6 py-4">Sede</th>}
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={!profile?.sucursal_id ? 5 : 4} className="px-6 py-12 text-center text-gray-500">
                      <Activity className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-lg font-medium text-gray-900">No hay pacientes registrados</p>
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((p) => {
                    const isAlert = p.estado === 'activo' && (p.ciclos_totales - p.ciclos_entregados) === 2;
                    
                    return (
                      <tr key={p.id} className={`transition ${isAlert ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}`}>
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900 flex items-center gap-2">
                             {p.nombre_completo}
                             {isAlert && (
                               <span title="Alerta: Próximo a finalizar ciclo">
                                 <AlertTriangle className="w-4 h-4 text-red-500" />
                               </span>
                             )}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">Doc: {p.documento_identidad}</div>
                          {isAlert && (
                             <div className="text-xs text-red-600 mt-2 font-medium max-w-xs">
                               Atención: El paciente está próximo a finalizar su ciclo de tratamiento. Solicitar actualización de documentos/historia clínica si continuará recibiendo el medicamento.
                             </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="font-bold text-gray-800 text-lg">
                            {p.ciclos_entregados} / {p.ciclos_totales}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                            <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${Math.min(100, (p.ciclos_entregados / p.ciclos_totales) * 100)}%` }}></div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {p.estado === 'activo' ? (
                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                               <CheckCircle className="w-3 h-3 mr-1"/> Activo
                             </span>
                          ) : p.estado === 'completado' ? (
                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                               <CheckCircle className="w-3 h-3 mr-1"/> Completado
                             </span>
                          ) : (
                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                               <Clock className="w-3 h-3 mr-1"/> Inactivo
                             </span>
                          )}
                        </td>
                        {!profile?.sucursal_id && (
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded font-medium">
                              {(p as any).sucursal_nombre || '—'}
                            </span>
                          </td>
                        )}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => openDocModal(p)}
                              className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg inline-flex items-center border border-transparent shadow-sm transition" 
                            >
                              <Eye className="w-4 h-4 mr-1.5" />
                              Vista Rápida
                            </button>
                            {p.estado === 'activo' && p.ciclos_entregados < p.ciclos_totales && (
                              <button 
                                onClick={() => openDispatchModal(p)}
                                className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg inline-flex items-center shadow-sm transition" 
                              >
                                <PackagePlus className="w-4 h-4 mr-1.5" />
                                Despachar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD PATIENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-150">
            <div className="p-5 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-xl font-bold text-gray-900">Registro de Paciente Alto Costo</h3>
            </div>
            
            <form onSubmit={handleAddPatient} className="flex flex-col flex-grow overflow-hidden">
              <div className="p-5 overflow-y-auto flex-grow space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Doc. Identidad</label>
                     <input required type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                       value={newPatient.documento_identidad} onChange={e => setNewPatient({ ...newPatient, documento_identidad: e.target.value })} />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                     <input required type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                       value={newPatient.nombre_completo} onChange={e => setNewPatient({ ...newPatient, nombre_completo: e.target.value })} />
                   </div>
                </div>
                
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Ciclos de Tratamiento (Total)</label>
                   <select className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                     value={newPatient.ciclos_totales} onChange={e => setNewPatient({ ...newPatient, ciclos_totales: parseInt(e.target.value) })}>
                     <option value={6}>6 Ciclos</option>
                     <option value={8}>8 Ciclos</option>
                     <option value={12}>12 Ciclos</option>
                     <option value={24}>24 Ciclos</option>
                   </select>
                </div>
                
                <div className="border-t border-gray-100 pt-4">
                   <h4 className="text-sm font-bold text-gray-900 mb-3">Documentación Obligatoria</h4>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Código de Autorización</label>
                       <input type="text" placeholder="Ej. AUTH-2026-XYZ" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                         value={newPatient.codigo_autorizacion} onChange={e => setNewPatient({ ...newPatient, codigo_autorizacion: e.target.value })} />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Historia Clínica (Archivo PDF/Imagen)</label>
                       <input type="file" accept=".pdf,image/png,image/jpeg" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 text-sm file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                         onChange={e => setHistoriaFile(e.target.files ? e.target.files[0] : null)} />
                     </div>
                   </div>
                </div>
              </div>

              <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 flex-shrink-0">
                <button type="button" onClick={() => { setShowAddModal(false); setHistoriaFile(null); }} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition font-medium">Cancelar</button>
                <button type="submit" disabled={isSubmitting || (!newPatient.codigo_autorizacion && !newPatient.historia_clinica_url && !historiaFile)} 
                        className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition font-medium shadow-sm">
                  {isSubmitting ? 'Guardando...' : 'Activar Paciente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISPATCH MODAL */}
      {showDispatchModal && selectedPatient && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-150">
            <div className="p-5 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-xl font-bold text-gray-900">Registrar Despacho</h3>
            </div>
            
            <form onSubmit={handleDispatch} className="flex flex-col flex-grow overflow-hidden">
              <div className="p-5 overflow-y-auto flex-grow space-y-4">
                <div className="text-sm text-gray-700 bg-purple-50/70 border border-purple-100 p-3.5 rounded-xl">
                   <div className="flex justify-between mb-1">
                     <span className="text-gray-500">Paciente:</span>
                     <span className="font-bold text-gray-900">{selectedPatient.nombre_completo}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-gray-500">Entrega Actual:</span>
                     <span className="font-bold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded text-xs">
                       {selectedPatient.ciclos_entregados + 1} de {selectedPatient.ciclos_totales}
                     </span>
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Medicamento a Despachar</label>
                   <select required className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white"
                     value={dispatchData.medication_id} onChange={e => setDispatchData({ ...dispatchData, medication_id: e.target.value })}>
                     <option value="">Seleccione un medicamento...</option>
                     {medications.map(m => (
                        <option key={m.id} value={m.id}>{m.name} (Stock: {m.stock})</option>
                     ))}
                   </select>
                </div>

                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Lote de Medicamento <span className="text-red-500">*</span></label>
                   <select 
                     required 
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white"
                     value={dispatchData.batch_number} 
                     onChange={e => setDispatchData({ ...dispatchData, batch_number: e.target.value })}
                     disabled={loadingBatches || !dispatchData.medication_id}
                   >
                     <option value="">
                       {loadingBatches 
                         ? 'Cargando lotes...' 
                         : !dispatchData.medication_id 
                           ? 'Seleccione primero un medicamento...' 
                           : batches.length === 0 
                             ? 'No hay lotes disponibles para este medicamento' 
                             : 'Seleccione un lote...'}
                     </option>
                      {batches.map(b => {
                        const isExpired = new Date(b.expiration_date) < new Date();
                        const statusText = b.quantity === 0
                          ? 'Agotado'
                          : isExpired
                          ? `Vencido (${b.quantity} disp.)`
                          : `${b.quantity} disponibles`;
                        return (
                          <option key={b.id} value={b.batch_number}>
                            {b.batch_number} ({statusText} - Vence: {new Date(b.expiration_date).toLocaleDateString('es-ES')})
                          </option>
                        );
                      })}
                   </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                     <input 
                       required 
                       type="number" 
                       min="1" 
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-sm"
                       value={dispatchData.cantidad} 
                       onChange={e => setDispatchData({ ...dispatchData, cantidad: parseInt(e.target.value) || 1 })} 
                     />
                   </div>
                   
                   <div className="flex flex-col justify-end">
                     {selectedBatchStock !== null && (
                       <div className={`text-xs font-semibold p-2.5 rounded-lg border ${
                         stockInsuficiente 
                           ? 'bg-red-50 border-red-200 text-red-700' 
                           : 'bg-green-50 border-green-200 text-green-700'
                       }`}>
                         Stock Disponible: {selectedBatchStock}
                         {stockInsuficiente && <span className="block font-bold mt-0.5">⚠️ Stock Insuficiente</span>}
                       </div>
                     )}
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Notas Administrativas</label>
                   <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-sm"
                     value={dispatchData.notas} onChange={e => setDispatchData({ ...dispatchData, notas: e.target.value })} rows={2} />
                </div>

                {dispatchError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
                    {dispatchError}
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 flex-shrink-0">
                <button type="button" onClick={() => setShowDispatchModal(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition font-medium">Cancelar</button>
                <button 
                  type="submit" 
                  disabled={isSubmitting || stockInsuficiente || !dispatchData.batch_number} 
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition font-medium shadow-sm font-semibold"
                >
                  {isSubmitting ? 'Registrando...' : 'Confirmar Entrega'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOC VIEW MODAL (VISTA RÁPIDA) */}
      {showDocModal && selectedPatient && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-150">
            <div className="p-5 border-b border-gray-100 flex-shrink-0 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-500" />
                Vista Rápida: {selectedPatient.nombre_completo}
              </h3>
              <span className="text-xs text-gray-500">Doc: {selectedPatient.documento_identidad}</span>
            </div>
            
            <div className="p-5 overflow-y-auto flex-grow space-y-6">
              {/* Patient Basic Auth Documents Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-100/50">
                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">Código de Autorización Oficial</p>
                    <p className="text-md font-mono font-bold text-blue-900 break-all bg-white p-2 border border-blue-200 rounded mt-1">
                       {selectedPatient.codigo_autorizacion || 'No registrado'}
                    </p>
                 </div>

                 <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200/50 flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Historia Clínica Adjunta</p>
                      <p className="text-sm font-medium text-gray-800 mt-1">
                         {selectedPatient.historia_clinica_url ? 'Documento PDF/Imagen cargado' : 'No se ha adjuntado archivo'}
                      </p>
                    </div>
                    {selectedPatient.historia_clinica_url && (
                       <a href={selectedPatient.historia_clinica_url} target="_blank" rel="noopener noreferrer" download
                          className="mt-3 inline-flex items-center justify-center px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 rounded-lg shadow-sm transition">
                          Descargar Archivo
                       </a>
                    )}
                 </div>
              </div>

              {/* Dispatch Audit History Section */}
              <div className="border-t border-gray-100 pt-5">
                <h4 className="text-sm font-bold text-gray-950 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-600" />
                  Historial de Entregas & Auditoría
                </h4>

                {loadingHistory ? (
                  <div className="py-8 flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent"></div>
                    <span className="ml-3 text-sm text-gray-500">Cargando auditoría...</span>
                  </div>
                ) : dispatchHistory.length === 0 ? (
                  <div className="bg-gray-50 border border-dashed rounded-xl p-6 text-center text-gray-500">
                     <Clock className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                     <p className="text-sm">No se han registrado entregas para este paciente todavía.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dispatchHistory.map((item, index) => {
                      const dateObj = item.fecha_hora ? new Date(item.fecha_hora) : new Date(item.fecha_entrega);
                      const formattedDate = !isNaN(dateObj.getTime()) 
                        ? dateObj.toLocaleString('es-ES', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit',
                            second: '2-digit'
                          }) 
                        : 'Fecha no disponible';

                      return (
                        <div key={item.id || index} className="p-3.5 rounded-xl border border-gray-150 bg-white shadow-sm flex flex-col sm:flex-row justify-between gap-3 hover:border-purple-200 transition">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md">
                                Ciclo {dispatchHistory.length - index}
                              </span>
                              <span className="text-sm font-bold text-gray-900">
                                {item.medication_name || 'Medicamento'}
                              </span>
                            </div>
                            {item.batch_number && (
                              <p className="text-xs text-gray-500">
                                Lote: <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-700">{item.batch_number}</span> | Cantidad: {item.cantidad}
                              </p>
                            )}
                            {item.notas && (
                              <p className="text-xs text-gray-600 bg-gray-50 p-1.5 rounded border border-gray-100 italic">
                                "{item.notas}"
                              </p>
                            )}
                          </div>
                          
                          <div className="sm:text-right flex flex-col justify-center gap-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100 text-left">
                            <div>
                              <p className="text-xs text-gray-400">Estampa Cronológica</p>
                              <p className="text-xs font-medium text-gray-700">{formattedDate}</p>
                            </div>
                            <div className="mt-1">
                              <p className="text-xs text-gray-400">Despachador Autorizado</p>
                              <p className="text-xs font-semibold text-gray-800">{item.nombre_completo || 'Farmacéutico'}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end flex-shrink-0">
              <button type="button" onClick={() => setShowDocModal(false)} className="px-6 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg shadow-sm transition">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
