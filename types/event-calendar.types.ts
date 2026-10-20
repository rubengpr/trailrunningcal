export type CalendarButtonVariant = 'control' | 'icon_text' | 'google_icon';

export interface CalendarEntry {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  description: string;
  url: string;
}
