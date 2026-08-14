"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoaderCircle, LockKeyhole, Mail, MessageCircle, ShieldCheck, UserRoundCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authAPI, type ApiResponse } from "@/lib/api";
import type { UserRole } from "@/types";

declare global {
  interface Window {
    Telegram?: { WebApp?: { initData?: string; ready?: () => void } };
  }
}

const dashboardByRole: Record<UserRole, string> = {
  admin: "/dashboard/admin",
  manager: "/dashboard/manager",
  teacher: "/dashboard/teacher",
  student: "/dashboard/student",
};

const demoAccounts: Array<{ label: string; email: string; role: UserRole }> = [
  { label: "Admin", email: "admin@ksit.edu.kh", role: "admin" },
  { label: "Manager", email: "manager@ksit.edu.kh", role: "manager" },
  { label: "Teacher", email: "teacher@ksit.edu.kh", role: "teacher" },
  { label: "Student", email: "student@ksit.edu.kh", role: "student" },
];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"email" | "telegram">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [telegramInitData] = useState(() => typeof window === "undefined" ? "" : window.Telegram?.WebApp?.initData || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    window.Telegram?.WebApp?.ready?.();
  }, []);

  function completeLogin(response: ApiResponse) {
    const role = response.user?.role;
    const destination = role ? dashboardByRole[role] : undefined;
    if (!response.success || !response.user || !response.token || !destination) {
      localStorage.removeItem("user");
      localStorage.removeItem("ksit_session_token");
      setError(response.error?.message || "Your account does not have a valid dashboard assignment. Please contact the system administrator.");
      return false;
    }
    localStorage.setItem("user", JSON.stringify(response.user));
    localStorage.setItem("ksit_session_token", response.token);
    router.replace(destination);
    return true;
  }

  async function signInWithEmail(identifier = email, secret = password) {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    if (!normalizedIdentifier || !secret) {
      setError("Enter your registered email address and password.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      completeLogin(await authAPI.login({ identifier: normalizedIdentifier, password: secret }));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await signInWithEmail();
  }

  async function handleTelegramLogin() {
    setError("");
    if (!telegramInitData) {
      setError("Open the KSIT Dormitory Mini App from Telegram to continue with Telegram login. Your Telegram account must first be linked to your dormitory profile.");
      return;
    }
    setIsLoading(true);
    try {
      completeLogin(await authAPI.loginWithTelegram(telegramInitData));
    } finally {
      setIsLoading(false);
    }
  }

  function selectDemoAccount(account: (typeof demoAccounts)[number]) {
    setMode("email");
    setEmail(account.email);
    setPassword("");
    setError(`Demo ${account.label} selected. Enter the authorized password to sign in.`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_#e9f5ed,_transparent_43%),linear-gradient(135deg,_#f8faf7,_#eef5ef)] px-4 py-10">
      <section className="w-full max-w-md" aria-labelledby="login-title">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-white/70" aria-label="Back to KSIT Dormitory home">
            <span className="flex size-11 items-center justify-center rounded-xl bg-[#0b5c2c] text-xl font-extrabold text-white shadow-sm">K</span>
            <span className="text-left"><span className="block text-[15px] font-bold tracking-[-0.02em] text-[#18231d]">KSIT Dormitory</span><span className="block text-xs text-[#68736c]">Management System</span></span>
          </Link>
        </div>

        <Card className="border-[#dce6dd] bg-white/95 shadow-xl shadow-[#183d2430]">
          <CardHeader className="space-y-3 pb-5 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#eaf6ec] text-[#0b5c2c]"><LockKeyhole className="size-5" aria-hidden="true" /></span>
            <div><CardTitle id="login-title" className="text-2xl font-bold tracking-[-0.03em] text-[#18231d]">ចូលប្រើប្រាស់ KSIT Dormitory</CardTitle><CardDescription className="mt-2 text-sm leading-6 text-[#68736c]">ជ្រើសរើសការចូលប្រើប្រាស់តាមអ៊ីមែល ឬ Telegram។ ប្រព័ន្ធនឹងបើកផ្ទាំងតួនាទីរបស់អ្នកដោយស្វ័យប្រវត្តិ។</CardDescription></div>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-2 rounded-xl border border-[#dce6dd] bg-[#f5f8f5] p-1" role="tablist" aria-label="Login options">
              <button type="button" role="tab" aria-selected={mode === "email"} onClick={() => { setMode("email"); setError(""); }} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${mode === "email" ? "bg-white text-[#0b5c2c] shadow-sm" : "text-[#68736c] hover:text-[#0b5c2c]"}`}><Mail className="size-4" /> Login with Email</button>
              <button type="button" role="tab" aria-selected={mode === "telegram"} onClick={() => { setMode("telegram"); setError(""); }} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${mode === "telegram" ? "bg-white text-[#0b5c2c] shadow-sm" : "text-[#68736c] hover:text-[#0b5c2c]"}`}><MessageCircle className="size-4" /> Telegram</button>
            </div>

            {error && <div role="alert" className="mt-5 rounded-xl border border-[#f3c8c1] bg-[#fff4f2] px-4 py-3 text-sm leading-5 text-[#a4382a]">{error}</div>}

            {mode === "email" ? (
              <form onSubmit={handleEmailSubmit} className="mt-5 space-y-5" aria-busy={isLoading}>
                <div className="space-y-2"><Label htmlFor="email" className="text-[#39473f]">Email address</Label><div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#718077]" aria-hidden="true" /><Input id="email" type="email" autoComplete="email" placeholder="name@ksit.edu.kh" value={email} onChange={(event) => { setEmail(event.target.value); if (error) setError(""); }} disabled={isLoading} required className="h-11 border-[#dce3dc] pl-10 focus-visible:ring-[#0b5c2c]" /></div></div>
                <div className="space-y-2"><Label htmlFor="password" className="text-[#39473f]">Password</Label><Input id="password" type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => { setPassword(event.target.value); if (error) setError(""); }} disabled={isLoading} required className="h-11 border-[#dce3dc] focus-visible:ring-[#0b5c2c]" /></div>
                <Button type="submit" className="h-11 w-full bg-[#0b5c2c] font-semibold hover:bg-[#084a23]" disabled={isLoading}>{isLoading ? <><LoaderCircle className="mr-2 size-4 animate-spin" /> Signing in securely…</> : "Login with Email"}</Button>
              </form>
            ) : (
              <div className="mt-5 space-y-4" aria-busy={isLoading}>
                <div className="rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-slate-700"><div className="flex items-center gap-2 font-bold text-sky-900"><ShieldCheck className="size-4" /> Login with Telegram</div><p className="mt-2">When this page is opened as the KSIT Telegram Mini App, Telegram sends a signed session to the server. The server verifies it and opens the linked dormitory dashboard.</p></div>
                <Button type="button" onClick={handleTelegramLogin} className="h-11 w-full bg-[#229ED9] font-semibold hover:bg-[#1787bd]" disabled={isLoading}>{isLoading ? <><LoaderCircle className="mr-2 size-4 animate-spin" /> Verifying Telegram…</> : <><MessageCircle className="mr-2 size-4" /> Login with Telegram</>}</Button>
                {!telegramInitData && <a href="https://t.me/KSITDorm_bot?start=login" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-lg border border-[#dce3dc] px-4 py-2.5 text-sm font-bold text-[#0b5c2c] hover:bg-[#f5f8f5]"><UserRoundCheck className="size-4" /> Open KSITDorm_bot</a>}
                <p className="text-center text-xs leading-5 text-[#68736c]">Telegram sign-in requires an administrator-linked Telegram ID. Email login remains available for every authorized account.</p>
              </div>
            )}

            <div className="mt-6 border-t border-[#edf0ed] pt-5"><p className="text-center text-xs font-bold uppercase tracking-wide text-[#68736c]">Demo account quick fill</p><div className="mt-3 grid grid-cols-2 gap-2">{demoAccounts.map((account) => <button key={account.role} type="button" onClick={() => selectDemoAccount(account)} disabled={isLoading} className="rounded-lg border border-[#dce3dc] bg-white px-3 py-2 text-left text-xs font-semibold text-[#39473f] transition hover:border-[#87af91] hover:bg-[#f5faf6]"><span className="block text-[#0b5c2c]">{account.label}</span><span className="mt-0.5 block truncate text-[#68736c]">{account.email}</span></button>)}</div><p className="mt-3 text-center text-xs leading-5 text-[#68736c]">For security, these shortcuts fill the approved demo email only; enter the authorized password to complete sign-in.</p></div>
            <p className="mt-5 text-center text-xs leading-5 text-[#68736c]">Need help accessing your account? Contact the dormitory system administrator.</p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
