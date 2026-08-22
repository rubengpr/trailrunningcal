import type { AdminTrailEventDetail } from '@/types/event.types';

export type AdminEventSortColumn = 'dates' | 'name' | 'province';
export type AdminEventSortDirection = 'asc' | 'desc';

export interface AdminEventPageRequest {
  page: number;
  search: string;
  sortColumn: AdminEventSortColumn;
  sortDirection: AdminEventSortDirection;
}

export interface AdminEventPage {
  events: AdminTrailEventDetail[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
