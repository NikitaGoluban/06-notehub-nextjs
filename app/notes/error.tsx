'use client';

export default function NotesError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main>
      <p role="alert">Could not fetch the list of notes. {error.message}</p>
      <button type="button" onClick={retry}>
        Try again
      </button>
    </main>
  );
}
