import { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ResetPasswordForm } from './ResetPasswordForm';
import { Shield } from 'lucide-react';

type AuthView = 'login' | 'register' | 'reset';

export function AuthPage() {
  const [view, setView] = useState<AuthView>('login');

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col lg:flex-row relative overflow-hidden selection:bg-emerald-500/30">
      {/* Ambient background glows for the entire page */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px] mix-blend-screen animate-pulse duration-10000" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] mix-blend-screen animate-pulse duration-7000" />
      </div>

      {/* LEFT SIDE: Promotional / Institutional Poster (Visible on LG screens and up) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900 border-r border-white/5 flex-col justify-between p-12">
        {/* Background Image of the poster */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-[10000ms] hover:scale-105"
          style={{ 
            backgroundImage: "url('/assets/images/ivss-login-bg.jpg')",
          }}
        />
        {/* Gradient overlay for readability and polish */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-slate-950/50 z-10" />

        {/* Left Side Content */}
        <div className="relative z-20 flex flex-col h-full">
          {/* Logo / Header in left panel */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-xl rounded-xl flex items-center justify-center border border-white/20 shadow-[0_0_20px_rgba(52,211,153,0.15)]">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
              MediControl Pro
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Authentication Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 overflow-y-auto relative z-10 min-h-screen">
        {/* Mobile background image (hidden on desktop) */}
        <div className="absolute inset-0 z-0 lg:hidden block">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/assets/images/ivss-login-bg.jpg')" }}
          />
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[2px]" />
        </div>

        <div className="w-full max-w-md flex flex-col items-center relative z-10 py-6">
          {/* Logo only visible on mobile */}
          <div className="flex items-center gap-3 mb-8 lg:hidden animate-fade-in">
            <div className="w-10 h-10 bg-white/5 backdrop-blur-xl rounded-xl flex items-center justify-center border border-white/10 shadow-[0_0_20px_rgba(52,211,153,0.1)]">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              MediControl Pro
            </span>
          </div>

          {/* Form container - Glassmorphic */}
          <div className="w-full bg-slate-950/45 backdrop-blur-[16px] rounded-[2rem] p-8 sm:p-10 border border-white/[0.08] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.65),0_0_40px_rgba(52,211,153,0.05)] relative">
            <div className="animate-fade-in">
              {view === 'login' && (
                <LoginForm
                  onSwitchToRegister={() => setView('register')}
                  onSwitchToReset={() => setView('reset')}
                />
              )}
              {view === 'register' && (
                <RegisterForm onSwitchToLogin={() => setView('login')} />
              )}
              {view === 'reset' && (
                <ResetPasswordForm onBack={() => setView('login')} />
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="text-xs text-slate-500 font-medium text-center mt-8">
            &copy; {new Date().getFullYear()} MediControl Pro. Diseñado para la excelencia médica.
          </div>
        </div>
      </div>
    </div>
  );
}
