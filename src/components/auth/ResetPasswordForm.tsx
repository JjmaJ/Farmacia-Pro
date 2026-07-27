import { useState, FormEvent } from 'react';
import { Send, AlertCircle, CheckCircle, ArrowLeft, UnlockKeyhole, Lock, Eye, EyeOff, ShieldCheck, Hash } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';

interface ResetPasswordFormProps {
  onBack: () => void;
}

// Client-side password validator (mirrors backend)
function getPasswordErrors(password: string): { hasLength: boolean; hasNumber: boolean; hasSpecial: boolean } {
  return {
    hasLength: password.length >= 6,
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>\-_=+]/.test(password),
  };
}

export function ResetPasswordForm({ onBack }: ResetPasswordFormProps) {
  const { resetPassword, updatePassword } = useAuth();

  // Phase 1: enter email and request code
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<'request' | 'verify'>('request');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Phase 2: enter code + new password
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  const pwChecks = getPasswordErrors(password);
  const passwordValid = pwChecks.hasLength && pwChecks.hasNumber && pwChecks.hasSpecial;

  // Phase 1: request the code
  const handleRequestCode = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetPassword(email);
      setPhase('verify');
    } catch (err: any) {
      setError(err.message || 'Error al enviar el correo de recuperación.');
    } finally {
      setLoading(false);
    }
  };

  // Phase 2: verify code + update password
  const handleVerifyAndUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (code.trim().length !== 6) {
      setError('El código de verificación debe tener 6 dígitos.');
      return;
    }
    if (!passwordValid) {
      setError('La contraseña no cumple los requisitos de seguridad.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(email, code.trim(), password);
      setSuccess(true);
      setTimeout(() => {
        onBack();
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  // ── PHASE 1 VIEW ──────────────────────────────────────────────────────────
  if (phase === 'request') {
    return (
      <form onSubmit={handleRequestCode} className="space-y-5 animate-fade-in">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center text-xs text-white/50 hover:text-white transition-colors mb-6 group font-semibold uppercase tracking-wider"
          disabled={loading}
        >
          <ArrowLeft className="h-4 w-4 mr-1 transition-transform group-hover:-translate-x-1" />
          Volver al inicio
        </button>

        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center mb-4">
            <div className="absolute inset-0 bg-purple-400 rounded-full blur-xl opacity-20 animate-pulse"></div>
            <div className="relative w-16 h-16 bg-gradient-to-tr from-purple-500 to-indigo-500 rounded-[20px] shadow-xl shadow-purple-500/20 flex items-center justify-center -rotate-3 hover:rotate-0 transition-transform">
              <UnlockKeyhole className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-200">
            Recuperar Acceso
          </h2>
          <p className="text-slate-400 mt-2 font-medium">
            Te enviaremos un código de 6 dígitos a tu correo
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 backdrop-blur-sm p-4 rounded-xl shadow-md animate-fade-in">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-sm text-red-200 font-medium">{error}</p>
            </div>
          </div>
        )}

        <div className="relative">
          <Input
            type="email"
            label="Correo Electrónico"
            labelClassName="text-white/75 font-semibold text-xs tracking-wider uppercase mb-2"
            placeholder="usuario@hospital.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Send className="h-5 w-5 text-purple-400 group-hover:text-purple-600 group-focus-within:text-purple-600 transition-transform duration-200 group-hover:-translate-y-1 group-hover:translate-x-1" />}
            required
            disabled={loading}
            variant="glass"
          />
        </div>

        <Button
          type="submit"
          className="w-full flex justify-center items-center gap-2 group relative overflow-hidden bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/20 transition-all duration-300 transform hover:-translate-y-0.5 mt-4 border border-white/10"
          size="lg"
          isLoading={loading}
        >
          <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 ease-out -skew-x-12 -translate-x-full" />
          <span className="relative font-bold text-base">Enviar Código de Verificación</span>
        </Button>
      </form>
    );
  }

  // ── PHASE 2 VIEW ──────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleVerifyAndUpdate} className="space-y-5 animate-fade-in">
      <button
        type="button"
        onClick={() => { setPhase('request'); setError(''); setCode(''); setPassword(''); setConfirmPassword(''); }}
        className="flex items-center text-xs text-white/50 hover:text-white transition-colors mb-4 group font-semibold uppercase tracking-wider"
        disabled={loading || success}
      >
        <ArrowLeft className="h-4 w-4 mr-1 transition-transform group-hover:-translate-x-1" />
        Cambiar correo
      </button>

      <div className="text-center mb-6">
        <div className="relative inline-flex items-center justify-center mb-4">
          <div className="absolute inset-0 bg-blue-400 rounded-full blur-xl opacity-20 animate-pulse"></div>
          <div className="relative w-16 h-16 bg-gradient-to-tr from-blue-500 to-emerald-500 rounded-[20px] shadow-xl shadow-blue-500/20 flex items-center justify-center rotate-3 hover:rotate-0 transition-transform">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-200">
          Verifica tu Código
        </h2>
        <p className="text-slate-400 mt-1 text-sm font-medium">
          Código enviado a <span className="text-emerald-400 font-bold">{email}</span>
        </p>
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
        <div className="bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm p-4 rounded-xl shadow-md animate-fade-in">
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 text-emerald-400 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-sm text-emerald-200">
              <p className="font-bold text-white">¡Contraseña actualizada!</p>
              <p className="mt-1 font-medium text-emerald-300">Redirigiendo al inicio de sesión...</p>
            </div>
          </div>
        </div>
      )}

      {/* 6-digit code input */}
      <div className="relative">
        <Input
          type="text"
          label="Código de Verificación (6 dígitos)"
          labelClassName="text-white/75 font-semibold text-xs tracking-wider uppercase mb-2"
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          leftIcon={<Hash className="h-5 w-5 text-indigo-400 group-hover:text-indigo-600 group-focus-within:text-indigo-600 transition-transform duration-200" />}
          required
          disabled={loading || success}
          maxLength={6}
          inputMode="numeric"
          variant="glass"
        />
        <div className="flex justify-end mt-1">
          <button
            type="button"
            onClick={handleRequestCode as any}
            className="text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium"
            disabled={loading || success}
          >
            ¿No llegó el código? Reenviar
          </button>
        </div>
      </div>

      {/* New password */}
      <div className="relative">
        <Input
          type={showPassword ? 'text' : 'password'}
          label="Nueva Contraseña"
          labelClassName="text-white/75 font-semibold text-xs tracking-wider uppercase mb-2"
          placeholder="Mínimo 6 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock className="h-5 w-5 text-blue-400 group-hover:text-blue-600 group-focus-within:text-blue-600 transition-transform duration-200" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="focus:outline-none"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-slate-400 hover:text-white transition-colors" />
              ) : (
                <Eye className="h-5 w-5 text-slate-400 hover:text-white transition-colors" />
              )}
            </button>
          }
          required
          disabled={loading || success}
          variant="glass"
        />
      </div>

      {/* Password strength indicators */}
      {password.length > 0 && (
        <div className="bg-white/5 rounded-xl p-3 border border-white/10 space-y-1.5 animate-fade-in">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Requisitos de contraseña</p>
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

      {/* Confirm password */}
      <div className="relative">
        <Input
          type={showConfirm ? 'text' : 'password'}
          label="Confirmar Contraseña"
          labelClassName="text-white/75 font-semibold text-xs tracking-wider uppercase mb-2"
          placeholder="Repite la contraseña"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          leftIcon={<Lock className="h-5 w-5 text-blue-400 group-hover:text-blue-600 group-focus-within:text-blue-600 transition-transform duration-200" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="focus:outline-none"
              tabIndex={-1}
            >
              {showConfirm ? (
                <EyeOff className="h-5 w-5 text-slate-400 hover:text-white transition-colors" />
              ) : (
                <Eye className="h-5 w-5 text-slate-400 hover:text-white transition-colors" />
              )}
            </button>
          }
          required
          disabled={loading || success}
          variant="glass"
        />
        {confirmPassword.length > 0 && (
          <p className={`text-xs mt-1 font-medium ${password === confirmPassword ? 'text-emerald-400' : 'text-red-400/80'}`}>
            {password === confirmPassword ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full flex justify-center items-center gap-2 group relative overflow-hidden bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-700 hover:to-emerald-600 text-white shadow-lg shadow-blue-500/20 transition-all duration-300 transform hover:-translate-y-0.5 mt-2 border border-white/10"
        size="lg"
        isLoading={loading}
        disabled={success}
      >
        <div className="absolute inset-0 bg-white/10 group-hover:translate-x-full transition-transform duration-500 ease-out -skew-x-12 -translate-x-full" />
        <span className="relative font-bold text-base">Actualizar Contraseña</span>
      </Button>
    </form>
  );
}
