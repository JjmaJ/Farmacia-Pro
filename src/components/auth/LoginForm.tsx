import { useState, FormEvent } from 'react';
import { AtSign, Fingerprint, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Captcha } from '../ui/Captcha';
import { useAuth } from '../../contexts/AuthContext';
import { PendingApprovalModal } from './PendingApprovalModal';

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onSwitchToReset: () => void;
}

export function LoginForm({ onSwitchToRegister, onSwitchToReset }: LoginFormProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaValue, setCaptchaValue] = useState('');
  const [isCaptchaValid, setIsCaptchaValid] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [isWelcoming, setIsWelcoming] = useState(false);
  const [fadeOutForm, setFadeOutForm] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isCaptchaValid) {
      setError('Por favor, resuelve la verificación de seguridad correctamente.');
      return;
    }

    setLoading(true);

    try {
      await signIn(email, password, async () => {
        // Trigger welcome sequence before completing auth route switch
        setFadeOutForm(true);
        await new Promise((resolve) => setTimeout(resolve, 300));
        setIsWelcoming(true);
        await new Promise((resolve) => setTimeout(resolve, 2500));
      });
    } catch (err: any) {
      if (err.message === 'User_Pending_Approval') {
        setShowPendingModal(true);
        setFadeOutForm(false);
        setIsWelcoming(false);
        setLoading(false);
        return;
      }
      setError(err.message || 'Error al iniciar sesión. Verifica tus credenciales.');
      setFadeOutForm(false);
      setIsWelcoming(false);
      setLoading(false);
    }
  };

  if (isWelcoming) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-6 text-center animate-fade-in">
        {/* Elegant Animated Ring Spinner */}
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500/10" />
          <div className="absolute inset-0 rounded-full border-4 border-t-emerald-400 border-r-cyan-400 animate-spin" />
          <div className="absolute inset-2 rounded-full border-4 border-b-blue-400 border-l-purple-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
        
        <div className="space-y-3">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-300 to-blue-400 tracking-tight animate-pulse">
            ¡Bienvenido, Admin System!
          </h2>
          <p className="text-slate-300 font-semibold text-base animate-pulse">
            Iniciando entorno seguro...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
    {showPendingModal && (
      <PendingApprovalModal onClose={() => setShowPendingModal(false)} />
    )}
    <form 
      onSubmit={handleSubmit} 
      autoComplete="off"
      className={`space-y-6 transition-all duration-300 ${fadeOutForm ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}
    >
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-extrabold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-200">
          Acceder a tu cuenta
        </h2>
        <p className="text-slate-400 mt-2 text-sm font-medium">Ingresa tus credenciales para continuar</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 backdrop-blur-sm p-4 rounded-xl shadow-md animate-fade-in">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm text-red-200 font-medium">{error}</p>
          </div>
        </div>
      )}

      <div className="space-y-5">
        <div className="relative">
          <Input
            type="email"
            label="Correo Electrónico"
            labelClassName="text-white/75 font-semibold text-xs tracking-wider uppercase mb-2"
            placeholder="usuario@hospital.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<AtSign className="h-5 w-5 text-emerald-400 group-hover:text-emerald-600 group-focus-within:text-emerald-600 transition-transform duration-200 group-hover:scale-110" />}
            required
            disabled={loading}
            variant="glass"
            autoComplete="off"
          />
        </div>

        <div className="space-y-1 relative">
          <div className="flex justify-between items-center">
            <label className="block text-xs font-semibold text-white/75 tracking-wider uppercase mb-2">Contraseña</label>
            <button
              type="button"
              onClick={onSwitchToReset}
              className="text-xs text-white/40 hover:text-white transition-colors duration-200 font-medium mb-2"
              disabled={loading}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Fingerprint className="h-5 w-5 text-blue-400 group-hover:text-blue-600 group-focus-within:text-blue-600 transition-transform duration-200 group-hover:scale-110" />}
            rightIcon={
              <button
                type="button"
                onMouseDown={() => setShowPassword(true)}
                onMouseUp={() => setShowPassword(false)}
                onMouseLeave={() => setShowPassword(false)}
                onTouchStart={() => setShowPassword(true)}
                onTouchEnd={() => setShowPassword(false)}
                className="focus:outline-none select-none cursor-pointer"
                tabIndex={-1}
                title="Mantén pulsado para ver la contraseña"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-blue-300 transition-colors" />
                ) : (
                  <Eye className="h-5 w-5 text-slate-400 hover:text-blue-300 transition-colors" />
                )}
              </button>
            }
            required
            disabled={loading}
            variant="glass"
            autoComplete="new-password"
          />
        </div>
      </div>

      <div className="pt-2">
        <div className="p-1 bg-white/[0.02] rounded-xl shadow-inner border border-white/10">
          <Captcha
            value={captchaValue}
            onChange={setCaptchaValue}
            onVerify={setIsCaptchaValid}
          />
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full flex justify-center items-center gap-2 group relative overflow-hidden bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-700 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all duration-300 transform hover:-translate-y-0.5 border border-white/10" 
        size="lg" 
        isLoading={loading}
      >
        <div className="absolute inset-0 bg-white/10 group-hover:translate-x-full transition-transform duration-500 ease-out -skew-x-12 -translate-x-full" />
        <span className="relative font-bold text-base">Iniciar Sesión</span>
        <ArrowRight className="w-5 h-5 relative transition-transform group-hover:translate-x-1" />
      </Button>

      <div className="text-center text-sm text-slate-400 pt-6 border-t border-white/5 mt-6 space-y-3">
        <p className="text-xs text-white/35">¿Aún no tienes acceso?</p>
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="w-full py-2.5 px-4 rounded-lg bg-white/[0.02] hover:bg-white/[0.08] text-white/60 hover:text-white border border-white/10 hover:border-white/20 transition-all duration-300 font-semibold text-sm shadow-sm"
          disabled={loading}
        >
          Crear cuenta nueva
        </button>
      </div>
    </form>
    </>
  );
}
