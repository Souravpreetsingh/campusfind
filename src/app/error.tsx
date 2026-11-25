'use client';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="max-w-3xl mx-auto px-6 py-20 text-center">
      <h1 className="text-3xl font-bold text-primary">Something went wrong</h1>
      <p className="mt-3 text-gray-500">Please try again. If the problem persists, contact an administrator.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary"
      >
        Try again
      </button>
    </main>
  );
}
