import type { Metadata } from 'next';
import { LoginForm } from '@/components/login-form';

export const metadata: Metadata = { title: 'Admin Sign In' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const destination = next?.startsWith('/') && !next.startsWith('//') ? next : '/admin';

  return (
    <main className="max-w-md mx-auto px-6 py-20">
      <div className="rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-primary">Administrator sign in</h1>
        <p className="mt-2 mb-6 text-sm text-gray-500">Access the CampusFind administration console.</p>
        <LoginForm next={destination} />
      </div>
    </main>
  );
}
