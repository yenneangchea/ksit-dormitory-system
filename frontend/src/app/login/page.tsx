'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authAPI } from '@/lib/api';
import type { UserRole } from '@/types';

const dashboardByRole: Record<UserRole, string> = {
  admin: '/dashboard/admin',
  manager: '/dashboard/manager',
  teacher: '/dashboard/teacher',
  student: '/dashboard/student',
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const identifier = email.trim().toLowerCase();
    if (!identifier || !password) {
      setError('Enter your registered email address and password.');
      return;
    }

    setIsLoading(true);
    try {
      // The Express endpoint verifies the password and returns the role stored in the user profile.
      // No role is sent from the browser, so the redirect cannot be selected by the user interface.
      const response = await authAPI.login({ identifier, password });
      const role = response.user?.role;
      const destination = role ? dashboardByRole[role] : undefined;

      if (!response.success || !response.user || !response.token || !destination) {
        localStorage.removeItem('user');
        localStorage.removeItem('ksit_session_token');
        setError(response.error?.message || 'Your account does not have a valid dashboard assignment. Please contact the system administrator.');
        return;
      }

      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('ksit_session_token', response.token);
      router.replace(destination);
    } catch {
      setError('We could not complete your sign-in. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_#e9f5ed,_transparent_43%),linear-gradient(135deg,_#f8faf7,_#eef5ef)] px-4 py-10">
      <section className="w-full max-w-md" aria-labelledby="login-title">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-white/70" aria-label="Back to KSIT Dormitory home">
            <span className="flex size-11 items-center justify-center rounded-xl bg-[#0b5c2c] text-xl font-extrabold text-white shadow-sm">K</span>
            <span className="text-left">
              <span className="block text-[15px] font-bold tracking-[-0.02em] text-[#18231d]">KSIT Dormitory</span>
              <span className="block text-xs text-[#68736c]">Management System</span>
            </span>
          </Link>
        </div>

        <Card className="border-[#dce6dd] bg-white/95 shadow-xl shadow-[#183d2430]">
          <CardHeader className="space-y-3 pb-5 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#eaf6ec] text-[#0b5c2c]">
              <LockKeyhole className="size-5" aria-hidden="true" />
            </span>
            <div>
              <CardTitle id="login-title" className="text-2xl font-bold tracking-[-0.03em] text-[#18231d]">Sign in to KSIT Dormitory</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6 text-[#68736c]">Use your registered email and password. Your assigned role will open the correct dashboard automatically.</CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5" aria-busy={isLoading}>
              {error && (
                <div role="alert" className="rounded-xl border border-[#f3c8c1] bg-[#fff4f2] px-4 py-3 text-sm leading-5 text-[#a4382a]">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#39473f]">Email address</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#718077]" aria-hidden="true" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@ksit.edu.kh"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (error) setError('');
                    }}
                    disabled={isLoading}
                    required
                    className="h-11 border-[#dce3dc] pl-10 focus-visible:ring-[#0b5c2c]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#39473f]">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (error) setError('');
                  }}
                  disabled={isLoading}
                  required
                  className="h-11 border-[#dce3dc] focus-visible:ring-[#0b5c2c]"
                />
              </div>

              <Button type="submit" className="h-11 w-full bg-[#0b5c2c] font-semibold hover:bg-[#084a23]" disabled={isLoading}>
                {isLoading ? <><LoaderCircle className="mr-2 size-4 animate-spin" aria-hidden="true" />Signing in securely…</> : 'Sign In'}
              </Button>
            </form>

            <p className="mt-6 border-t border-[#edf0ed] pt-5 text-center text-xs leading-5 text-[#68736c]">
              Need help accessing your account? Contact the dormitory system administrator.
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
