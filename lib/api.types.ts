import type { Note } from '@/types/note';

export interface FetchNotesParams {
  page: number;
  search?: string;
  perPage?: number;
  signal?: AbortSignal;
}

export interface FetchNotesResponse {
  notes: Note[];
  totalPages: number;
}
