import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface PendingApprovalModalProps {
  onClose: () => void;
}

export function PendingApprovalModal({ onClose }: PendingApprovalModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-slate-900 border border-white/10 shadow-2xl rounded-3xl max-w-md w-full p-8 overflow-hidden animate-fade-in">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-32 bg-emerald-500/20 blur-[50px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
          
          <div className="relative">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center border border-white/5 shadow-inner">
              <ShieldAlert className="w-10 h-10 text-emerald-400" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-slate-900">
              <CheckCircle2 className="w-5 h-5 text-slate-900" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-white tracking-tight">
              ¡Registro Exitoso!
            </h3>
            <p className="text-emerald-400 font-medium">
              Cuenta pendiente de aprobación
            </p>
          </div>
          
          <p className="text-slate-400 text-sm leading-relaxed">
            Por medidas de seguridad de MediControl Pro, tu cuenta ha sido creada y se encuentra en estado de revisión. 
            <strong> Debes esperar a que un administrador valide y apruebe tu acceso</strong> para poder ingresar al sistema.
          </p>
          
          <div className="w-full pt-4">
            <Button 
              onClick={onClose}
              className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all"
            >
              Entendido, volver al inicio
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
