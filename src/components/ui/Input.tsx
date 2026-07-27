import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelClassName?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'glass';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, labelClassName = '', error, leftIcon, rightIcon, variant = 'default', ...props }, ref) => {
    return (
      <div className="w-full group">
        {label && (
          <label className={`block text-sm font-medium text-gray-700 mb-1.5 ${labelClassName}`}>
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors duration-200 ${
              variant === 'glass'
                ? 'text-white/40 group-focus-within:text-slate-800 group-hover:text-slate-650'
                : 'text-gray-400'
            }`}>
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              block w-full rounded-lg border transition-all duration-300
              ${leftIcon ? 'pl-10' : 'pl-4'} ${rightIcon ? 'pr-10' : 'pr-4'} py-2.5
              ${variant === 'glass'
                ? `bg-white/[0.04] border-white/10 text-white placeholder-white/20
                   hover:bg-slate-100 hover:text-slate-900 hover:placeholder-slate-400 hover:border-emerald-500 hover:shadow-[0_0_12px_rgba(52,211,153,0.3)]
                   focus:bg-white focus:text-slate-900 focus:placeholder-slate-550 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/35 focus:shadow-[0_0_15px_rgba(52,211,153,0.5)]`
                : error
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500 focus:ring-2 focus:ring-offset-0'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-2 focus:ring-offset-0'
              }
              focus:outline-none
              disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
              ${className}
            `}
            {...props}
          />
          {rightIcon && (
            <div className={`absolute inset-y-0 right-0 pr-3 flex items-center transition-colors duration-200 ${
              variant === 'glass'
                ? 'text-white/40 group-focus-within:text-slate-700 group-hover:text-slate-600'
                : 'text-gray-400'
            }`}>
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
