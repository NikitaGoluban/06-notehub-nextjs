'use client';

export default function NoteDetailsError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main>
      <p role="alert">Could not fetch note details. {error.message}</p>
      <button type="button" onClick={retry}>
        Try again
      </button>
    </main>
  );
}
