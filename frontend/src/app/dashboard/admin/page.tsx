'use client';

import { useEffect, useState } from 'react';
import { Building2, ShieldCheck, UsersRound, Wrench } from 'lucide-react';
import { PortalShell } from '@/components/portal-shell';
import { DashboardRoleGuardLoading, useRoleGuard } from '@/components/role-guard';
import { dashboardAPI, type DashboardSummary, usersAPI } from '@/lib/api';
import type { User, UserRole } from '@/types';

const emptySummary: DashboardSummary = { buildings: 0, rooms_in_service: 0, rooms_total: 0, total_capacity: 0, occupied_beds: 0, vacant_beds: 0, occupancy_percent: 0, pending_maintenance: 0, pending_applications: 0, attendance_today: 0 };

export default function AdminDashboard() {
  const { isAuthorized, isChecking } = useRoleGuard('admin');
  const [summary, setSummary] = useState(emptySummary);
  const [users, setUsers] = useState<User[]>([]);
  const [notice, setNotice] = useState('');
  const [savingUser, setSavingUser] = useState('');

  async function load() {
    const [summaryResponse, usersResponse] = await Promise.all([dashboardAPI.summary(), usersAPI.list()]);
    if (summaryResponse.success && summaryResponse.data) setSummary(summaryResponse.data);
    if (usersResponse.success && usersResponse.data) setUsers(usersResponse.data);
  }

  useEffect(() => {
    if (!isAuthorized) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [isAuthorized]);

  async function changeRole(userId: string, role: UserRole) {
    setSavingUser(userId);
    const response = await usersAPI.updateRole(userId, role);
    setSavingUser('');
    setNotice(response.success ? 'User role updated.' : response.error?.message || 'Unable to update the user role.');
    if (response.success) await load();
  }

  if (isChecking) return <DashboardRoleGuardLoading />;
  if (!isAuthorized) return null;

  return <PortalShell role="admin"><section className="min-h-[calc(100vh-156px)]"><div className="mb-8"><h1 className="text-[29px] font-extrabold tracking-[-0.045em]">Welcome back, Admin Portal</h1><p className="mt-1.5 text-sm text-[#68736c]">System governance, resident access, and residence configuration at a glance.</p></div>{notice && <div className="mb-5 rounded-xl border border-[#cfe0d1] bg-[#edf7ee] px-4 py-3 text-sm text-[#16582b]">{notice}</div>}<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Kpi icon={<UsersRound />} label="Registered users" value={users.length} note="All role accounts" /><Kpi icon={<Building2 />} label="Buildings" value={summary.buildings} note={`${summary.rooms_total} configured rooms`} /><Kpi icon={<ShieldCheck />} label="Pending review" value={summary.pending_applications} note="Residence applications" /><Kpi icon={<Wrench />} label="Open work orders" value={summary.pending_maintenance} note="Manager action queue" /></div><div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]"><section className="ksit-card overflow-hidden"><div className="p-6"><h2 className="text-lg font-bold">User access control</h2><p className="mt-1 text-sm text-[#68736c]">Assign the appropriate operating role to every registered member.</p></div><div className="max-h-[480px] overflow-auto border-t border-[#edf0ed]"><table className="w-full min-w-[650px] text-left text-sm"><thead className="sticky top-0 bg-[#fafcf9] text-xs uppercase tracking-[0.08em] text-[#748078]"><tr><th className="px-6 py-3">Account</th><th className="px-4 py-3">Contact</th><th className="px-6 py-3 text-right">Role</th></tr></thead><tbody>{users.length === 0 ? <tr><td colSpan={3} className="px-6 py-6 text-[#68736c]">No user records are available.</td></tr> : users.map((user) => <tr className="border-t border-[#edf0ed]" key={user.id}><td className="px-6 py-4"><p className="font-semibold">{user.full_name_latin}</p><p className="mt-1 text-xs text-[#68736c]">{user.full_name_khmer}</p></td><td className="px-4 py-4 text-[#68736c]">{user.email}</td><td className="px-6 py-4 text-right"><select disabled={savingUser === user.id} value={user.role} onChange={(event) => void changeRole(user.id, event.target.value as UserRole)} className="rounded-lg border border-[#dce3dc] bg-white px-2 py-1.5 text-xs font-semibold capitalize outline-none disabled:opacity-50"><option value="admin">Admin</option><option value="manager">Manager</option><option value="teacher">Teacher</option><option value="student">Student</option></select></td></tr>)}</tbody></table></div></section><section className="ksit-card p-6"><h2 className="text-lg font-bold">Operational status</h2><p className="mt-1 text-sm text-[#68736c]">Core system indicators that require leadership attention.</p><dl className="mt-6 divide-y divide-[#edf0ed]">{[['Occupancy', `${summary.occupied_beds} / ${summary.total_capacity} beds`], ['Room serviceability', `${summary.rooms_in_service} rooms active`], ['Attendance today', `${summary.attendance_today} scans recorded`], ['Available capacity', `${summary.vacant_beds} beds vacant`]].map(([label, value]) => <div className="flex items-center justify-between gap-4 py-4" key={label}><dt className="text-sm text-[#68736c]">{label}</dt><dd className="text-sm font-bold text-[#223128]">{value}</dd></div>)}</dl></section></div></section></PortalShell>;
}

function Kpi({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: number; note: string }) { return <div className="ksit-card min-h-[172px] p-5"><div className="flex items-start justify-between text-[#0b5c2c]"><p className="text-sm font-medium text-[#59655e]">{label}</p>{icon}</div><p className="mt-7 text-3xl font-extrabold tracking-[-0.04em]">{value}</p><p className="mt-1 text-xs text-[#68736c]">{note}</p></div>; }
