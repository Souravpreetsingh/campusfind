import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-20 text-center">
      <h1 className="text-3xl font-bold text-primary">Page not found</h1>
      <p className="mt-3 text-gray-500">The page you requested does not exist.</p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-campusblue/90"
      >
        Return to overview
      </Link>
    </main>
  );
}
