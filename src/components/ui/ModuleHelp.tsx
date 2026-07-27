import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, BookOpen, Lightbulb } from 'lucide-react';

interface HelpStep {
  text: string;
}

interface HelpExample {
  label: string;
  value: string;
}

interface HelpSection {
  title: string;
  steps: HelpStep[];
  example: string;
  exampleFields?: HelpExample[];
}

interface ModuleHelpProps {
  sections: HelpSection[];
}

/**
 * Componente reutilizable de ayuda contextual por módulo.
 * Muestra un panel desplegable con pasos + ejemplo real corto.
 */
export function ModuleHelp({ sections }: ModuleHelpProps) {
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(0);

  return (
    <div className="w-full">
      {/* Botón de ayuda contextual */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-all duration-200 shadow-xs
          ${open
            ? 'bg-blue-50 border-blue-200 text-blue-700'
            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
          }`}
      >
        <HelpCircle className={`w-4 h-4 ${open ? 'text-blue-600' : 'text-gray-400'}`} />
        Ayuda
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {/* Panel de ayuda desplegable */}
      {open && (
        <div className="mt-3 bg-blue-50/60 border border-blue-200/80 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Tabs de secciones si hay más de una */}
          {sections.length > 1 && (
            <div className="flex overflow-x-auto border-b border-blue-200/60 bg-white/50">
              {sections.map((section, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSection(idx)}
                  className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition
                    ${activeSection === idx
                      ? 'border-blue-600 text-blue-700 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  {section.title}
                </button>
              ))}
            </div>
          )}

          {/* Contenido de la sección activa */}
          {sections[activeSection] && (
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Columna izquierda: Pasos */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-extrabold text-blue-800 uppercase tracking-wider">
                    {sections.length === 1 ? sections[0].title : 'Pasos'}
                  </span>
                </div>
                <ol className="space-y-2">
                  {sections[activeSection].steps.map((step, idx) => (
                    <li key={idx} className="flex gap-2.5 text-xs text-slate-700 leading-relaxed">
                      <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <span>{step.text}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Columna derecha: Ejemplo real corto */}
              <div className="bg-white/80 border border-blue-100 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Ejemplo práctico</span>
                </div>
                <p className="text-xs text-slate-600 italic leading-relaxed border-l-2 border-amber-300 pl-3">
                  {sections[activeSection].example}
                </p>
                {sections[activeSection].exampleFields && (
                  <div className="mt-2 space-y-1.5 pt-2 border-t border-slate-100">
                    {sections[activeSection].exampleFields!.map((field, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-500 font-semibold">{field.label}:</span>
                        <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">
                          {field.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}
