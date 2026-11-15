'use client';

import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebouncedCallback } from 'use-debounce';
import { fetchNotes } from '@/lib/api';
import Modal from '@/components/Modal/Modal';
import NoteForm from '@/components/NoteForm/NoteForm';
import NoteList from '@/components/NoteList/NoteList';
import Pagination from '@/components/Pagination/Pagination';
import SearchBox from '@/components/SearchBox/SearchBox';
import css from './NotesPage.module.css';

export default function NotesClient() {
  const [searchInput, setSearchInput] = useState('');
  const [{ page, search }, setFilters] = useState({ page: 1, search: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const notesQuery = useQuery({
    queryKey: ['notes', search, page],
    queryFn: ({ signal }) => fetchNotes({ page, search, signal }),
    refetchOnMount: false,
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[1] === search ? previousData : undefined,
  });

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setFilters({ page: 1, search: value.trim() });
  }, 300);

  const handleSearch = (value: string) => {
    setSearchInput(value);
    debouncedSearch(value);
  };

  const handleCreated = () => {
    debouncedSearch.cancel();
    setSearchInput('');
    setFilters({ page: 1, search: '' });
    setIsModalOpen(false);
  };

  const { data, isPending, isError, isFetching, isPlaceholderData } =
    notesQuery;

  if (data && !isPlaceholderData && page > Math.max(1, data.totalPages)) {
    setFilters({ page: Math.max(1, data.totalPages), search });
  }

  return (
    <main className={css.app} aria-label="Notes">
      <header className={css.toolbar}>
        <SearchBox value={searchInput} onChange={handleSearch} />
        {data && data.totalPages > 1 && (
          <Pagination
            currentPage={Math.min(page, data.totalPages)}
            totalPages={data.totalPages}
            onPageChange={(nextPage) =>
              setFilters((previous) => ({ ...previous, page: nextPage }))
            }
          />
        )}
        <button
          type="button"
          className={css.button}
          onClick={() => setIsModalOpen(true)}
        >
          Create note +
        </button>
      </header>

      {isPending ? (
        <p className={css.status} role="status">
          Loading notes, please wait...
        </p>
      ) : isError ? (
        <p className={css.error} role="alert">
          Could not load notes.{' '}
          <button type="button" onClick={() => void notesQuery.refetch()}>
            Try again
          </button>
        </p>
      ) : (
        <section
          aria-label="Note list"
          aria-busy={isFetching}
          inert={isPlaceholderData}
        >
          {data.notes.length > 0 ? (
            <NoteList notes={data.notes} />
          ) : (
            <p className={css.status} role="status">
              {search
                ? 'No notes found. Try another search.'
                : 'No notes yet. Create your first note!'}
            </p>
          )}
        </section>
      )}

      {isModalOpen && (
        <Modal onClose={closeModal}>
          <NoteForm onSuccess={handleCreated} onCancel={closeModal} />
        </Modal>
      )}
    </main>
  );
}
