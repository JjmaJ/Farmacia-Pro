import { useState, FormEvent } from 'react';
import { AtSign, KeyRound, BadgeCheck, ShieldCheck, AlertCircle, ArrowRight, Sparkles, Eye, EyeOff } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { PendingApprovalModal } from './PendingApprovalModal';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

function getPasswordErrors(password: string) {
  return {
    hasLength: password.length >= 6,
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>\-_=+]/.test(password),
  };
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const pwChecks = getPasswordErrors(password);
  const passwordValid = pwChecks.hasLength && pwChecks.hasNumber && pwChecks.hasSpecial;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!passwordValid) {
      if (!pwChecks.hasLength) setError('La contraseña debe tener al menos 6 caracteres.');
      else if (!pwChecks.hasNumber) setError('La contraseña debe contener al menos un número.');
      else setError('La contraseña debe contener al menos un carácter especial (!@#$%^&* etc.).');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password, fullName);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error al crear la cuenta. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
      <div className="text-center mb-8">
        <div className="relative inline-flex items-center justify-center mb-4">
          <div className="absolute inset-0 bg-emerald-400 rounded-full blur-xl opacity-20 animate-pulse"></div>
          <div className="relative w-16 h-16 bg-gradient-to-tr from-emerald-500 to-cyan-400 rounded-[20px] shadow-xl shadow-emerald-500/20 flex items-center justify-center rotate-3 hover:rotate-0 transition-transform">
            <Sparkles className="w-8 h-8 text-white animate-float" />
          </div>
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-200">
          Nueva Cuenta
        </h2>
        <p className="text-slate-400 mt-2 font-medium">Registro de Personal Autorizado</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 backdrop-blur-sm p-4 rounded-xl shadow-md animate-fade-in">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm text-red-200 font-medium">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <PendingApprovalModal onClose={() => {
          setSuccess(false);
          onSwitchToLogin();
        }} />
      )}

      <div className="space-y-4">
        <div className="relative">
          <Input
            type="text"
            label="Nombre Completo"
            labelClassName="text-white/75 font-semibold text-xs tracking-wider uppercase mb-2"
            placeholder="Juan Pérez"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            leftIcon={<BadgeCheck className="h-5 w-5 text-blue-400 group-hover:text-blue-600 group-focus-within:text-blue-600 transition-transform duration-200 group-hover:scale-110" />}
            required
            disabled={loading || success}
            variant="glass"
          />
        </div>

        <div className="relative">
          <Input
            type="email"
            label="Correo Electrónico"
            labelClassName="text-white/75 font-semibold text-xs tracking-wider uppercase mb-2"
            placeholder="usuario@hospital.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<AtSign className="h-5 w-5 text-indigo-400 group-hover:text-indigo-600 group-focus-within:text-indigo-600 transition-transform duration-200 group-hover:scale-110" />}
            required
            disabled={loading || success}
            variant="glass"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              label="Contraseña"
              labelClassName="text-white/75 font-semibold text-xs tracking-wider uppercase mb-2"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<KeyRound className="h-5 w-5 text-emerald-400 group-hover:text-emerald-600 group-focus-within:text-emerald-600 transition-transform duration-200 group-hover:scale-110" />}
              rightIcon={
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="focus:outline-none" tabIndex={-1}>
                  {showPassword ? <EyeOff className="h-4 w-4 text-slate-400 hover:text-white transition-colors" /> : <Eye className="h-4 w-4 text-slate-400 hover:text-white transition-colors" />}
                </button>
              }
              required
              disabled={loading || success}
              variant="glass"
            />
          </div>

          <div className="relative">
            <Input
              type={showConfirm ? 'text' : 'password'}
              label="Confirmar"
              labelClassName="text-white/75 font-semibold text-xs tracking-wider uppercase mb-2"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              leftIcon={<ShieldCheck className="h-5 w-5 text-cyan-400 group-hover:text-cyan-600 group-focus-within:text-cyan-600 transition-transform duration-200 group-hover:scale-110" />}
              rightIcon={
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="focus:outline-none" tabIndex={-1}>
                  {showConfirm ? <EyeOff className="h-4 w-4 text-slate-400 hover:text-white transition-colors" /> : <Eye className="h-4 w-4 text-slate-400 hover:text-white transition-colors" />}
                </button>
              }
              required
              disabled={loading || success}
              variant="glass"
            />
            {confirmPassword.length > 0 && (
              <p className={`text-xs mt-1 font-medium ${password === confirmPassword ? 'text-emerald-400' : 'text-red-400/80'}`}>
                {password === confirmPassword ? '✓ Coinciden' : '✗ No coinciden'}
              </p>
            )}
          </div>
        </div>

        {/* Password strength indicators */}
        {password.length > 0 && (
          <div className="bg-white/5 rounded-xl p-3 border border-white/10 space-y-1.5 animate-fade-in">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Requisitos de contraseña</p>
            <div className={`flex items-center gap-2 text-xs font-medium ${pwChecks.hasLength ? 'text-emerald-400' : 'text-red-400/70'}`}>
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${pwChecks.hasLength ? 'bg-emerald-400' : 'bg-red-400/60'}`} />
              Al menos 6 caracteres
            </div>
            <div className={`flex items-center gap-2 text-xs font-medium ${pwChecks.hasNumber ? 'text-emerald-400' : 'text-red-400/70'}`}>
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${pwChecks.hasNumber ? 'bg-emerald-400' : 'bg-red-400/60'}`} />
              Al menos un número (0-9)
            </div>
            <div className={`flex items-center gap-2 text-xs font-medium ${pwChecks.hasSpecial ? 'text-emerald-400' : 'text-red-400/70'}`}>
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${pwChecks.hasSpecial ? 'bg-emerald-400' : 'bg-red-400/60'}`} />
              Al menos un carácter especial (!@#$%^&*)
            </div>
          </div>
        )}
      </div>

      <Button 
        type="submit" 
        className="w-full flex justify-center items-center gap-2 group relative overflow-hidden bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white shadow-lg shadow-cyan-500/20 transition-all duration-300 transform hover:-translate-y-0.5 mt-2 border border-white/10" 
        size="lg" 
        isLoading={loading} 
        disabled={success}
      >
        <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 ease-out -skew-x-12 -translate-x-full" />
        <span className="relative font-bold text-base">Crear Cuenta</span>
        <ArrowRight className="w-5 h-5 relative transition-transform group-hover:translate-x-1" />
      </Button>

      <div className="text-center text-sm text-slate-400 pt-6 border-t border-white/5 mt-6 space-y-3">
        <p className="text-xs text-white/35">¿Ya tienes una cuenta?</p>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="w-full py-2.5 px-4 rounded-lg bg-white/[0.02] hover:bg-white/[0.08] text-white/60 hover:text-white border border-white/10 hover:border-white/20 transition-all duration-300 font-semibold text-sm shadow-sm"
          disabled={loading || success}
        >
          Iniciar Sesión
        </button>
      </div>
    </form>
  );
}
