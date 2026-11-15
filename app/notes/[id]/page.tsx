import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';
import { fetchNoteById } from '@/lib/api';
import NoteDetailsClient from './NoteDetails.client';

export default async function NoteDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const queryClient = new QueryClient();
  const queryKey = ['note', id] as const;
  await queryClient.prefetchQuery({
    queryKey,
    queryFn: () => fetchNoteById(id),
  });
  const error = queryClient.getQueryState(queryKey)?.error;
  if (error)
    throw new Error('This note could not be loaded. It may have been deleted.');

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <NoteDetailsClient />
    </HydrationBoundary>
  );
}
