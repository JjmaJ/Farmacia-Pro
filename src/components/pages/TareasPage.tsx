import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { CheckCircle, Circle, Trash2, Plus } from 'lucide-react';
import { ModuleHelp } from '../ui/ModuleHelp';

const TAREAS_HELP = [
  {
    title: 'Gestionar tareas',
    steps: [
      { text: 'Escribe el nombre de la tarea pendiente y opcionalmente una descripción corta.' },
      { text: 'Presiona "Agregar" para registrarla en tu lista.' },
      { text: 'Marca el círculo para alternar entre pendiente y completada.' },
    ],
    example: 'Ejemplo: Escribe "Revisar nevera de vacunas" y presiona Agregar. Al completar la revisión, marca el círculo.',
    exampleFields: [
      { label: 'Tarea', value: 'Revisar nevera de vacunas' },
      { label: 'Estado', value: 'Completada / Pendiente' },
    ]
  },
];

interface Tarea {
  id: string;
  titulo: string;
  descripcion: string;
  completada: boolean;
  fecha_creacion: string;
}

export function TareasPage() {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTarea, setNewTarea] = useState({ titulo: '', descripcion: '' });

  useEffect(() => {
    fetchTareas();
  }, []);

  const fetchTareas = async () => {
    try {
      const data = await apiFetch('/tareas');
      setTareas(data);
    } catch (error) {
      console.error('Error fetching tareas:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTarea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTarea.titulo) return;

    try {
      const data = await apiFetch('/tareas', {
        method: 'POST',
        body: JSON.stringify(newTarea),
      });
      setTareas([data, ...tareas]);
      setNewTarea({ titulo: '', descripcion: '' });
    } catch (error) {
      console.error('Error adding tarea:', error);
    }
  };

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

  const deleteTarea = async (id: string) => {
    try {
      await apiFetch(`/tareas/${id}`, {
        method: 'DELETE',
      });
      setTareas(tareas.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting tarea:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Mis Tareas</h2>
        </div>

        {/* Ayuda contextual del módulo */}
        <ModuleHelp sections={TAREAS_HELP} />
        
        <form onSubmit={addTarea} className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 space-y-4 sm:space-y-0 sm:flex sm:gap-4">
            <input
              type="text"
              placeholder="Nueva tarea..."
              value={newTarea.titulo}
              onChange={(e) => setNewTarea({ ...newTarea, titulo: e.target.value })}
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-lg p-3 border"
              required
            />
            <input
              type="text"
              placeholder="Descripción (opcional)"
              value={newTarea.descripcion}
              onChange={(e) => setNewTarea({ ...newTarea, descripcion: e.target.value })}
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 flex items-center justify-center shadow-md transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Agregar
          </button>
        </form>

        {loading ? (
          <div className="text-center py-4 text-gray-500">Cargando tareas...</div>
        ) : tareas.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg">
            No hay tareas pendientes. ¡Buen trabajo!
          </div>
        ) : (
          <ul className="space-y-3">
            {tareas.map((tarea) => (
              <li
                key={tarea.id}
                className={`flex items-center gap-4 p-4 rounded-lg transition-colors border ${
                  tarea.completada ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200 shadow-sm hover:border-blue-300'
                }`}
              >
                <button
                  onClick={() => toggleTarea(tarea.id, tarea.completada)}
                  className={`flex-shrink-0 transition-colors ${
                    tarea.completada ? 'text-green-500' : 'text-gray-400 hover:text-blue-500'
                  }`}
                >
                  {tarea.completada ? <CheckCircle className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                </button>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-lg font-medium truncate ${
                    tarea.completada ? 'text-gray-500 line-through' : 'text-gray-900'
                  }`}>
                    {tarea.titulo}
                  </p>
                  {tarea.descripcion && (
                    <p className={`text-sm truncate mt-1 ${
                      tarea.completada ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {tarea.descripcion}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => deleteTarea(tarea.id)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Eliminar tarea"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
