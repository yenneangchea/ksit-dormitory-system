'use client';

import { useEffect, useState } from 'react';
import { Building2, Pencil, Plus, QrCode, ShieldCheck, Trash2, UsersRound, Wrench } from 'lucide-react';
import { PortalShell } from '@/components/portal-shell';
import { DashboardRoleGuardLoading, useRoleGuard } from '@/components/role-guard';
import { buildingsAPI, dashboardAPI, roomsAPI, type DashboardSummary, usersAPI } from '@/lib/api';
import type { Building, Room, User, UserRole } from '@/types';

type BuildingWithRooms = Building & { rooms?: Room[] };
type ModalState = { type: 'user'; user?: User } | { type: 'building'; building?: BuildingWithRooms } | { type: 'room'; room?: Room } | null;

const emptySummary: DashboardSummary = { buildings: 0, rooms_in_service: 0, rooms_total: 0, total_capacity: 0, occupied_beds: 0, vacant_beds: 0, occupancy_percent: 0, pending_maintenance: 0, pending_applications: 0, attendance_today: 0 };
const roleOptions: UserRole[] = ['admin', 'manager', 'teacher', 'student'];

export default function AdminDashboard() {
  const { isAuthorized, isChecking } = useRoleGuard('admin');
  const [summary, setSummary] = useState(emptySummary);
  const [users, setUsers] = useState<User[]>([]);
  const [buildings, setBuildings] = useState<BuildingWithRooms[]>([]);
  const [notice, setNotice] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);

  async function load() {
    const [summaryResponse, usersResponse, buildingsResponse] = await Promise.all([dashboardAPI.summary(), usersAPI.list(), buildingsAPI.list()]);
    if (summaryResponse.success && summaryResponse.data) setSummary(summaryResponse.data);
    if (usersResponse.success && usersResponse.data) setUsers(usersResponse.data);
    if (buildingsResponse.success && buildingsResponse.data) setBuildings(buildingsResponse.data as BuildingWithRooms[]);
  }

  useEffect(() => {
    if (!isAuthorized) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [isAuthorized]);

  async function runAction(action: () => Promise<{ success: boolean; message?: string; error?: { message: string } }>, successMessage: string) {
    setIsWorking(true);
    const response = await action();
    setIsWorking(false);
    setNotice(response.success ? response.message || successMessage : response.error?.message || 'The requested operation could not be completed.');
    if (response.success) {
      setModal(null);
      await load();
    }
  }

  async function submitUser(formData: FormData) {
    const payload = {
      full_name_khmer: String(formData.get('full_name_khmer') || ''),
      full_name_latin: String(formData.get('full_name_latin') || ''),
      email: String(formData.get('email') || ''),
      phone: String(formData.get('phone') || ''),
      gender: String(formData.get('gender') || 'male') as User['gender'],
      role: String(formData.get('role') || 'student') as UserRole,
      password: String(formData.get('password') || ''),
    };
    if (modal?.type === 'user' && modal.user) {
      const { password, ...profile } = payload;
      await runAction(() => usersAPI.update(modal.user!.id, password ? { ...profile, password } : profile), 'User account updated.');
      return;
    }
    await runAction(() => usersAPI.create(payload), 'User account created.');
  }

  async function submitBuilding(formData: FormData) {
    const payload = {
      code: String(formData.get('code') || ''),
      name: String(formData.get('name') || ''),
      gender_restriction: String(formData.get('gender_restriction') || 'mixed') as Building['gender_restriction'],
      total_floors: Number(formData.get('total_floors') || 1),
      description: String(formData.get('description') || ''),
    };
    if (modal?.type === 'building' && modal.building) {
      await runAction(() => buildingsAPI.update(modal.building!.id, payload), 'Building updated.');
      return;
    }
    await runAction(() => buildingsAPI.create(payload), 'Building created.');
  }

  async function submitRoom(formData: FormData) {
    const payload = {
      building_id: String(formData.get('building_id') || ''),
      room_number: String(formData.get('room_number') || ''),
      floor_number: Number(formData.get('floor_number') || 1),
      capacity: Number(formData.get('capacity') || 4),
      gender: String(formData.get('gender') || 'male') as Room['gender'],
      assigned_major: String(formData.get('assigned_major') || ''),
      assigned_year: Number(formData.get('assigned_year') || 0) || undefined,
      status: String(formData.get('status') || 'available') as Room['status'],
      regenerate_magic_qr: formData.get('regenerate_magic_qr') === 'on',
    };
    if (modal?.type === 'room' && modal.room) {
      await runAction(() => roomsAPI.update(modal.room!.id, payload), 'Room configuration updated.');
      return;
    }
    await runAction(() => roomsAPI.create(payload), 'Room created with a new Magic QR code.');
  }

  if (isChecking) return <DashboardRoleGuardLoading />;
  if (!isAuthorized) return null;

  return (
    <PortalShell role="admin">
      <section className="min-h-[calc(100vh-156px)]">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><h1 className="text-[29px] font-extrabold tracking-[-0.045em]">Welcome back, Admin Portal</h1><p className="mt-1.5 text-sm text-[#68736c]">Manage user access and residence configuration from one protected workspace.</p></div>
          <div className="flex flex-wrap gap-2"><ActionButton icon={<Plus />} onClick={() => setModal({ type: 'user' })}>Add new user</ActionButton><ActionButton icon={<Building2 />} tone="secondary" onClick={() => setModal({ type: 'building' })}>Add building</ActionButton><ActionButton icon={<QrCode />} tone="secondary" onClick={() => setModal({ type: 'room' })}>Add room</ActionButton></div>
        </div>
        {notice && <div role="status" className="mb-5 rounded-xl border border-[#cfe0d1] bg-[#edf7ee] px-4 py-3 text-sm text-[#16582b]">{notice}</div>}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Kpi icon={<UsersRound />} label="Registered users" value={users.length} note="Active role accounts" /><Kpi icon={<Building2 />} label="Buildings" value={summary.buildings} note={`${summary.rooms_total} configured rooms`} /><Kpi icon={<ShieldCheck />} label="Pending review" value={summary.pending_applications} note="Residence applications" /><Kpi icon={<Wrench />} label="Open work orders" value={summary.pending_maintenance} note="Manager action queue" /></div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
          <section className="ksit-card overflow-hidden"><div className="flex items-start justify-between gap-4 p-6"><div><h2 className="text-lg font-bold">User access control</h2><p className="mt-1 text-sm text-[#68736c]">Create, edit, reset passwords, assign roles, or remove accounts.</p></div><button onClick={() => setModal({ type: 'user' })} className="rounded-lg bg-[#0b5c2c] px-3 py-2 text-xs font-bold text-white hover:bg-[#084a23]">Add user</button></div><div className="max-h-[510px] overflow-auto border-t border-[#edf0ed]"><table className="w-full min-w-[760px] text-left text-sm"><thead className="sticky top-0 bg-[#fafcf9] text-xs uppercase tracking-[0.08em] text-[#748078]"><tr><th className="px-6 py-3">Account</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Role</th><th className="px-6 py-3 text-right">Actions</th></tr></thead><tbody>{users.length === 0 ? <tr><td colSpan={4} className="px-6 py-8 text-[#68736c]">No user records are available.</td></tr> : users.map((user) => <tr className="border-t border-[#edf0ed]" key={user.id}><td className="px-6 py-4"><p className="font-semibold">{user.full_name_latin}</p><p className="mt-1 text-xs text-[#68736c]">{user.full_name_khmer}</p></td><td className="px-4 py-4"><p>{user.email}</p><p className="mt-1 text-xs text-[#68736c]">{user.phone}</p></td><td className="px-4 py-4"><span className="rounded-full bg-[#edf7ee] px-2.5 py-1 text-xs font-bold capitalize text-[#16582b]">{user.role}</span></td><td className="px-6 py-4"><div className="flex justify-end gap-2"><IconButton label="Edit user" onClick={() => setModal({ type: 'user', user })}><Pencil /></IconButton><IconButton label="Delete user" tone="danger" onClick={() => { if (window.confirm(`Delete ${user.full_name_latin}? This cannot be undone.`)) void runAction(() => usersAPI.remove(user.id), 'User deleted.'); }}><Trash2 /></IconButton></div></td></tr>)}</tbody></table></div></section>
          <section className="ksit-card p-6"><h2 className="text-lg font-bold">Operational status</h2><p className="mt-1 text-sm text-[#68736c]">Core residence capacity and workflow indicators.</p><dl className="mt-6 divide-y divide-[#edf0ed]">{[['Occupancy', `${summary.occupied_beds} / ${summary.total_capacity} beds`], ['Room serviceability', `${summary.rooms_in_service} rooms active`], ['Attendance today', `${summary.attendance_today} scans recorded`], ['Available capacity', `${summary.vacant_beds} beds vacant`]].map(([label, value]) => <div className="flex items-center justify-between gap-4 py-4" key={label}><dt className="text-sm text-[#68736c]">{label}</dt><dd className="text-sm font-bold text-[#223128]">{value}</dd></div>)}</dl></section>
        </div>

        <section className="ksit-card mt-8 overflow-hidden"><div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-lg font-bold">Buildings & rooms</h2><p className="mt-1 text-sm text-[#68736c]">Configure residence capacity, room eligibility, and Magic QR identities.</p></div><div className="flex gap-2"><button onClick={() => setModal({ type: 'building' })} className="rounded-lg border border-[#dce3dc] px-3 py-2 text-xs font-bold text-[#274333] hover:bg-[#f4f8f4]">Add building</button><button onClick={() => setModal({ type: 'room' })} className="rounded-lg bg-[#0b5c2c] px-3 py-2 text-xs font-bold text-white hover:bg-[#084a23]">Add room</button></div></div><div className="border-t border-[#edf0ed]"><div className="grid gap-4 p-5 lg:grid-cols-2">{buildings.length === 0 ? <p className="text-sm text-[#68736c]">Create a building to begin configuring rooms.</p> : buildings.map((building) => <div key={building.id} className="rounded-xl border border-[#e1e7e1] bg-[#fcfdfb] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{building.code} · {building.name}</p><p className="mt-1 text-xs text-[#68736c]">{building.gender_restriction} residence · {building.total_floors} floors</p></div><div className="flex gap-1"><IconButton label="Edit building" onClick={() => setModal({ type: 'building', building })}><Pencil /></IconButton><IconButton label="Delete building" tone="danger" onClick={() => { if (window.confirm(`Delete ${building.name}? Rooms must be removed first.`)) void runAction(() => buildingsAPI.remove(building.id), 'Building deleted.'); }}><Trash2 /></IconButton></div></div><div className="mt-4 divide-y divide-[#edf0ed]">{(building.rooms || []).length === 0 ? <p className="py-3 text-xs text-[#7b857e]">No rooms configured.</p> : building.rooms?.map((room) => <div className="flex items-center justify-between gap-3 py-3" key={room.id}><div><p className="text-sm font-semibold">Room {room.room_number} · Floor {room.floor_number}</p><p className="mt-1 text-xs text-[#68736c]">{room.occupied_count}/{room.capacity} beds · {room.gender} · {room.status}</p></div><div className="flex gap-1"><IconButton label="Edit room" onClick={() => setModal({ type: 'room', room })}><Pencil /></IconButton><IconButton label="Delete room" tone="danger" onClick={() => { if (window.confirm(`Delete room ${room.room_number}?`)) void runAction(() => roomsAPI.remove(room.id), 'Room deleted.'); }}><Trash2 /></IconButton></div></div>)}</div></div>)}</div></div></section>
      </section>

      {modal?.type === 'user' && <Modal title={modal.user ? 'Edit user account' : 'Add new user account'} onClose={() => setModal(null)}><form action={submitUser} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Khmer full name" name="full_name_khmer" defaultValue={modal.user?.full_name_khmer} required /><Field label="Latin full name" name="full_name_latin" defaultValue={modal.user?.full_name_latin} required /><Field label="Email address" name="email" type="email" defaultValue={modal.user?.email} required /><Field label="Phone number" name="phone" defaultValue={modal.user?.phone} required /><SelectField label="Gender" name="gender" defaultValue={modal.user?.gender || 'male'} options={[['male', 'Male'], ['female', 'Female']]} /><SelectField label="Role" name="role" defaultValue={modal.user?.role || 'student'} options={roleOptions.map((role) => [role, role[0].toUpperCase() + role.slice(1)])} /></div><Field label={modal.user ? 'New temporary password (optional)' : 'Temporary password'} name="password" type="password" minLength={8} required={!modal.user} hint={modal.user ? 'Leave blank to keep the current password.' : 'Minimum 8 characters.'} /><ModalActions busy={isWorking} submitLabel={modal.user ? 'Save user changes' : 'Create user'} /></form></Modal>}
      {modal?.type === 'building' && <Modal title={modal.building ? 'Edit building' : 'Add building'} onClose={() => setModal(null)}><form action={submitBuilding} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Building code" name="code" defaultValue={modal.building?.code} required /><Field label="Building name" name="name" defaultValue={modal.building?.name} required /><SelectField label="Gender restriction" name="gender_restriction" defaultValue={modal.building?.gender_restriction || 'mixed'} options={[['male', 'Male'], ['female', 'Female'], ['mixed', 'Mixed']]} /><Field label="Total floors" name="total_floors" type="number" min="1" defaultValue={String(modal.building?.total_floors || 1)} required /></div><label className="block text-sm font-medium text-[#39473f]">Description<textarea name="description" defaultValue={modal.building?.description} className="mt-1.5 min-h-24 w-full rounded-xl border border-[#dce3dc] bg-white p-3 text-sm outline-none focus:border-[#5f9b6f]" placeholder="Optional residence notes" /></label><ModalActions busy={isWorking} submitLabel={modal.building ? 'Save building' : 'Create building'} /></form></Modal>}
      {modal?.type === 'room' && <Modal title={modal.room ? 'Edit room configuration' : 'Add room'} onClose={() => setModal(null)}><form action={submitRoom} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><SelectField label="Building" name="building_id" defaultValue={modal.room?.building_id || ''} options={[['', 'Choose building'], ...buildings.map((building) => [building.id, `${building.code} · ${building.name}`])]} required /><Field label="Room number" name="room_number" defaultValue={modal.room?.room_number} required /><Field label="Floor" name="floor_number" type="number" min="1" defaultValue={String(modal.room?.floor_number || 1)} required /><Field label="Capacity" name="capacity" type="number" min="1" defaultValue={String(modal.room?.capacity || 4)} required /><SelectField label="Assigned gender" name="gender" defaultValue={modal.room?.gender || 'male'} options={[['male', 'Male'], ['female', 'Female']]} /><SelectField label="Room status" name="status" defaultValue={modal.room?.status || 'available'} options={[['available', 'Available'], ['full', 'Full'], ['maintenance', 'Maintenance']]} /><Field label="Assigned major" name="assigned_major" defaultValue={modal.room?.assigned_major} hint="Optional cohort preference" /><Field label="Assigned academic year" name="assigned_year" type="number" min="1" max="4" defaultValue={modal.room?.assigned_year ? String(modal.room.assigned_year) : ''} hint="Optional year 1–4" /></div>{modal.room && <label className="flex items-center gap-2 rounded-lg bg-[#f3f8f3] px-3 py-2 text-sm text-[#31513d]"><input type="checkbox" name="regenerate_magic_qr" />Regenerate the room Magic QR code</label>}<ModalActions busy={isWorking} submitLabel={modal.room ? 'Save room' : 'Create room'} /></form></Modal>}
    </PortalShell>
  );
}

function Kpi({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: number; note: string }) { return <div className="ksit-card min-h-[172px] p-5"><div className="flex items-start justify-between text-[#0b5c2c]"><p className="text-sm font-medium text-[#59655e]">{label}</p>{icon}</div><p className="mt-7 text-3xl font-extrabold tracking-[-0.04em]">{value}</p><p className="mt-1 text-xs text-[#68736c]">{note}</p></div>; }
function ActionButton({ icon, children, onClick, tone = 'primary' }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void; tone?: 'primary' | 'secondary' }) { return <button onClick={onClick} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${tone === 'primary' ? 'bg-[#0b5c2c] text-white hover:bg-[#084a23]' : 'border border-[#dce3dc] bg-white text-[#31513d] hover:bg-[#f4f8f4]'}`}>{icon}{children}</button>; }
function IconButton({ children, label, onClick, tone = 'default' }: { children: React.ReactNode; label: string; onClick: () => void; tone?: 'default' | 'danger' }) { return <button aria-label={label} title={label} onClick={onClick} className={`rounded-lg p-2 ${tone === 'danger' ? 'text-[#ad4939] hover:bg-[#fff3f1]' : 'text-[#3d5747] hover:bg-[#edf5ee]'}`}>{children}</button>; }
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#10211780] p-4" role="dialog" aria-modal="true" aria-label={title}><section className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between gap-4"><h2 className="text-xl font-bold text-[#18231d]">{title}</h2><button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-[#68736c] hover:bg-[#f2f5f1]">Close</button></div>{children}</section></div>; }
function Field({ label, hint, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) { return <label className="block text-sm font-medium text-[#39473f]">{label}<input {...props} className="mt-1.5 h-10 w-full rounded-xl border border-[#dce3dc] bg-white px-3 text-sm outline-none focus:border-[#5f9b6f]" />{hint && <span className="mt-1 block text-xs font-normal text-[#748078]">{hint}</span>}</label>; }
function SelectField({ label, name, defaultValue, options, required }: { label: string; name: string; defaultValue: string; options: string[][]; required?: boolean }) { return <label className="block text-sm font-medium text-[#39473f]">{label}<select name={name} defaultValue={defaultValue} required={required} className="mt-1.5 h-10 w-full rounded-xl border border-[#dce3dc] bg-white px-3 text-sm outline-none focus:border-[#5f9b6f]">{options.map(([value, optionLabel]) => <option value={value} key={value}>{optionLabel}</option>)}</select></label>; }
function ModalActions({ busy, submitLabel }: { busy: boolean; submitLabel: string }) { return <div className="flex justify-end gap-3 border-t border-[#edf0ed] pt-5"><button disabled={busy} className="rounded-lg bg-[#0b5c2c] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Saving…' : submitLabel}</button></div>; }
