'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { BarChart3, BedDouble, BellRing, Building2, ChevronLeft, ChevronRight, ClipboardCheck, FileText, Home, LayoutDashboard, LogOut, Menu, Settings2, UsersRound, WalletCards, Wrench, X } from 'lucide-react';
import { authAPI } from '@/lib/api';
import { roleLabel, useDashboardLocalization, useLanguage } from '@/lib/i18n';
import type { User, UserRole } from '@/types';

type NavItem = { label: string; href: string; tab?: string; icon: typeof LayoutDashboard };

const navigation: Record<UserRole, NavItem[]> = {
  admin: [
    { label: 'Dashboard & Analytics', href: '/dashboard/admin', icon: BarChart3 },
    { label: 'User Management', href: '/dashboard/admin?tab=users', tab: 'users', icon: UsersRound },
    { label: 'Buildings & Rooms', href: '/dashboard/admin?tab=residence', tab: 'residence', icon: Building2 },
    { label: 'Homepage CMS & News', href: '/dashboard/admin?tab=cms', tab: 'cms', icon: BellRing },
    { label: 'System Settings', href: '/dashboard/admin?tab=settings', tab: 'settings', icon: Settings2 },
  ],
  manager: [
    { label: 'Operations Overview', href: '/dashboard/manager', icon: BarChart3 },
    { label: 'Applications Review', href: '/dashboard/manager?tab=applications', tab: 'applications', icon: ClipboardCheck },
    { label: 'Room Matrix & Auto-Assign', href: '/dashboard/manager?tab=rooms', tab: 'rooms', icon: BedDouble },
    { label: 'Electricity & Water', href: '/dashboard/manager?tab=utilities', tab: 'utilities', icon: WalletCards },
    { label: 'Work Orders', href: '/dashboard/manager?tab=maintenance', tab: 'maintenance', icon: Wrench },
  ],
  teacher: [
    { label: 'Attendance Overview', href: '/dashboard/teacher', icon: BarChart3 },
    { label: 'Nightly Attendance Roster', href: '/dashboard/teacher?tab=attendance', tab: 'attendance', icon: ClipboardCheck },
    { label: 'Leave Requests', href: '/dashboard/teacher?tab=leave', tab: 'leave', icon: FileText },
  ],
  student: [
    { label: 'My Room', href: '/dashboard/student', icon: Home },
    { label: 'Room Application', href: '/dashboard/student?tab=apply', tab: 'apply', icon: FileText },
    { label: 'Utility Bills', href: '/dashboard/student?tab=bills', tab: 'bills', icon: WalletCards },
    { label: 'Maintenance Report', href: '/dashboard/student?tab=maintenance', tab: 'maintenance', icon: Wrench },
    { label: 'Leave Request', href: '/dashboard/student?tab=leave', tab: 'leave', icon: ClipboardCheck },
  ],
};

function displayName(user: User | null, role: UserRole) {
  return user?.full_name_khmer || user?.full_name_latin || `${roleLabel(role, 'en')} member`;
}

