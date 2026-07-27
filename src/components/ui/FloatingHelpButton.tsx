import { HelpCircle, Sparkles } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface FloatingHelpButtonProps {
  onClick: () => void;
}

export function FloatingHelpButton({ onClick }: FloatingHelpButtonProps) {
  return (
    <div className="fixed bottom-6 right-6 z-40">
      <Tooltip content="Centro de Ayuda / Manual de Usuario" position="left">
        <button
          onClick={onClick}
          aria-label="Abrir manual de ayuda"
          className="group relative flex items-center justify-center w-14 h-14 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 text-white rounded-full shadow-2xl shadow-blue-500/40 hover:shadow-blue-500/60 hover:scale-110 active:scale-95 transition-all duration-300 ring-4 ring-white/80"
        >
          {/* Animated pulsing background effect */}
          <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-400 to-emerald-400 opacity-40 blur-md group-hover:opacity-75 animate-pulse" />

          {/* Icon with spin effect on hover */}
          <HelpCircle className="w-7 h-7 relative z-10 text-white transition-transform duration-500 group-hover:rotate-12" />

          {/* Sparkle badge */}
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-slate-900 shadow-sm border border-white">
            <Sparkles className="w-2.5 h-2.5" />
          </span>
        </button>
      </Tooltip>
    </div>
  );
}
