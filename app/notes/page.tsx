import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';
import { fetchNotes } from '@/lib/api';
import NotesClient from './Notes.client';

export const dynamic = 'force-dynamic';

export default async function Notes() {
  const queryClient = new QueryClient();
  const queryKey = ['notes', '', 1] as const;
  await queryClient.prefetchQuery({
    queryKey,
    queryFn: () => fetchNotes({ page: 1 }),
  });
  const error = queryClient.getQueryState(queryKey)?.error;
  if (error)
    throw new Error(
      'The notes service is unavailable. Please try again later.',
    );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <NotesClient />
    </HydrationBoundary>
  );
}
