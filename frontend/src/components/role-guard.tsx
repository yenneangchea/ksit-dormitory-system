'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import type { UserRole } from '@/types';

const dashboardByRole: Record<UserRole, string> = {
  admin: '/dashboard/admin',
  manager: '/dashboard/manager',
  teacher: '/dashboard/teacher',
  student: '/dashboard/student',
};

type GuardState = 'checking' | 'authorized' | 'redirecting';

export function useRoleGuard(requiredRole: UserRole) {
  const router = useRouter();
  const [state, setState] = useState<GuardState>('checking');

  useEffect(() => {
    let cancelled = false;

    async function verifyRole() {
      const response = await authAPI.getCurrentUser();
      if (cancelled) return;

      const actualRole = response.user?.role;
      if (!response.success || !response.user || !actualRole || !dashboardByRole[actualRole]) {
        localStorage.removeItem('user');
        localStorage.removeItem('ksit_session_token');
        setState('redirecting');
        router.replace('/login');
        return;
      }

      localStorage.setItem('user', JSON.stringify(response.user));
      if (actualRole !== requiredRole) {
        setState('redirecting');
        router.replace(dashboardByRole[actualRole]);
        return;
      }

      setState('authorized');
    }

    void verifyRole();
    return () => { cancelled = true; };
  }, [requiredRole, router]);

  return { isAuthorized: state === 'authorized', isChecking: state === 'checking' };
}

export function DashboardRoleGuardLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8faf7] px-4 text-center">
      <p className="text-sm font-semibold text-[#0b5c2c]">Verifying your KSIT Dormitory access…</p>
    </main>
  );
}
