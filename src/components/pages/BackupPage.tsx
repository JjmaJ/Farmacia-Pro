import { useState, useRef } from 'react';
import { Download, Upload, Database, CheckCircle, AlertTriangle, FileJson, FileSpreadsheet } from 'lucide-react';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { backupService, BackupData } from '../../services/backupService';
import { ModuleHelp } from '../ui/ModuleHelp';

const BACKUP_HELP = [
  {
    title: 'Generar respaldo',
    steps: [
      { text: 'Presiona "Exportar Todo (JSON)" para descargar una copia completa de todos los datos.' },
      { text: 'Para exportar solo una tabla específica (ej. medicamentos), usa los botones CSV individuales.' },
      { text: 'Guarda el archivo descargado en un lugar seguro fuera del sistema.' },
    ],
    example: 'Ejemplo: Haz clic en "Exportar Todo (JSON)" para obtener el archivo "backup_medicontrol_2026-07-21.json" con todos los datos.',
    exampleFields: [
      { label: 'Formato', value: 'JSON completo o CSV por tabla' },
      { label: 'Archivo', value: 'backup_medicontrol_YYYY-MM-DD.json' },
      { label: 'Recomendación', value: 'Respaldar al finalizar cada jornada' },
    ]
  },
];

export function BackupPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportJSONModal, setShowExportJSONModal] = useState(false);
  const [showExportCSVModal, setShowExportCSVModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJSONClick = () => {
    setShowExportJSONModal(true);
  };

  const handleExportJSON = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const backup = await backupService.exportData();
      backupService.downloadBackup(backup);
      setMessage({ type: 'success', text: 'Respaldo exportado exitosamente' });
      setShowExportJSONModal(false);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSVClick = (tableName: string) => {
    setSelectedTable(tableName);
    setShowExportCSVModal(true);
  };

  const handleExportCSV = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const csv = await backupService.exportToCSV(selectedTable);
      if (csv) {
        backupService.downloadCSV(csv, `${selectedTable}-${new Date().toISOString().split('T')[0]}.csv`);
        setMessage({ type: 'success', text: `Tabla ${selectedTable} exportada exitosamente` });
        setShowExportCSVModal(false);
      } else {
        setMessage({ type: 'error', text: 'No hay datos para exportar' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/json') {
        setMessage({ type: 'error', text: 'Solo se permiten archivos JSON' });
        return;
      }
      setSelectedFile(file);
      setShowImportModal(true);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setMessage(null);

    try {
      const text = await selectedFile.text();
      const backup: BackupData = JSON.parse(text);

      if (!backup.version || !backup.data) {
        throw new Error('Formato de respaldo invalido');
      }

      await backupService.importData(backup);
      setMessage({ type: 'success', text: 'Datos importados exitosamente' });
      setShowImportModal(false);
      setSelectedFile(null);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const tables = [
    { name: 'medications', label: 'Medicamentos' },
    { name: 'inventory_batches', label: 'Lotes de Inventario' },
    { name: 'inventory_movements', label: 'Movimientos' },
    { name: 'user_profiles', label: 'Perfiles de Usuario' }
  ];

  return (
    <div className="space-y-6">

      {/* Ayuda contextual del módulo */}
      <ModuleHelp sections={BACKUP_HELP} />

      {message && (
        <div className={`p-4 rounded-lg border-l-4 ${
          message.type === 'success'
            ? 'bg-green-50 border-green-500'
            : 'bg-red-50 border-red-500'
        }`}>
          <div className="flex items-start">
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            )}
            <p className={`text-sm ${message.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
              {message.text}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Download className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Exportar Respaldo</h3>
              <p className="text-sm text-gray-600">Descarga una copia completa de todos los datos</p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleExportJSONClick}
              disabled={loading}
              className="w-full justify-center"
              variant="primary"
            >
              <FileJson className="h-5 w-5 mr-2" />
              Exportar Todo (JSON)
            </Button>

            <div className="pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-600 mb-2 font-medium">Exportar tablas individuales (CSV):</p>
              <div className="space-y-2">
                {tables.map(table => (
                  <button
                    key={table.name}
                    onClick={() => handleExportCSVClick(table.name)}
                    disabled={loading}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <span className="text-gray-700">{table.label}</span>
                    <FileSpreadsheet className="h-4 w-4 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <Upload className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Importar Respaldo</h3>
              <p className="text-sm text-gray-600">Restaura datos desde un archivo de respaldo</p>
            </div>
          </div>

          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />

            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full justify-center"
              variant="secondary"
            >
              <Upload className="h-5 w-5 mr-2" />
              Seleccionar Archivo JSON
            </Button>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Advertencia</p>
                  <p>La importacion sobrescribira los datos existentes. Asegurate de tener un respaldo actual antes de continuar.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-emerald-50 rounded-xl border border-blue-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
            <Database className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Recomendaciones de Respaldo</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Realiza respaldos completos semanalmente</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Almacena los respaldos en multiples ubicaciones seguras</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Verifica la integridad de los respaldos periodicamente</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Mantiene al menos 3 copias de respaldo historicas</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showExportJSONModal}
        onClose={() => setShowExportJSONModal(false)}
        onConfirm={handleExportJSON}
        title="¿Exportar Respaldo Completo?"
        message="Se creara un archivo JSON con todos los datos del sistema. ¿Deseas continuar?"
        type="info"
        confirmText="Si, Exportar"
        cancelText="No, Cancelar"
      />

      <ConfirmDialog
        isOpen={showExportCSVModal}
        onClose={() => {
          setShowExportCSVModal(false);
          setSelectedTable('');
        }}
        onConfirm={handleExportCSV}
        title="¿Exportar Tabla en CSV?"
        message={`Se exportara la tabla ${tables.find(t => t.name === selectedTable)?.label} en formato CSV. ¿Deseas continuar?`}
        type="info"
        confirmText="Si, Exportar"
        cancelText="No, Cancelar"
      />

      <ConfirmDialog
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setSelectedFile(null);
        }}
        onConfirm={handleImport}
        title="¿Importar Respaldo?"
        message={`¿Estas seguro de importar "${selectedFile?.name}"? Esta accion SOBRESCRIBIRA los datos existentes y NO SE PUEDE DESHACER. Asegurate de tener un respaldo antes de continuar.`}
        type="danger"
        confirmText="Si, Importar"
        cancelText="No, Cancelar"
      />
    </div>
  );
}
