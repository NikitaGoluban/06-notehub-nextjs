import axios from 'axios';
import type {
  Note,
  FetchNotesParams,
  FetchNotesResponse,
  CreateNoteParams,
} from '@/types/note';

const noteApi = axios.create({
  baseURL: 'https://notehub-public.goit.study/api',
  headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_NOTEHUB_TOKEN}` },
  timeout: 15_000,
});

export async function fetchNotes({
  page,
  search = '',
  perPage = 12,
  signal,
}: FetchNotesParams): Promise<FetchNotesResponse> {
  const { data } = await noteApi.get<FetchNotesResponse>('/notes', {
    params: { page, perPage, search: search || undefined, sortBy: 'created' },
    signal,
  });
  return data;
}

export async function fetchNoteById(
  id: Note['id'],
  signal?: AbortSignal,
): Promise<Note> {
  const { data } = await noteApi.get<Note>(`/notes/${encodeURIComponent(id)}`, {
    signal,
  });
  return data;
}

export async function createNote(note: CreateNoteParams): Promise<Note> {
  const { data } = await noteApi.post<Note>('/notes', note);
  return data;
}

export async function deleteNote(id: Note['id']): Promise<Note> {
  const { data } = await noteApi.delete<Note>(
    `/notes/${encodeURIComponent(id)}`,
  );
  return data;
}
