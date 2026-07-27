import { useState, useEffect } from 'react';
import { Users, Search, UserPlus, Shield, Edit2, Trash2, Check } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { ModuleHelp } from '../ui/ModuleHelp';

const USERS_HELP = [
  {
    title: 'Aprobar usuario',
    steps: [
      { text: 'Localiza la cuenta con el estado "Pendiente de Aprobación" en la tabla de usuarios.' },
      { text: 'Haz clic en el botón de aprobación (check verde) y asigna el rol correspondiente.' },
      { text: 'El usuario podrá acceder al sistema inmediatamente tras ser aprobado.' },
    ],
    example: 'Ejemplo: Localiza a "dra.peña@ivss.gob.ve", haz clic en Aprobar y selecciona el rol "Pharmacist". El acceso se activa al instante.',
    exampleFields: [
      { label: 'Correo', value: 'dra.peña@ivss.gob.ve' },
      { label: 'Rol', value: 'Pharmacist' },
      { label: 'Estado', value: 'Aprobado' },
    ]
  },
  {
    title: 'Crear usuario',
    steps: [
      { text: 'Presiona "Nuevo Usuario" e ingresa nombre, apellido, correo y contraseña temporal.' },
      { text: 'Selecciona el rol y la sede a la que pertenece el usuario.' },
      { text: 'Presiona "Guardar" para crear la cuenta.' },
    ],
    example: 'Ejemplo: Nuevo usuario: "Carlos López", correo "carlos@ivss.gob.ve", rol "Nurse", sede "Hospital Central".',
    exampleFields: [
      { label: 'Nombre', value: 'Carlos López' },
      { label: 'Rol', value: 'Nurse' },
      { label: 'Sede', value: 'Hospital Central' },
    ]
  },
];

export function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sucursales, setSucursales] = useState<any[]>([]);
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'Nurse',
    department: '',
    password: '',
    can_access_alto_costo: false,
    is_approved: true,
    sucursal_id: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiFetch(`/users/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        await apiFetch('/users', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      console.error('Error in user form:', err);
      alert('Error guardando usuario.');
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const [usersData, sucursalData] = await Promise.all([
        apiFetch('/users'),
        apiFetch('/sucursales')
      ]);
      setUsers(usersData);
      setSucursales(sucursalData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await apiFetch(`/users/${id}/approve`, {
        method: 'PATCH',
      });
      fetchUsers();
    } catch (err) {
      console.error('Error approving user:', err);
      alert('Error al aprobar el usuario.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;
    try {
      await apiFetch(`/users/${id}`, {
        method: 'DELETE',
      });
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Error al eliminar el usuario.');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((u: any) => 
    (u.first_name + ' ' + u.last_name).toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion de Usuarios</h1>
          <p className="text-sm text-gray-500 mt-1">
            Administra los accesos y roles del personal del hospital.
          </p>
        </div>
        <button 
          onClick={() => {
            setFormData({ 
              first_name: '', 
              last_name: '', 
              email: '', 
              role: 'Nurse', 
              department: '', 
              password: '', 
              can_access_alto_costo: false,
              is_approved: true,
              sucursal_id: sucursales.length > 0 ? sucursales[0].id : ''
            });
            setShowModal(true);
            setEditingId(null);
          }}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm font-medium"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Nuevo Usuario
        </button>
      </div>

      {/* Ayuda contextual del módulo */}
      <ModuleHelp sections={USERS_HELP} />

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input required type="text" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                  <input required type="text" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                <input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              {!editingId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña Temporal</label>
                  <input required minLength={6} type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                  <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full px-3 py-2 border rounded-lg bg-white">
                    <option value="Administrator">Administrador</option>
                    <option value="Pharmacist">Farmacéutico/a</option>
                    <option value="Warehouse_Keeper">Almacenista</option>
                    <option value="Doctor">Médico</option>
                    <option value="Nurse">Enfermero/a</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
                  <input type="text" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal Asignada</label>
                <select required value={formData.sucursal_id} onChange={(e) => setFormData({...formData, sucursal_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg bg-white">
                  <option value="">Seleccione una sucursal...</option>
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <input 
                  type="checkbox" 
                  id="can_access_alto_costo" 
                  checked={formData.can_access_alto_costo} 
                  onChange={(e) => setFormData({...formData, can_access_alto_costo: e.target.checked})} 
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="can_access_alto_costo" className="text-sm font-medium text-gray-700">
                  Otorgar acceso al módulo de Alto Costo
                </label>
              </div>
              {editingId && (
                <div className="flex items-center gap-2 mt-2">
                  <input 
                    type="checkbox" 
                    id="is_approved" 
                    checked={formData.is_approved} 
                    onChange={(e) => setFormData({...formData, is_approved: e.target.checked})} 
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="is_approved" className="text-sm font-medium text-gray-700">
                    Usuario aprobado y activo
                  </label>
                </div>
              )}
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Guardar Usuario</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
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
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4">Departamento</th>
                <th className="px-6 py-4">Sucursal</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Cargando usuarios...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-lg font-medium text-gray-900">No se encontraron usuarios</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                          {user.first_name ? user.first_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.first_name} {user.last_name}</p>
                          <p className="text-xs text-gray-500">{user.email || 'Sin correo'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        <Shield className="w-3 h-3 mr-1" />
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{user.department || '-'}</td>
                    <td className="px-6 py-4 text-gray-600 font-medium text-blue-600">{user.sucursal_nombre || 'Sede Principal'}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {user.is_approved ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 w-fit">
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 w-fit animate-pulse">
                            Pendiente
                          </span>
                        )}
                        {user.can_access_alto_costo && (
                           <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 w-fit">
                             Alto Costo
                           </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!user.is_approved && (
                        <button 
                          onClick={() => handleApprove(user.id)}
                          className="p-1.5 text-gray-400 hover:text-green-600 transition mr-2" 
                          title="Aprobar e iniciar acceso"
                        >
                          <Check className="w-4 h-4 font-bold" />
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          setFormData({
                            first_name: user.first_name,
                            last_name: user.last_name,
                            email: user.email,
                            role: user.role,
                            department: user.department,
                            password: '',
                            can_access_alto_costo: user.can_access_alto_costo || false,
                            is_approved: user.is_approved !== false,
                            sucursal_id: user.sucursal_id || ''
                          });
                          setEditingId(user.id);
                          setShowModal(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 transition" 
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(user.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition" 
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}