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

export const formatDateByLocale = (
  date: Date | string | null,
  locale: string,
): string => {
  if (!date) {
    return 'N/D';
  }

  return locale === 'ca'
    ? formatDateToCatalan(date)
    : formatDateToSpanish(date);
};

export const formatDateShort = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;

  if (isNaN(dateObj.getTime())) {
    return typeof date === 'string' ? date : '';
  }

  return dateObj.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
};
