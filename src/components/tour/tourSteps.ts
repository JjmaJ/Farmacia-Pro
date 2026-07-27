import { Step } from 'react-joyride';

export const tourSteps: Step[] = [
  {
    target: '[data-tour="tour-start-btn"]',
    title: 'Tour de Ayuda Contextual',
    content: 'Bienvenido. Puedes iniciar este recorrido guiado en cualquier momento haciendo clic aquí para conocer las funciones clave de cada página.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="stats-dashboard"]',
    title: 'Panel Estadístico',
    content: 'En esta sección visualizarás los gráficos clave: el stock actual, las tendencias de movimientos (entradas y salidas) y los medicamentos más demandados.',
    placement: 'top',
  },
  {
    target: '[data-tour="stats-kpi-cards"]',
    title: 'Indicadores Clave (KPIs)',
    content: 'Resumen rápido de medicamentos en el catálogo, movimientos totales, usuarios activos y lotes en nivel crítico de bajo stock.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="stats-pdf-report"]',
    title: 'Generar Reporte PDF',
    content: 'Exporta reportes estadísticos e históricos de despacho firmados para auditorías o inventarios físicos.',
    placement: 'left',
  },
  {
    target: '[data-tour="stats-dispatch-filters"]',
    title: 'Filtros de Reporte',
    content: 'Filtra el reporte de despachos por rango de fechas para analizar la demanda histórica específica.',
    placement: 'top',
  }
];

export const sucursalesTourSteps: Step[] = [
  {
    target: '[data-tour="sede-create-btn"]',
    title: 'Crear Nueva Sede',
    content: 'Haga clic aquí para registrar una nueva sede física o sucursal de la farmacia en el sistema.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="sede-search-input"]',
    title: 'Buscador de Sedes',
    content: 'Filtre rápidamente las sedes por su nombre o dirección física.',
    placement: 'right',
  },
  {
    target: '[data-tour="sede-card"]',
    title: 'Ficha de Sede',
    content: 'Visualiza la información de la sede, incluyendo su logo, teléfono, estado de actividad y el administrador asignado.',
    placement: 'top',
  },
  {
    target: '[data-tour="sede-assign-admin-btn"]',
    title: 'Asignar Administrador Local',
    content: 'Asigne un administrador específico para esta sucursal. Este usuario gestionará el stock local.',
    placement: 'top',
  }
];
