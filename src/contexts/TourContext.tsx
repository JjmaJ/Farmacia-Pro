import React, { createContext, useContext, useState } from 'react';
import { Joyride, Step, STATUS } from 'react-joyride';

interface TourContextProps {
  startTour: (steps: Step[]) => void;
  isActive: boolean;
}

const TourContext = createContext<TourContextProps | undefined>(undefined);

export const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);

  const startTour = (tourSteps: Step[]) => {
    setSteps(tourSteps);
    setRun(true);
  };

  const handleJoyrideEvent = (data: any) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
    }
  };

  return (
    <TourContext.Provider value={{ startTour, isActive: run }}>
      {children}
      <Joyride
        steps={steps}
        run={run}
        continuous={true}
        onEvent={handleJoyrideEvent}
        options={{
          primaryColor: '#3b82f6',
          backgroundColor: '#1e293b',
          textColor: '#f8fafc',
          arrowColor: '#1e293b',
          showProgress: true,
          overlayColor: 'rgba(0,0,0,0.55)',
          zIndex: 10000,
        }}
        locale={{
          back: 'Atrás',
          close: 'Cerrar',
          last: 'Finalizar',
          next: 'Siguiente',
          skip: 'Omitir',
        }}
        styles={{
          tooltipContainer: {
            textAlign: 'left',
          },
          buttonPrimary: {
            borderRadius: '6px',
            fontWeight: '600' as any,
            backgroundColor: '#3b82f6',
          },
          buttonBack: {
            color: '#94a3b8',
          },
          buttonSkip: {
            color: '#64748b',
          },
        }}
      />
    </TourContext.Provider>
  );
};

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) throw new Error('useTour debe usarse dentro de un TourProvider');
  return context;
};
