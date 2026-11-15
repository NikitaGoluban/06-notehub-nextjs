'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchNoteById } from '@/lib/api';
import css from './NoteDetails.module.css';

export default function NoteDetailsClient() {
  const { id } = useParams<{ id: string }>();
  const {
    data: note,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['note', id],
    queryFn: ({ signal }) => fetchNoteById(id, signal),
    refetchOnMount: false,
  });

  if (isLoading) return <p role="status">Loading, please wait...</p>;
  if (isError || !note) return <p role="alert">Something went wrong.</p>;

  return (
    <main className={css.main}>
      <div className={css.container}>
        <div className={css.item}>
          <div className={css.header}>
            <h2>{note.title}</h2>
          </div>
          <p className={css.tag}>{note.tag}</p>
          <p className={css.content}>{note.content}</p>
          <p className={css.date}>
            <time dateTime={note.createdAt}>
              {new Date(note.createdAt).toLocaleDateString('en-GB', {
                timeZone: 'UTC',
              })}
            </time>
          </p>
        </div>
      </div>
    </main>
  );
}
