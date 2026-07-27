import { ReactNode, useState } from 'react';

interface TooltipProps {
  content: string | ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export function Tooltip({ content, children, position = 'top', delay = 150 }: TooltipProps) {
  const [active, setActive] = useState(false);
  let timeout: ReturnType<typeof setTimeout>;

  const showTooltip = () => {
    timeout = setTimeout(() => {
      setActive(true);
    }, delay);
  };

  const hideTooltip = () => {
    clearInterval(timeout);
    setActive(false);
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-900 border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-900 border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-900 border-y-transparent border-l-transparent',
  };

  return (
    <div className="relative inline-flex items-center" onMouseEnter={showTooltip} onMouseLeave={hideTooltip} onFocus={showTooltip} onBlur={hideTooltip}>
      {children}
      {active && (
        <div
          className={`absolute z-50 px-2.5 py-1.5 text-xs font-medium text-white bg-slate-900/95 backdrop-blur-xs rounded-lg shadow-xl whitespace-nowrap animate-fade-in pointer-events-none ${positionClasses[position]}`}
        >
          {content}
          <div className={`absolute border-4 ${arrowClasses[position]}`} />
        </div>
      )}
    </div>
  );
}
