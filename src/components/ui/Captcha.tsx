import { useState, useEffect } from 'react';
import { Input } from './Input';
import { RefreshCw } from 'lucide-react';

interface CaptchaProps {
  onVerify: (isValid: boolean) => void;
  value: string;
  onChange: (value: string) => void;
}

export function Captcha({ onVerify, value, onChange }: CaptchaProps) {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [operator, setOperator] = useState('+');

  const generateCaptcha = () => {
    const n1 = Math.floor(Math.random() * 10) + 1;
    const n2 = Math.floor(Math.random() * 10) + 1;
    const ops = ['+', '-', '×'];
    const op = ops[Math.floor(Math.random() * ops.length)];

    setNum1(n1);
    setNum2(n2);
    setOperator(op);
    onChange('');
    onVerify(false);
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  useEffect(() => {
    if (value) {
      const userAnswer = parseInt(value);
      let correctAnswer = 0;

      switch (operator) {
        case '+':
          correctAnswer = num1 + num2;
          break;
        case '-':
          correctAnswer = num1 - num2;
          break;
        case '×':
          correctAnswer = num1 * num2;
          break;
      }

      onVerify(userAnswer === correctAnswer);
    } else {
      onVerify(false);
    }
  }, [value, num1, num2, operator]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300">
        Verificación de seguridad
      </label>
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-3 bg-slate-950/40 px-4 py-2.5 rounded-lg border border-white/10 shadow-inner">
          <span className="text-xl font-bold text-white tracking-wider font-mono">
            {num1} {operator} {num2} =
          </span>
          <Input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="?"
            variant="glass"
            className="w-20 text-center text-lg font-bold"
            required
          />
        </div>
        <button
          type="button"
          onClick={generateCaptcha}
          className="p-2.5 text-slate-400 hover:text-emerald-400 hover:bg-white/5 rounded-lg transition-colors border border-white/5"
          title="Generar nuevo CAPTCHA"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>
      <p className="text-xs text-slate-400">
        Resuelve la operación matemática para continuar
      </p>
    </div>
  );
}
