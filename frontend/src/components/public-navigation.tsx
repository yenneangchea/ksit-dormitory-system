'use client';

import Link from 'next/link';
import { ChevronDown, LayoutDashboard, LogIn } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type PublicRoute = 'about' | 'docs' | 'features' | 'changelog';

const systemLinks: Array<{ href: PublicRoute; label: string; detail: string }> = [
  { href: 'docs', label: '📖 ឯកសារណែនាំប្រព័ន្ធ', detail: 'System Documentation' },
  { href: 'features', label: '🚀 មុខងារស្នូលនៃប្រព័ន្ធ', detail: 'Core Features & Guides' },
  { href: 'changelog', label: '📢 កំណត់ត្រាកំណែទម្រង់', detail: 'Changelog & Latest Updates' },
];

const dashboardByRole = {
  admin: '/dashboard/admin',
  manager: '/dashboard/manager',
  teacher: '/dashboard/teacher',
  student: '/dashboard/student',
} as const;

export function PublicNavigation({ active }: { active?: PublicRoute }) {
  const [aboutDropdownOpen, setAboutDropdownOpen] = useState(false);
  const [dropdownLeft, setDropdownLeft] = useState(16);
  const [dashboardHref, setDashboardHref] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const syncDropdownPosition = () => {
    const nav = navRef.current;
    const trigger = triggerRef.current;
    if (!nav || !trigger) return;
    const navRect = nav.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const preferredLeft = triggerRect.left - navRect.left;
    setDropdownLeft(Math.max(12, Math.min(preferredLeft, navRect.width - 252)));
  };

  useEffect(() => {
    if (!aboutDropdownOpen) return;
    syncDropdownPosition();

    const closeOnOutsideInteraction = (event: MouseEvent | TouchEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setAboutDropdownOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAboutDropdownOpen(false);
    };

    window.addEventListener('mousedown', closeOnOutsideInteraction);
    window.addEventListener('touchstart', closeOnOutsideInteraction);
    window.addEventListener('resize', syncDropdownPosition);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('mousedown', closeOnOutsideInteraction);
      window.removeEventListener('touchstart', closeOnOutsideInteraction);
      window.removeEventListener('resize', syncDropdownPosition);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [aboutDropdownOpen]);

  useEffect(() => {
    const syncSessionAction = () => {
      const token = localStorage.getItem('ksit_session_token');
      const rawUser = localStorage.getItem('user');
      if (!token || !rawUser) {
        setDashboardHref(null);
        return;
      }
      try {
        const role = JSON.parse(rawUser)?.role as keyof typeof dashboardByRole | undefined;
        setDashboardHref(role ? dashboardByRole[role] || null : null);
      } catch {
        setDashboardHref(null);
      }
    };

    syncSessionAction();
    window.addEventListener('storage', syncSessionAction);
    return () => window.removeEventListener('storage', syncSessionAction);
  }, []);

  return (
    <nav ref={navRef} aria-label="ម៉ឺនុយសាធារណៈ" className="sticky top-0 z-40 bg-[#147a5b] font-sans text-white shadow-md">
      <div className="scrollbar-none mx-auto flex max-w-7xl items-center overflow-x-auto whitespace-nowrap px-4 py-2.5 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0 rounded-lg px-3 py-2 text-sm font-bold hover:bg-[#0f6047]">ទំព័រដើម</Link>
        <Link href="/about" className={`shrink-0 rounded-lg px-3 py-2 text-sm font-bold hover:bg-[#0f6047] ${active === 'about' ? 'bg-[#0f6047]' : ''}`}>អំពីវិទ្យាស្ថាន</Link>
        <a href="https://ksit.edu.kh/category/scholarship/" target="_blank" rel="noreferrer" className="shrink-0 rounded-lg px-3 py-2 text-sm font-bold hover:bg-[#0f6047]">កម្មវិធីសិក្សា និងអាហារូបករណ៍</a>
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={aboutDropdownOpen}
          aria-controls="about-system-menu"
          onClick={() => {
            if (!aboutDropdownOpen) syncDropdownPosition();
            setAboutDropdownOpen((open) => !open);
          }}
          className="flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold hover:bg-[#0f6047] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          អំពីប្រព័ន្ធ <ChevronDown className={`size-4 text-emerald-200 transition-transform duration-200 ${aboutDropdownOpen ? 'rotate-180' : ''}`} />
        </button>
        <Link href="/#contact" className="shrink-0 rounded-lg px-3 py-2 text-sm font-bold hover:bg-[#0f6047]">ទំនាក់ទំនង</Link>
        <Link href={dashboardHref || '/login'} className="ml-2 inline-flex shrink-0 items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 shadow-sm hover:bg-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">{dashboardHref ? <><LayoutDashboard className="size-4" /> ផ្ទាំងគ្រប់គ្រង</> : <><LogIn className="size-4" /> ចូលប្រើប្រាស់</>}</Link>
      </div>

      {aboutDropdownOpen && (
        <div
          id="about-system-menu"
          role="menu"
          style={{ left: dropdownLeft }}
          className="absolute top-full z-50 mt-1 min-w-[240px] rounded-lg border border-slate-200 bg-white py-2 text-slate-800 shadow-2xl"
        >
          {systemLinks.map((item) => (
            <Link
              key={item.href}
              href={`/${item.href}`}
              role="menuitem"
              onClick={() => setAboutDropdownOpen(false)}
              className={`block px-4 py-3 hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none ${active === item.href ? 'bg-emerald-50 text-[#147a5b]' : ''}`}
            >
              <span className="block text-sm font-bold">{item.label}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{item.detail}</span>
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
