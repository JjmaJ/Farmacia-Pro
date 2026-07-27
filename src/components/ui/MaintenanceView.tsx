import { Wrench, ShieldCheck, Clock, RefreshCw, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface MaintenanceViewProps {
  onToggleMaintenance: () => void;
}

export function MaintenanceView({ onToggleMaintenance }: MaintenanceViewProps) {
  const { profile, isAdmin, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Animated Gradient Orbs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <div className="max-w-2xl w-full text-center relative z-10 space-y-8">
        
        {/* Animated Icon & Badge Header */}
        <div className="relative inline-block">
          <div className="w-28 h-28 mx-auto bg-gradient-to-br from-slate-900 via-blue-900/60 to-slate-900 rounded-3xl border border-blue-500/30 flex items-center justify-center shadow-2xl shadow-blue-500/20 relative group">
            {/* Outer Spinning Ring */}
            <div className="absolute inset-0 rounded-3xl border-2 border-dashed border-blue-400/40 animate-spin" style={{ animationDuration: '15s' }} />
            
            {/* Maintenance Wrench & Gear Icon */}
            <div className="relative flex items-center justify-center">
              <Wrench className="w-12 h-12 text-blue-400 animate-bounce" style={{ animationDuration: '3s' }} />
            </div>

            {/* Live Indicator Pulse */}
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border-2 border-slate-950" />
            </span>
          </div>

          {/* Status Badge */}
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
            <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
            <span>Mantenimiento Programado Activo</span>
          </div>
        </div>

        {/* Title and Messaging */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
            MediControl Pro en Mantenimiento
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
            Estamos aplicando optimizaciones preventivas y mejoras de seguridad en el sistema para garantizar la máxima estabilidad del inventario hospitalario. El servicio se restablecerá a la brevedad, hasta nuevo aviso.
          </p>
        </div>

        {/* ECG Animated Graphic */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 max-w-md mx-auto backdrop-blur-xl shadow-inner">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-blue-400" /> Estado: Mantenimiento en curso</span>
            <span className="text-emerald-400 font-bold">Hasta nuevo aviso</span>
          </div>
          
          <div className="h-10 w-full overflow-hidden flex items-center justify-center">
            <svg viewBox="0 0 320 60" className="w-full h-10" xmlns="http://www.w3.org/2000/svg">
              <polyline
                points="0,30 40,30 55,10 65,50 75,5 90,55 100,30 160,30 175,10 185,50 195,5 210,55 220,30 280,30 295,10 305,50 315,5 320,30"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: 600,
                  strokeDashoffset: 600,
                  animation: 'ecgDraw 2.4s ease-in-out infinite'
                }}
              />
            </svg>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 text-left">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Base de datos segura</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Respaldos al día</span>
            </div>
          </div>
        </div>

        {/* Special Admin Controls Banner */}
        {isAdmin ? (
          <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-slate-900/60 border border-blue-500/40 rounded-2xl p-5 text-left space-y-3 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-300 font-bold text-sm">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                <span>Acceso Especial de Administrador Maestro</span>
              </div>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold border border-blue-400/30">
                Rol: {profile?.role || 'Administrator'}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Como administrador, puedes operar el sistema sin interferencias o desactivar el modo mantenimiento cuando finalices.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                onClick={onToggleMaintenance}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Desactivar Mantenimiento</span>
              </button>

              <button
                onClick={() => {
                  sessionStorage.setItem('medicontrol_bypass_maintenance', 'true');
                  window.dispatchEvent(new Event('maintenanceModeChanged'));
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <span>Usar Sistema (Bypass Admin)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-4">
            <button
              onClick={() => signOut()}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold border border-slate-800 transition"
            >
              Cerrar Sesión
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
