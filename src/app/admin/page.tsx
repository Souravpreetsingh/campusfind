import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const metadata: Metadata = { title: 'Admin Console' };
export const dynamic = 'force-dynamic';

const allowedRoles: Role[] = [Role.MODERATOR, Role.COLLEGE_ADMIN, Role.SUPER_ADMIN];

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin');

  if (!allowedRoles.includes(user.role)) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h1 className="text-3xl font-bold text-primary">Access denied</h1>
        <p className="mt-3 text-gray-500">Your account does not have administrator access.</p>
      </main>
    );
  }

  const [reports, pendingClaims, candidateMatches] = await Promise.all([
    db.report.count(),
    db.claim.count({ where: { status: 'SUBMITTED' } }),
    db.match.count({ where: { status: 'CANDIDATE' } }),
  ]);

  return (
    <main className="max-w-[1600px] mx-auto p-6 pb-12">
      <h1 className="text-3xl font-bold text-primary">Admin Console</h1>
      <p className="mt-2 text-gray-500">Signed in as {user.email} ({user.role})</p>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {[
          { label: 'Reports', value: reports },
          { label: 'Pending claims', value: pendingClaims },
          { label: 'Candidate matches', value: candidateMatches },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-wider text-gray-400">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-primary">{card.value}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