export function PortalShell({ role, children }: { role: UserRole; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { language, setLanguage, t } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  useDashboardLocalization(language);

  useEffect(() => {
    void authAPI.getCurrentUser().then((response) => {
      if (response.success && response.user) setUser(response.user);
    });
  }, []);

  function logout() {
    window.localStorage.removeItem('ksit_session_token');
    Object.keys(window.localStorage).filter((key) => key.startsWith('sb-') && key.endsWith('-auth-token')).forEach((key) => window.localStorage.removeItem(key));
    window.sessionStorage.removeItem('ksit_session_token');
    router.replace('/login');
  }

  const currentTab = searchParams.get('tab') || '';
  const isActive = (item: NavItem) => pathname === item.href.split('?')[0] && (item.tab ? currentTab === item.tab : !currentTab);
  const profileInitial = displayName(user, role).trim().charAt(0).toUpperCase() || 'K';

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside className={`flex h-full flex-col border-r border-[#dfe5df] bg-white ${mobile ? 'w-72 shadow-2xl' : collapsed ? 'w-[78px]' : 'w-[276px]'} transition-[width] duration-200`}>
      <div className={`flex h-[76px] items-center border-b border-[#edf0ed] ${collapsed && !mobile ? 'justify-center px-2' : 'justify-between px-4'}`}>
        <Link href="/" className="flex min-w-0 items-center gap-2.5" title="KSIT Dormitory Management System"><Image src="/ksit-logo.png" alt="KSIT official logo" width={38} height={38} priority className="size-9 shrink-0 rounded-full object-cover" />{(!collapsed || mobile) && <span className="min-w-0"><span className="block truncate text-[13px] font-extrabold text-[#18231d]">{t.systemName}</span><span className="block truncate text-[10px] text-[#68736c]">{t.systemSubtitle}</span></span>}</Link>
        {mobile ? <button type="button" onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-[#31513d] hover:bg-[#edf5ee]" aria-label="Close menu"><X className="size-5" /></button> : <button type="button" onClick={() => setCollapsed((value) => !value)} className="rounded-lg p-2 text-[#31513d] hover:bg-[#edf5ee]" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}</button>}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label={`${roleLabel(role, language)} navigation`}>
        {navigation[role].map((item) => { const Icon = item.icon; const active = isActive(item); return <Link onClick={() => setMobileOpen(false)} key={item.href} href={item.href} title={collapsed && !mobile ? item.label : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${active ? 'bg-[#0b5c2c] text-white shadow-sm' : 'text-[#405349] hover:bg-[#edf5ee] hover:text-[#0b5c2c]'} ${collapsed && !mobile ? 'justify-center px-2' : ''}`}><Icon className="size-5 shrink-0" />{(!collapsed || mobile) && <span className="truncate">{item.label}</span>}</Link>; })}
      </nav>
      <div className="border-t border-[#edf0ed] p-3"><div className={`rounded-xl bg-[#f2f7f2] ${collapsed && !mobile ? 'p-2' : 'p-3'}`}><div className={`flex items-center gap-2.5 ${collapsed && !mobile ? 'justify-center' : ''}`}><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#147a5b] text-sm font-extrabold text-white">{profileInitial}</span>{(!collapsed || mobile) && <div className="min-w-0"><p className="truncate text-xs font-extrabold text-[#24332a]">{displayName(user, role)}</p><p className="mt-0.5 text-[10px] font-bold text-[#147a5b]">{roleLabel(role, language)}</p></div>}</div>{(!collapsed || mobile) && <label className="mt-3 block text-[10px] font-bold text-[#68736c]" htmlFor={mobile ? 'mobile-language' : 'language'}>{t.language}<select id={mobile ? 'mobile-language' : 'language'} value={language} onChange={(event) => setLanguage(event.target.value as 'en' | 'km')} className="mt-1.5 h-8 w-full rounded-lg border border-[#dce3dc] bg-white px-2 text-xs text-[#24332a]"><option value="en">{t.english}</option><option value="km">{t.khmer}</option></select></label>}<button type="button" onClick={logout} title={collapsed && !mobile ? 'Logout (ចាកចេញ)' : undefined} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#b83e31] px-3 text-xs font-bold text-white hover:bg-[#963126]"><LogOut className="size-4" />{(!collapsed || mobile) && <span>{t.logout}</span>}</button></div></div>
    </aside>
  );

  return <div className="ksit-shell bg-[#f7f8f4] md:flex md:flex-row"><div className="hidden min-h-screen md:sticky md:top-0 md:flex md:h-screen">{Sidebar({})}</div>{mobileOpen && <><button type="button" aria-label="Close sidebar backdrop" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-[#10211770] md:hidden" /><div className="fixed inset-y-0 left-0 z-50 md:hidden">{Sidebar({ mobile: true })}</div></>}<div className="flex min-w-0 flex-1 flex-col"><header className="flex h-16 items-center justify-between border-b border-[#dfe5df] bg-white px-4 md:hidden"><button type="button" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-[#31513d] hover:bg-[#edf5ee]" aria-label="Open sidebar"><Menu className="size-5" /></button><span className="text-sm font-extrabold text-[#223128]">{roleLabel(role, language)}</span><span className="flex size-8 items-center justify-center rounded-full bg-[#147a5b] text-xs font-bold text-white">{profileInitial}</span></header><main className="ksit-container flex-1 py-6 sm:py-8" data-ksit-dashboard>{children}</main><footer className="border-t border-[#dfe5df] bg-[#fbfcfa] px-4 py-4 text-center text-[10px] text-[#758078] sm:text-xs">KSIT Dormitory Management System · Kampong Speu Institute of Technology</footer></div></div>;
}

export const roleDisplayName: Record<UserRole, string> = { admin: 'Admin Portal', manager: 'Manager Portal', teacher: 'Teacher Portal', student: 'Student Portal' };
