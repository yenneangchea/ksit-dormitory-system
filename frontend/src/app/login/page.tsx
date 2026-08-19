"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { KeyRound, LoaderCircle, LockKeyhole, Mail, MessageCircle, Phone, RefreshCw, ShieldCheck, UserPlus, UserRoundCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authAPI, type ApiResponse } from "@/lib/api";
import { AcademicProgramFields } from "@/components/academic-program-fields";
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

export default function LoginPage() {
  return <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-[#0b5c2c]">Loading KSIT Dormitory login…</main>}><LoginForm /></Suspense>;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registrationCompleted = searchParams?.get("registered") === "1";
  const [mode, setMode] = useState<"email" | "phone" | "telegram">(() => {
    const requestedMode = searchParams?.get("mode");
    return requestedMode === "telegram" || requestedMode === "email" ? requestedMode : "phone";
  });
  const [email, setEmail] = useState(() => registrationCompleted ? searchParams?.get("email") || "" : "");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [phoneStep, setPhoneStep] = useState<"phone" | "code">("phone");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [telegramInitData] = useState(() => typeof window === "undefined" ? "" : window.Telegram?.WebApp?.initData || "");
  const [telegramMode, setTelegramMode] = useState<"login" | "signup">("login");
  const [telegramRegistration, setTelegramRegistration] = useState({ full_name_khmer: "", full_name_latin: "", email: "", phone: "", gender: "male" as "male" | "female", academic_level: "", academic_major_id: "", academic_year: "", password: "", confirmPassword: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resetReason, setResetReason] = useState("");
  const [resetNotice, setResetNotice] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const registrationNotice = registrationCompleted ? "Registration completed. Enter the password you just created to sign in as a Student." : "";

  useEffect(() => {
    window.Telegram?.WebApp?.ready?.();
  }, []);

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      const token = localStorage.getItem("ksit_session_token");
      if (!token) {
        if (active) setIsCheckingSession(false);
        return;
      }

      const response = await authAPI.getCurrentUser();
      const role = response.user?.role;
      const destination = role ? dashboardByRole[role] : undefined;
      if (response.success && response.user && destination) {
        let restoredUser = response.user;
        if (telegramInitData) {
          const linkResponse = await authAPI.linkTelegram(telegramInitData);
          if (linkResponse.success && linkResponse.user) restoredUser = linkResponse.user;
        }
        localStorage.setItem("user", JSON.stringify(restoredUser));
        router.replace(destination);
        return;
      }

      localStorage.removeItem("user");
      localStorage.removeItem("ksit_session_token");
      if (active) setIsCheckingSession(false);
    };

    void restoreSession();
    return () => { active = false; };
  }, [router, telegramInitData]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const interval = window.setInterval(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(interval);
  }, [resendSeconds]);

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

  async function sendPhoneVerificationCode() {
    if (!phone.trim()) {
      setError("Enter your registered phone number.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const response = await authAPI.sendPhoneOtp(phone.trim());
      if (!response.success) {
        setError(response.error?.message || "Unable to send the verification code.");
        return;
      }
      setPhoneStep("code");
      setOtpCode("");
      setResendSeconds(response.data?.resend_after_seconds || 60);
    } finally {
      setIsLoading(false);
    }
  }

  async function verifyPhoneVerificationCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (otpCode.length !== 6) {
      setError("Enter the complete six-digit verification code.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      completeLogin(await authAPI.verifyPhoneOtp({ phone: phone.trim(), code: otpCode }));
    } finally {
      setIsLoading(false);
    }
  }

  function updateOtpCode(value: string) {
    setOtpCode(value.replace(/\D/g, "").slice(0, 6));
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

  async function handleTelegramRegistration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!telegramInitData) {
      setError("Open this page from the KSITDorm Telegram Mini App to sign up with Telegram.");
      return;
    }
    if (telegramRegistration.password !== telegramRegistration.confirmPassword) {
      setError("The two passwords do not match.");
      return;
    }
    if (!telegramRegistration.academic_level || !telegramRegistration.academic_major_id || !telegramRegistration.academic_year) {
      setError("Select your academic level, major, and year level before registering.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      completeLogin(await authAPI.registerWithTelegram({
        initData: telegramInitData,
        full_name_khmer: telegramRegistration.full_name_khmer,
        full_name_latin: telegramRegistration.full_name_latin,
        email: telegramRegistration.email,
        phone: telegramRegistration.phone,
        gender: telegramRegistration.gender,
        academic_level: telegramRegistration.academic_level,
        academic_major_id: telegramRegistration.academic_major_id,
        academic_year: Number(telegramRegistration.academic_year),
        password: telegramRegistration.password,
      }));
    } finally {
      setIsLoading(false);
    }
  }

  async function submitPasswordResetRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetIdentifier.trim()) {
      setResetNotice("Enter your registered email address or phone number.");
      return;
    }
    setIsResetting(true);
    setResetNotice("");
    try {
      const response = await authAPI.requestPasswordReset({ identifier: resetIdentifier.trim(), reason: resetReason.trim() || undefined });
      setResetNotice(response.success ? response.message || "Your request has been sent." : response.error?.message || "Unable to submit the reset request.");
      if (response.success) {
        setResetIdentifier("");
        setResetReason("");
      }
    } finally {
      setIsResetting(false);
    }
  }

  if (isCheckingSession) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-[#0b5c2c]"><LoaderCircle className="mr-2 size-4 animate-spin" /> Restoring your KSIT Dormitory session…</main>;
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
            <div><CardTitle id="login-title" className="text-2xl font-bold tracking-[-0.03em] text-[#18231d]">ចូលប្រើប្រាស់ KSIT Dormitory</CardTitle><CardDescription className="mt-2 text-sm leading-6 text-[#68736c]">ចូលប្រើដោយលេខទូរស័ព្ទ និងលេខកូដ Telegram ជាជម្រើសចម្បង។ អ៊ីមែល និង Telegram Mini App នៅតែអាចប្រើបានជាជម្រើសផ្សេងទៀត។</CardDescription></div>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-3 rounded-xl border border-[#dce6dd] bg-[#f5f8f5] p-1" role="tablist" aria-label="Login options">
              <button type="button" role="tab" aria-selected={mode === "phone"} onClick={() => { setMode("phone"); setError(""); }} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${mode === "phone" ? "bg-white text-[#0b5c2c] shadow-sm" : "text-[#68736c] hover:text-[#0b5c2c]"}`}><Phone className="size-4" /> Phone OTP</button>
              <button type="button" role="tab" aria-selected={mode === "email"} onClick={() => { setMode("email"); setError(""); }} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${mode === "email" ? "bg-white text-[#0b5c2c] shadow-sm" : "text-[#68736c] hover:text-[#0b5c2c]"}`}><Mail className="size-4" /> Email</button>
              <button type="button" role="tab" aria-selected={mode === "telegram"} onClick={() => { setMode("telegram"); setError(""); }} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${mode === "telegram" ? "bg-white text-[#0b5c2c] shadow-sm" : "text-[#68736c] hover:text-[#0b5c2c]"}`}><MessageCircle className="size-4" /> Telegram</button>
            </div>

            {registrationNotice && <div role="status" className="mt-5 rounded-xl border border-[#b8ddc0] bg-[#eff9f1] px-4 py-3 text-sm leading-5 text-[#166534]">{registrationNotice}</div>}
            {error && (
              <div role="alert" className="mt-5 animate-shake flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800 shadow-sm transition-all duration-200">
                <div className="rounded-full bg-rose-100 p-1 text-rose-600">⚠️</div>
                <div className="flex-1">
                  <p className="font-bold">Authentication Notice / ការជូនដំណឹង</p>
                  <p className="mt-0.5">{error}</p>
                </div>
                <button type="button" onClick={() => setError("")} className="text-xs font-bold text-rose-600 hover:text-rose-900">Dismiss</button>
              </div>
            )}
            {isLoading && (
              <div className="mt-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs font-bold text-emerald-900 shadow-sm animate-pulse">
                <LoaderCircle className="size-5 animate-spin text-[#0b5c2c]" />
                <div>
                  <p className="text-sm font-bold">កំពុងដំណើរការ...</p>
                  <p className="text-xs text-emerald-700">Verifying credentials and securely connecting to the KSIT Dormitory backend...</p>
                </div>
              </div>
            )}

            {mode === "email" ? (
              <form onSubmit={handleEmailSubmit} className="mt-5 space-y-5" aria-busy={isLoading}>
                <div className="space-y-2"><Label htmlFor="email" className="text-[#39473f]">Email address</Label><div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#718077]" aria-hidden="true" /><Input id="email" type="email" autoComplete="email" placeholder="name@ksit.edu.kh" value={email} onChange={(event) => { setEmail(event.target.value); if (error) setError(""); }} disabled={isLoading} required className="h-11 border-[#dce3dc] pl-10 focus-visible:ring-[#0b5c2c]" /></div></div>
                <div className="space-y-2"><Label htmlFor="password" className="text-[#39473f]">Password</Label><Input id="password" type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => { setPassword(event.target.value); if (error) setError(""); }} disabled={isLoading} required className="h-11 border-[#dce3dc] focus-visible:ring-[#0b5c2c]" /></div>
                <Button type="submit" className="h-11 w-full bg-[#0b5c2c] font-semibold hover:bg-[#084a23]" disabled={isLoading}>{isLoading ? <><LoaderCircle className="mr-2 size-4 animate-spin" /> Signing in securely…</> : "Login with Email"}</Button>
                <button type="button" onClick={() => { setResetOpen(true); setResetNotice(""); }} className="mx-auto flex min-h-11 items-center gap-2 text-sm font-bold text-[#0b5c2c] hover:underline"><KeyRound className="size-4" /> Forgot Password? / ភ្លេចពាក្យសម្ងាត់? ស្នើសុំប្តូរ</button>
              </form>
            ) : mode === "phone" ? (
              <section className="mt-5 space-y-4" aria-busy={isLoading} aria-label="Phone login with Telegram verification">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-slate-700"><div className="flex items-center gap-2 font-bold text-emerald-900"><Phone className="size-4" /> Login with Phone</div><p className="mt-2">Enter your registered number. The six-digit verification code is delivered only to the Telegram account linked to your dormitory profile.</p></div>
                {phoneStep === "phone" ? <form onSubmit={(event) => { event.preventDefault(); void sendPhoneVerificationCode(); }} className="space-y-4"><div className="space-y-2"><Label htmlFor="phone-login">Registered phone number</Label><Input id="phone-login" inputMode="tel" autoComplete="tel" placeholder="089511383" value={phone} onChange={(event) => { setPhone(event.target.value); if (error) setError(""); }} disabled={isLoading} required className="h-11 border-[#dce3dc] focus-visible:ring-[#0b5c2c]" /></div><Button type="submit" className="h-11 w-full bg-[#0b5c2c] font-semibold hover:bg-[#084a23]" disabled={isLoading}>{isLoading ? <><LoaderCircle className="mr-2 size-4 animate-spin" /> Sending code…</> : <><MessageCircle className="mr-2 size-4" /> Send Telegram code</>}</Button></form> : <form onSubmit={verifyPhoneVerificationCode} className="space-y-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-[#223128]">Enter the six-digit code</p><p className="mt-1 text-xs text-[#68736c]">Sent to the Telegram account linked with {phone}.</p></div><button type="button" onClick={() => { setPhoneStep("phone"); setOtpCode(""); setError(""); }} className="min-h-11 px-2 text-xs font-bold text-[#0b5c2c] hover:underline">Change number</button></div><div className="space-y-2"><Input id="phone-otp-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" aria-label="Six-digit verification code" placeholder="••••••" maxLength={6} value={otpCode} onChange={(event) => updateOtpCode(event.target.value)} disabled={isLoading} className="h-14 border-[#b9d2bf] px-4 text-center font-mono text-2xl font-bold tracking-[0.42em] text-[#0b5c2c] placeholder:tracking-[0.42em] focus-visible:ring-[#0b5c2c]" /><p className="text-center text-xs text-[#68736c]">Type or paste the full six-digit code once.</p></div><Button type="submit" className="h-11 w-full bg-[#0b5c2c] font-semibold hover:bg-[#084a23]" disabled={isLoading || otpCode.length !== 6}>{isLoading ? <><LoaderCircle className="mr-2 size-4 animate-spin" /> Verifying…</> : "Verify and continue"}</Button><button type="button" onClick={() => void sendPhoneVerificationCode()} disabled={isLoading || resendSeconds > 0} className="mx-auto flex min-h-11 items-center gap-2 text-sm font-bold text-[#0b5c2c] disabled:text-[#8b9a90]"><RefreshCw className="size-4" /> {resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : "Resend Telegram code"}</button></form>}
              </section>
            ) : (
              <div className="mt-5 space-y-4" aria-busy={isLoading}>
                <div className="rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-slate-700"><div className="flex items-center gap-2 font-bold text-sky-900"><ShieldCheck className="size-4" /> Telegram access</div><p className="mt-2">Open this page from KSITDorm in Telegram. Existing users log in directly; new users sign up once and receive the Student dashboard by default.</p></div>
                {telegramInitData ? <>
                  <div className="grid grid-cols-2 rounded-lg border border-sky-100 bg-sky-50 p-1"><button type="button" onClick={() => setTelegramMode("login")} className={`rounded-md px-3 py-2 text-xs font-bold ${telegramMode === "login" ? "bg-white text-sky-700 shadow-sm" : "text-slate-600"}`}>Login</button><button type="button" onClick={() => setTelegramMode("signup")} className={`rounded-md px-3 py-2 text-xs font-bold ${telegramMode === "signup" ? "bg-white text-sky-700 shadow-sm" : "text-slate-600"}`}>Sign up</button></div>
                  {telegramMode === "login" ? <Button type="button" onClick={handleTelegramLogin} className="h-11 w-full bg-[#229ED9] font-semibold hover:bg-[#1787bd]" disabled={isLoading}>{isLoading ? <><LoaderCircle className="mr-2 size-4 animate-spin" /> Verifying Telegram…</> : <><MessageCircle className="mr-2 size-4" /> Login with Telegram</>}</Button> : <form onSubmit={handleTelegramRegistration} className="space-y-3"><div className="grid grid-cols-2 gap-3"><Input required placeholder="Khmer name" value={telegramRegistration.full_name_khmer} onChange={(event) => setTelegramRegistration({ ...telegramRegistration, full_name_khmer: event.target.value })} /><Input required placeholder="Latin name" value={telegramRegistration.full_name_latin} onChange={(event) => setTelegramRegistration({ ...telegramRegistration, full_name_latin: event.target.value })} /></div><Input required type="email" placeholder="name@ksit.edu.kh" value={telegramRegistration.email} onChange={(event) => setTelegramRegistration({ ...telegramRegistration, email: event.target.value })} /><div className="grid grid-cols-2 gap-3"><Input required placeholder="Phone number" value={telegramRegistration.phone} onChange={(event) => setTelegramRegistration({ ...telegramRegistration, phone: event.target.value })} /><select value={telegramRegistration.gender} onChange={(event) => setTelegramRegistration({ ...telegramRegistration, gender: event.target.value as "male" | "female" })} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="male">Male</option><option value="female">Female</option></select></div><AcademicProgramFields value={{ academic_level: telegramRegistration.academic_level, academic_major_id: telegramRegistration.academic_major_id, academic_year: telegramRegistration.academic_year }} onChange={(next) => setTelegramRegistration({ ...telegramRegistration, ...next })} required /><Input required minLength={8} type="password" autoComplete="new-password" placeholder="Create password (8+ characters)" value={telegramRegistration.password} onChange={(event) => setTelegramRegistration({ ...telegramRegistration, password: event.target.value })} /><Input required minLength={8} type="password" autoComplete="new-password" placeholder="Confirm password" value={telegramRegistration.confirmPassword} onChange={(event) => setTelegramRegistration({ ...telegramRegistration, confirmPassword: event.target.value })} /><Button type="submit" className="h-11 w-full bg-[#0b5c2c] font-semibold hover:bg-[#084a23]" disabled={isLoading}>{isLoading ? <><LoaderCircle className="mr-2 size-4 animate-spin" /> Creating Student account…</> : <><UserPlus className="mr-2 size-4" /> Sign up with Telegram</>}</Button></form>}
                </> : <a href="https://t.me/KSITDorm_bot?start=login" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-lg border border-[#dce3dc] px-4 py-2.5 text-sm font-bold text-[#0b5c2c] hover:bg-[#f5f8f5]"><UserRoundCheck className="size-4" /> Open KSITDorm_bot</a>}
                <p className="text-center text-xs leading-5 text-[#68736c]">New Telegram accounts are Student by default. An Admin may later assign Manager, Teacher, or Admin access.</p>
              </div>
            )}

            <p className="mt-5 text-center text-xs leading-5 text-[#68736c]">Need help accessing your account? Contact the dormitory system administrator.</p>
            {resetOpen && <div className="mt-5 rounded-xl border border-[#dce3dc] bg-[#f7faf7] p-4" role="dialog" aria-modal="true" aria-label="Request password reset"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold text-[#223128]">Request Password Reset</h2><p className="mt-1 text-xs leading-5 text-[#68736c]">ភ្លេចពាក្យសម្ងាត់? ផ្ញើសំណើទៅអ្នកគ្រប់គ្រងប្រព័ន្ធ។</p></div><button type="button" onClick={() => setResetOpen(false)} className="min-h-11 px-2 text-xs font-bold text-[#68736c] hover:text-[#0b5c2c]">Close</button></div><form onSubmit={submitPasswordResetRequest} className="mt-4 space-y-3"><div className="space-y-2"><Label htmlFor="reset-identifier">Registered email or phone</Label><Input id="reset-identifier" value={resetIdentifier} onChange={(event) => setResetIdentifier(event.target.value)} placeholder="name@example.com or 012345678" required disabled={isResetting} /></div><div className="space-y-2"><Label htmlFor="reset-reason">Reason (optional)</Label><textarea id="reset-reason" value={resetReason} onChange={(event) => setResetReason(event.target.value)} disabled={isResetting} className="min-h-20 w-full rounded-lg border border-[#dce3dc] bg-white px-3 py-2 text-sm outline-none focus:border-[#0b5c2c]" placeholder="Briefly describe your request" /></div>{resetNotice && <p role="status" className="rounded-lg bg-white px-3 py-2 text-xs leading-5 text-[#31513d]">{resetNotice}</p>}<Button type="submit" className="h-11 w-full bg-[#0b5c2c] hover:bg-[#084a23]" disabled={isResetting}>{isResetting ? <><LoaderCircle className="mr-2 size-4 animate-spin" /> Sending request…</> : "Send reset request"}</Button></form></div>}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
