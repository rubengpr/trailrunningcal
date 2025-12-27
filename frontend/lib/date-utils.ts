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

/**
 * Formats a date to Spanish human-readable format
 * @param date - Date object or ISO date string
 * @returns Formatted date string (e.g., "30 de noviembre de 2025")
 */
export const formatDateToSpanish = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dateObj);
};

/**
 * Formats a date to Catalan human-readable format
 * @param date - Date object or ISO date string
 * @returns Formatted date string (e.g., "30 de novembre de 2025")
 */
export const formatDateToCatalan = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('ca-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dateObj);
};
