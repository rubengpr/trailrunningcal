export const MONTH_MAP = {
  ene: 0,
  feb: 1,
  mar: 2,
  abr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dic: 11,
} as const;

export type MonthKey = keyof typeof MONTH_MAP;

export const getMonthNumber = (monthKey: string): number => {
  return MONTH_MAP[monthKey as MonthKey] ?? -1;
};

export const formatDate = (dateString: string | null) => {
  if (!dateString) {
    return { day: '-', month: '-', dayOfWeek: '-' };
  }
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleDateString('es-ES', { month: 'short' });
  const dayOfWeek = date.toLocaleDateString('es-ES', { weekday: 'short' });
  return { day, month, dayOfWeek };
};
