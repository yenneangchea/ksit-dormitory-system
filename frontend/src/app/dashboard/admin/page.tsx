'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Building2, KeyRound, Megaphone, Pencil, Plus, QrCode, ShieldCheck, Trash2, UsersRound, Wrench } from 'lucide-react';
import { PortalShell } from '@/components/portal-shell';
import { DashboardAnalytics } from '@/components/dashboard-analytics';
import { DashboardRoleGuardLoading, useRoleGuard } from '@/components/role-guard';
import { RoomAssignmentBoard } from '@/components/room-assignment-board';
import { buildingsAPI, dashboardAPI, roomAssignmentsAPI, roomsAPI, type AssignmentBoard, type DashboardAnalytics as DashboardAnalyticsData, type DashboardSummary, type PasswordResetRequest, usersAPI } from '@/lib/api';
import type { Building, Room, User, UserRole } from '@/types';

type BuildingWithRooms = Building & { rooms?: Room[] };
type ModalState = { type: 'user'; user?: User } | { type: 'reset-password'; user: User } | { type: 'reset-request'; request: PasswordResetRequest } | { type: 'building'; building?: BuildingWithRooms } | { type: 'room'; room?: Room } | null;
type NewsPost = { id: string; title: string; body: string; is_visible: boolean; published_at: string; created_at?: string; updated_at?: string };
type SystemSettings = { academic_levels?: string[]; utility_rates?: { electricity_khr_per_kwh?: number; water_khr_per_m3?: number; trash_khr_per_room?: number }; housing_fee?: { annual_khr?: number }; telegram?: { username?: string; webhook_configured?: boolean } };
type AnnouncementManagement = { settings: { top_ticker?: { text?: string; link?: string }; registration_deadline?: { title?: string; badge?: string; deadline_at?: string }; system_settings?: SystemSettings }; news_posts: NewsPost[] };
type NewsModal = NewsPost | 'new' | null;
type AdminTab = 'dashboard' | 'users' | 'residence' | 'cms' | 'settings';

const emptySummary: DashboardSummary = { buildings: 0, rooms_in_service: 0, rooms_total: 0, total_capacity: 0, occupied_beds: 0, vacant_beds: 0, occupancy_percent: 0, pending_maintenance: 0, pending_applications: 0, attendance_today: 0 };
const roleOptions: UserRole[] = ['admin', 'manager', 'teacher', 'student'];
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || '').trim() || 'https://ksit-dorm-api.vercel.app';

async function announcementRequest<T>(path: string, init?: RequestInit): Promise<{ success: boolean; data?: T; message?: string; error?: { message: string } }> {
  try {
    const token = window.localStorage.getItem('ksit_session_token');
    const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init?.headers || {}) } });
    const payload = await response.json();
    return response.ok ? payload : { success: false, error: { message: payload.error?.message || 'The announcement request could not be completed.' } };
  } catch (error) {
    return { success: false, error: { message: error instanceof Error ? error.message : 'Network request failed.' } };
  }
}

function AdminDashboardContent() {
  const { isAuthorized, isChecking } = useRoleGuard('admin');
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState(emptySummary);
  const [analytics, setAnalytics] = useState<DashboardAnalyticsData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [buildings, setBuildings] = useState<BuildingWithRooms[]>([]);
  const [assignmentBoard, setAssignmentBoard] = useState<AssignmentBoard | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [announcementManagement, setAnnouncementManagement] = useState<AnnouncementManagement>({ settings: {}, news_posts: [] });
  const [passwordResetRequests, setPasswordResetRequests] = useState<PasswordResetRequest[]>([]);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [newsModal, setNewsModal] = useState<NewsModal>(null);
  const [userSearch, setUserSearch] = useState('');
  const requestedTab = searchParams.get('tab');
  const activeTab: AdminTab = requestedTab === 'users' || requestedTab === 'residence' || requestedTab === 'cms' || requestedTab === 'settings' ? requestedTab : 'dashboard';
  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => [user.full_name_khmer, user.full_name_latin, user.email, user.phone, user.role].some((value) => String(value || '').toLowerCase().includes(query)));
  }, [userSearch, users]);

  async function load() {
    const [summaryResponse, analyticsResponse, usersResponse, buildingsResponse, announcementsResponse, resetRequestsResponse] = await Promise.all([dashboardAPI.summary(), dashboardAPI.analytics(), usersAPI.list(), buildingsAPI.list(), announcementRequest<AnnouncementManagement>('/api/announcements'), usersAPI.listPasswordResetRequests('pending')]);
    if (summaryResponse.success && summaryResponse.data) setSummary(summaryResponse.data);
    if (analyticsResponse.success && analyticsResponse.data) setAnalytics(analyticsResponse.data);
    if (usersResponse.success && usersResponse.data) setUsers(usersResponse.data);
    if (buildingsResponse.success && buildingsResponse.data) setBuildings(buildingsResponse.data as BuildingWithRooms[]);
    if (announcementsResponse.success && announcementsResponse.data) setAnnouncementManagement(announcementsResponse.data);
    if (resetRequestsResponse.success && resetRequestsResponse.data) setPasswordResetRequests(resetRequestsResponse.data);
  }

  async function loadAssignmentBoard() {
    const response = await roomAssignmentsAPI.board();
    if (response.success && response.data) setAssignmentBoard(response.data);
  }

  useEffect(() => {
    if (!isAuthorized) return;
    const timer = window.setTimeout(() => { void load(); if (activeTab === 'residence') void loadAssignmentBoard(); }, 0);
    return () => window.clearTimeout(timer);
  }, [activeTab, isAuthorized]);

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

  function createTemporaryPassword() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    const bytes = crypto.getRandomValues(new Uint32Array(16));
    return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
  }

  async function submitDirectPasswordReset(formData: FormData) {
    if (modal?.type !== 'reset-password') return;
    const password = String(formData.get('password') || '');
    await runAction(() => usersAPI.resetPassword(modal.user.id, password), 'Password reset successfully. Share it only through a secure channel.');
    setGeneratedPassword('');
  }

  async function submitPasswordRequestResolution(formData: FormData) {
    if (modal?.type !== 'reset-request') return;
    const action = String(formData.get('action') || 'resolve') as 'resolve' | 'reject';
    const password = String(formData.get('password') || '');
    await runAction(() => usersAPI.resolvePasswordResetRequest(modal.request.id, { action, ...(action === 'resolve' ? { password } : {}) }), action === 'resolve' ? 'Password request resolved.' : 'Password request rejected.');
    setGeneratedPassword('');
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

  async function manuallyPlaceStudent(applicationId: string, targetRoomId: string) {
    setIsWorking(true);
    const response = await roomAssignmentsAPI.manualMove({ application_id: applicationId, target_room_id: targetRoomId });
    setIsWorking(false);
    if (!response.success) {
      setNotice(response.error?.message || 'Unable to place the student in the selected room.');
      return;
    }
    setSelectedApplicationId(null);
    setNotice(response.message || 'Student room placement saved.');
    await Promise.all([load(), loadAssignmentBoard()]);
  }

  async function saveAnnouncementSettings(formData: FormData) {
    const deadlineInput = String(formData.get('deadline_at') || '');
    await runAction(() => announcementRequest('/api/announcements/settings', { method: 'PUT', body: JSON.stringify({
      top_ticker: { text: String(formData.get('ticker_text') || ''), link: String(formData.get('ticker_link') || '') },
      registration_deadline: { title: String(formData.get('deadline_title') || ''), badge: String(formData.get('deadline_badge') || ''), deadline_at: deadlineInput ? new Date(deadlineInput).toISOString() : '' },
    }) }), 'Homepage announcement settings updated.');
  }

  async function saveSystemSettings(formData: FormData) {
    const academic_levels = String(formData.get('academic_levels') || '').split('\n').map((value) => value.trim()).filter(Boolean);
    await runAction(() => announcementRequest('/api/announcements/settings', { method: 'PUT', body: JSON.stringify({ system_settings: {
      academic_levels,
      utility_rates: { electricity_khr_per_kwh: Number(formData.get('electricity_rate') || 800), water_khr_per_m3: Number(formData.get('water_rate') || 1500), trash_khr_per_room: Number(formData.get('trash_fee') || 10000) },
      housing_fee: { annual_khr: Number(formData.get('housing_fee') || 120000) },
      telegram: { username: String(formData.get('telegram_username') || '@KSITDorm_bot') },
    } }) }), 'System settings updated.');
  }

  async function saveNewsPost(formData: FormData) {
    const payload = { title: String(formData.get('title') || ''), body: String(formData.get('body') || ''), is_visible: formData.get('is_visible') === 'on', published_at: new Date(String(formData.get('published_at') || new Date().toISOString())).toISOString() };
    const response = newsModal !== 'new' && newsModal ? announcementRequest(`/api/announcements/news/${newsModal.id}`, { method: 'PATCH', body: JSON.stringify(payload) }) : announcementRequest('/api/announcements/news', { method: 'POST', body: JSON.stringify(payload) });
    await runAction(() => response, newsModal === 'new' ? 'News post created.' : 'News post updated.');
    setNewsModal(null);
  }

  async function toggleNewsVisibility(post: NewsPost) {
    await runAction(() => announcementRequest(`/api/announcements/news/${post.id}`, { method: 'PATCH', body: JSON.stringify({ is_visible: !post.is_visible }) }), 'News post visibility updated.');
  }

  async function deleteNews(post: NewsPost) {
    if (!window.confirm(`Delete the news post “${post.title}”?`)) return;
    await runAction(() => announcementRequest(`/api/announcements/news/${post.id}`, { method: 'DELETE' }), 'News post deleted.');
  }

  if (isChecking) return <DashboardRoleGuardLoading />;
  if (!isAuthorized) return null;

  return (
    <PortalShell role="admin">
      <section className="min-h-[calc(100vh-156px)]">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><h1 className="text-[29px] font-extrabold tracking-[-0.045em]">{activeTab === 'dashboard' ? 'Welcome back, Admin Portal' : activeTab === 'users' ? 'User Management' : activeTab === 'residence' ? 'Buildings & Rooms' : activeTab === 'cms' ? 'Homepage CMS & News' : 'System Settings'}</h1><p className="mt-1.5 text-sm text-[#68736c]">{activeTab === 'dashboard' ? 'Live operational metrics and authorized analytics.' : 'This protected workspace displays only the section selected in the sidebar.'}</p></div>
          <div className="flex flex-wrap gap-2">{activeTab === 'users' && <ActionButton icon={<Plus />} onClick={() => setModal({ type: 'user' })}>Add new user</ActionButton>}{activeTab === 'residence' && <><ActionButton icon={<Building2 />} tone="secondary" onClick={() => setModal({ type: 'building' })}>Add building</ActionButton><ActionButton icon={<QrCode />} tone="secondary" onClick={() => setModal({ type: 'room' })}>Add room</ActionButton></>}{activeTab === 'cms' && <Link href="/dashboard/admin/homepage-editor" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#dce3dc] bg-white px-3 py-2 text-xs font-bold text-[#31513d] hover:bg-[#f4f8f4]">🎨 Edit Homepage</Link>}</div>
        </div>
        {notice && <div role="status" className="mb-5 rounded-xl border border-[#cfe0d1] bg-[#edf7ee] px-4 py-3 text-sm text-[#16582b]">{notice}</div>}
        {activeTab === 'dashboard' && <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Kpi icon={<UsersRound />} label="Registered users" value={users.length} note="Active role accounts" /><Kpi icon={<Building2 />} label="Buildings" value={summary.buildings} note={`${summary.rooms_total} configured rooms`} /><Kpi icon={<ShieldCheck />} label="Pending review" value={summary.pending_applications} note="Residence applications" /><Kpi icon={<Wrench />} label="Open work orders" value={summary.pending_maintenance} note="Manager action queue" /></div>{analytics && <DashboardAnalytics data={analytics} />}</>}
        {activeTab === 'users' && <><UserManagementPanel users={filteredUsers} search={userSearch} onSearch={setUserSearch} onAdd={() => setModal({ type: 'user' })} onEdit={(user) => setModal({ type: 'user', user })} onReset={(user) => { setGeneratedPassword(''); setModal({ type: 'reset-password', user }); }} onDelete={(user) => { if (window.confirm(`Delete ${user.full_name_latin}? This cannot be undone.`)) void runAction(() => usersAPI.remove(user.id), 'User deleted.'); }} /><PasswordResetRequestsPanel requests={passwordResetRequests} onResolve={(request) => { setGeneratedPassword(''); setModal({ type: 'reset-request', request }); }} /></>}
        {activeTab === 'residence' && <><ResidenceConfigurationPanel buildings={buildings} onAddBuilding={() => setModal({ type: 'building' })} onAddRoom={() => setModal({ type: 'room' })} onEditBuilding={(building) => setModal({ type: 'building', building })} onEditRoom={(room) => setModal({ type: 'room', room })} onDeleteBuilding={(building) => { if (window.confirm(`Delete ${building.name}? Rooms must be removed first.`)) void runAction(() => buildingsAPI.remove(building.id), 'Building deleted.'); }} onDeleteRoom={(room) => { if (window.confirm(`Delete room ${room.room_number}?`)) void runAction(() => roomsAPI.remove(room.id), 'Room deleted.'); }} /><RoomAssignmentBoard board={assignmentBoard} selectedApplicationId={selectedApplicationId} isWorking={isWorking} onSelect={setSelectedApplicationId} onMove={manuallyPlaceStudent} /></>}
        {activeTab === 'cms' && <AnnouncementManagementPanel management={announcementManagement} isWorking={isWorking} onSaveSettings={saveAnnouncementSettings} onCreate={() => setNewsModal('new')} onEdit={(post) => setNewsModal(post)} onToggle={(post) => void toggleNewsVisibility(post)} onDelete={(post) => void deleteNews(post)} />}
        {activeTab === 'settings' && <SystemSettingsPanel settings={announcementManagement.settings.system_settings} isWorking={isWorking} onSave={saveSystemSettings} />}
      </section>

      {modal?.type === 'user' && <Modal title={modal.user ? 'Edit user account' : 'Add new user account'} onClose={() => setModal(null)}><form action={submitUser} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Khmer full name" name="full_name_khmer" defaultValue={modal.user?.full_name_khmer} required /><Field label="Latin full name" name="full_name_latin" defaultValue={modal.user?.full_name_latin} required /><Field label="Email address" name="email" type="email" defaultValue={modal.user?.email} required /><Field label="Phone number" name="phone" defaultValue={modal.user?.phone} required /><SelectField label="Gender" name="gender" defaultValue={modal.user?.gender || 'male'} options={[['male', 'Male'], ['female', 'Female']]} /><SelectField label="Role" name="role" defaultValue={modal.user?.role || 'student'} options={roleOptions.map((role) => [role, role[0].toUpperCase() + role.slice(1)])} /></div><Field label={modal.user ? 'New temporary password (optional)' : 'Temporary password'} name="password" type="password" minLength={8} required={!modal.user} hint={modal.user ? 'Leave blank to keep the current password.' : 'Minimum 8 characters.'} /><ModalActions busy={isWorking} submitLabel={modal.user ? 'Save user changes' : 'Create user'} /></form></Modal>}
      {modal?.type === 'reset-password' && <Modal title={`Reset password · ${modal.user.full_name_latin}`} onClose={() => setModal(null)}><form action={submitDirectPasswordReset} className="space-y-4"><p className="rounded-lg bg-[#fff8e9] px-3 py-2 text-sm text-[#765316]">Set a custom temporary password or generate one. Copy it now and share it only through a secure channel; it will not be displayed again.</p><Field label="New temporary password" name="password" type="text" minLength={8} value={generatedPassword} onChange={(event) => setGeneratedPassword(event.target.value)} required /><button type="button" onClick={() => setGeneratedPassword(createTemporaryPassword())} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#b9d2bf] px-3 py-2 text-xs font-bold text-[#0b5c2c] hover:bg-[#edf7ee]"><KeyRound className="size-4" /> Generate strong password</button><ModalActions busy={isWorking} submitLabel="Reset password" /></form></Modal>}
      {modal?.type === 'reset-request' && <Modal title="Resolve password reset request" onClose={() => setModal(null)}><form action={submitPasswordRequestResolution} className="space-y-4"><div className="rounded-lg bg-[#f4f8f4] p-3 text-sm text-[#31513d]"><p><b>Account:</b> {modal.request.email}</p><p className="mt-1"><b>Reason:</b> {modal.request.reason || 'No reason supplied.'}</p></div><Field label="New temporary password" name="password" type="text" minLength={8} value={generatedPassword} onChange={(event) => setGeneratedPassword(event.target.value)} required /><button type="button" onClick={() => setGeneratedPassword(createTemporaryPassword())} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#b9d2bf] px-3 py-2 text-xs font-bold text-[#0b5c2c] hover:bg-[#edf7ee]"><KeyRound className="size-4" /> Generate strong password</button><div className="flex flex-wrap justify-end gap-3 border-t border-[#edf0ed] pt-5"><button type="submit" name="action" value="reject" disabled={isWorking} className="min-h-11 rounded-lg border border-[#e7c7c1] px-4 py-2 text-sm font-bold text-[#ad4939]">Reject request</button><button type="submit" name="action" value="resolve" disabled={isWorking} className="min-h-11 rounded-lg bg-[#0b5c2c] px-4 py-2 text-sm font-bold text-white">{isWorking ? 'Saving…' : 'Reset & resolve'}</button></div></form></Modal>}
      {modal?.type === 'building' && <Modal title={modal.building ? 'Edit building' : 'Add building'} onClose={() => setModal(null)}><form action={submitBuilding} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Building code" name="code" defaultValue={modal.building?.code} required /><Field label="Building name" name="name" defaultValue={modal.building?.name} required /><SelectField label="Gender restriction" name="gender_restriction" defaultValue={modal.building?.gender_restriction || 'mixed'} options={[['male', 'Male'], ['female', 'Female'], ['mixed', 'Mixed']]} /><Field label="Total floors" name="total_floors" type="number" min="1" defaultValue={String(modal.building?.total_floors || 1)} required /></div><label className="block text-sm font-medium text-[#39473f]">Description<textarea name="description" defaultValue={modal.building?.description} className="mt-1.5 min-h-24 w-full rounded-xl border border-[#dce3dc] bg-white p-3 text-sm outline-none focus:border-[#5f9b6f]" placeholder="Optional residence notes" /></label><ModalActions busy={isWorking} submitLabel={modal.building ? 'Save building' : 'Create building'} /></form></Modal>}
      {modal?.type === 'room' && <Modal title={modal.room ? 'Edit room configuration' : 'Add room'} onClose={() => setModal(null)}><form action={submitRoom} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><SelectField label="Building" name="building_id" defaultValue={modal.room?.building_id || ''} options={[['', 'Choose building'], ...buildings.map((building) => [building.id, `${building.code} · ${building.name}`])]} required /><Field label="Room number" name="room_number" defaultValue={modal.room?.room_number} required /><Field label="Floor" name="floor_number" type="number" min="1" defaultValue={String(modal.room?.floor_number || 1)} required /><Field label="Capacity" name="capacity" type="number" min="1" defaultValue={String(modal.room?.capacity || 4)} required /><SelectField label="Assigned gender" name="gender" defaultValue={modal.room?.gender || 'male'} options={[['male', 'Male'], ['female', 'Female']]} /><SelectField label="Room status" name="status" defaultValue={modal.room?.status || 'available'} options={[['available', 'Available'], ['full', 'Full'], ['maintenance', 'Maintenance']]} /><Field label="Assigned major" name="assigned_major" defaultValue={modal.room?.assigned_major} hint="Optional cohort preference" /><Field label="Assigned academic year" name="assigned_year" type="number" min="1" max="4" defaultValue={modal.room?.assigned_year ? String(modal.room.assigned_year) : ''} hint="Optional year 1–4" /></div>{modal.room && <label className="flex items-center gap-2 rounded-lg bg-[#f3f8f3] px-3 py-2 text-sm text-[#31513d]"><input type="checkbox" name="regenerate_magic_qr" />Regenerate the room Magic QR code</label>}<ModalActions busy={isWorking} submitLabel={modal.room ? 'Save room' : 'Create room'} /></form></Modal>}
      {newsModal && <Modal title={newsModal === 'new' ? 'Create news post' : 'Edit news post'} onClose={() => setNewsModal(null)}><form action={saveNewsPost} className="space-y-4"><Field label="Title" name="title" defaultValue={newsModal === 'new' ? '' : newsModal.title} required /><label className="block text-sm font-medium text-[#39473f]">News content<textarea name="body" defaultValue={newsModal === 'new' ? '' : newsModal.body} className="mt-1.5 min-h-28 w-full rounded-xl border border-[#dce3dc] bg-white p-3 text-sm outline-none focus:border-[#5f9b6f]" /></label><Field label="Published date" name="published_at" type="datetime-local" defaultValue={newsModal === 'new' ? new Date().toISOString().slice(0, 16) : new Date(newsModal.published_at).toISOString().slice(0, 16)} required /><label className="flex items-center gap-2 rounded-lg bg-[#f3f8f3] px-3 py-2 text-sm text-[#31513d]"><input type="checkbox" name="is_visible" defaultChecked={newsModal === 'new' ? true : newsModal.is_visible} />Visible on the public site</label><ModalActions busy={isWorking} submitLabel={newsModal === 'new' ? 'Create post' : 'Save post'} /></form></Modal>}
    </PortalShell>
  );
}

export default function AdminDashboard() {
  return <Suspense fallback={<DashboardRoleGuardLoading />}><AdminDashboardContent /></Suspense>;
}

function UserManagementPanel({ users, search, onSearch, onAdd, onEdit, onReset, onDelete }: { users: User[]; search: string; onSearch: (value: string) => void; onAdd: () => void; onEdit: (user: User) => void; onReset: (user: User) => void; onDelete: (user: User) => void }) {
  return <section className="ksit-card mt-2 overflow-hidden"><div className="flex flex-col gap-4 p-6 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="text-lg font-bold">User access control</h2><p className="mt-1 text-sm text-[#68736c]">Create, search, edit, reset passwords, assign roles, or remove accounts.</p></div><div className="flex flex-col gap-2 sm:flex-row"><input value={search} onChange={(event) => onSearch(event.target.value)} aria-label="Search users" placeholder="Search name, email, phone, or role" className="h-10 min-w-[260px] rounded-xl border border-[#dce3dc] bg-white px-3 text-sm outline-none focus:border-[#5f9b6f]" /><button onClick={onAdd} className="rounded-lg bg-[#0b5c2c] px-3 py-2 text-xs font-bold text-white hover:bg-[#084a23]">Add user</button></div></div><div className="max-h-[590px] overflow-auto border-t border-[#edf0ed]"><table className="w-full min-w-[760px] text-left text-sm"><thead className="sticky top-0 bg-[#fafcf9] text-xs uppercase tracking-[0.08em] text-[#748078]"><tr><th className="px-6 py-3">Account</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Role</th><th className="px-6 py-3 text-right">Actions</th></tr></thead><tbody>{users.length === 0 ? <tr><td colSpan={4} className="px-6 py-8 text-[#68736c]">No matching user records are available.</td></tr> : users.map((user) => <tr className="border-t border-[#edf0ed]" key={user.id}><td className="px-6 py-4"><p className="font-semibold">{user.full_name_latin}</p><p className="mt-1 text-xs text-[#68736c]">{user.full_name_khmer}</p></td><td className="px-4 py-4"><p>{user.email}</p><p className="mt-1 text-xs text-[#68736c]">{user.phone}</p></td><td className="px-4 py-4"><span className="rounded-full bg-[#edf7ee] px-2.5 py-1 text-xs font-bold capitalize text-[#16582b]">{user.role}</span></td><td className="px-6 py-4"><div className="flex justify-end gap-2"><IconButton label="Reset password" onClick={() => onReset(user)}><KeyRound /></IconButton><IconButton label="Edit user" onClick={() => onEdit(user)}><Pencil /></IconButton><IconButton label="Delete user" tone="danger" onClick={() => onDelete(user)}><Trash2 /></IconButton></div></td></tr>)}</tbody></table></div></section>;
}

function PasswordResetRequestsPanel({ requests, onResolve }: { requests: PasswordResetRequest[]; onResolve: (request: PasswordResetRequest) => void }) {
  return <section className="ksit-card mt-6 overflow-hidden"><div className="flex items-center justify-between gap-4 p-6"><div><h2 className="text-lg font-bold">Pending Password Requests</h2><p className="mt-1 text-sm text-[#68736c]">Review identity requests and set a secure temporary password when approved.</p></div><span className="rounded-full bg-[#fff1d8] px-3 py-1 text-xs font-extrabold text-[#8a5b10]">{requests.length} pending</span></div><div className="divide-y divide-[#edf0ed] border-t border-[#edf0ed]">{requests.length === 0 ? <p className="p-6 text-sm text-[#68736c]">No pending password reset requests.</p> : requests.map((request) => <div key={request.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-[#24332a]">{request.email}</p><p className="mt-1 text-xs leading-5 text-[#68736c]">{request.reason || 'No reason supplied.'}</p><p className="mt-1 text-[11px] text-[#8a968d]">Requested {new Date(request.created_at).toLocaleString()}</p></div><button onClick={() => onResolve(request)} className="min-h-11 rounded-lg border border-[#b9d2bf] px-3 py-2 text-xs font-bold text-[#0b5c2c] hover:bg-[#edf7ee]">Review request</button></div>)}</div></section>;
}

function ResidenceConfigurationPanel({ buildings, onAddBuilding, onAddRoom, onEditBuilding, onEditRoom, onDeleteBuilding, onDeleteRoom }: { buildings: BuildingWithRooms[]; onAddBuilding: () => void; onAddRoom: () => void; onEditBuilding: (building: BuildingWithRooms) => void; onEditRoom: (room: Room) => void; onDeleteBuilding: (building: BuildingWithRooms) => void; onDeleteRoom: (room: Room) => void }) {
  return <section className="ksit-card mt-2 overflow-hidden"><div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-lg font-bold">Buildings & rooms</h2><p className="mt-1 text-sm text-[#68736c]">Configure residence capacity, room eligibility, and Magic QR identities.</p></div><div className="flex gap-2"><button onClick={onAddBuilding} className="rounded-lg border border-[#dce3dc] px-3 py-2 text-xs font-bold text-[#274333] hover:bg-[#f4f8f4]">Add building</button><button onClick={onAddRoom} className="rounded-lg bg-[#0b5c2c] px-3 py-2 text-xs font-bold text-white hover:bg-[#084a23]">Add room</button></div></div><div className="border-t border-[#edf0ed]"><div className="grid gap-4 p-5 lg:grid-cols-2">{buildings.length === 0 ? <p className="text-sm text-[#68736c]">Create a building to begin configuring rooms.</p> : buildings.map((building) => <div key={building.id} className="rounded-xl border border-[#e1e7e1] bg-[#fcfdfb] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{building.code} · {building.name}</p><p className="mt-1 text-xs text-[#68736c]">{building.gender_restriction} residence · {building.total_floors} floors</p></div><div className="flex gap-1"><IconButton label="Edit building" onClick={() => onEditBuilding(building)}><Pencil /></IconButton><IconButton label="Delete building" tone="danger" onClick={() => onDeleteBuilding(building)}><Trash2 /></IconButton></div></div><div className="mt-4 divide-y divide-[#edf0ed]">{(building.rooms || []).length === 0 ? <p className="py-3 text-xs text-[#7b857e]">No rooms configured.</p> : building.rooms?.map((room) => <div className="flex items-center justify-between gap-3 py-3" key={room.id}><div><p className="text-sm font-semibold">Room {room.room_number} · Floor {room.floor_number}</p><p className="mt-1 text-xs text-[#68736c]">{room.occupied_count}/{room.capacity} beds · {room.gender} · {room.status}</p></div><div className="flex gap-1"><IconButton label="Edit room" onClick={() => onEditRoom(room)}><Pencil /></IconButton><IconButton label="Delete room" tone="danger" onClick={() => onDeleteRoom(room)}><Trash2 /></IconButton></div></div>)}</div></div>)}</div></div></section>;
}

function AnnouncementManagementPanel({ management, isWorking, onSaveSettings, onCreate, onEdit, onToggle, onDelete }: { management: AnnouncementManagement; isWorking: boolean; onSaveSettings: (formData: FormData) => Promise<void>; onCreate: () => void; onEdit: (post: NewsPost) => void; onToggle: (post: NewsPost) => void; onDelete: (post: NewsPost) => void }) {
  const ticker = management.settings.top_ticker || {};
  const deadline = management.settings.registration_deadline || {};
  const deadlineLocal = deadline.deadline_at ? new Date(deadline.deadline_at).toISOString().slice(0, 16) : '';
  return <section className="ksit-card mt-8 overflow-hidden"><div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e6f4e8] text-[#0b5c2c]"><Megaphone className="size-5" /></span><div><h2 className="text-lg font-bold">📢 Announcements & News Management</h2><p className="mt-1 text-sm text-[#68736c]">គ្រប់គ្រងសេចក្តីជូនដំណឹង · homepage ticker, application deadline, and public news posts.</p></div></div><button onClick={onCreate} className="min-h-11 rounded-lg bg-[#0b5c2c] px-3 py-2 text-xs font-bold text-white hover:bg-[#084a23]">Create news post</button></div><div className="grid gap-6 border-t border-[#edf0ed] p-6 xl:grid-cols-[1fr_.9fr]"><form action={onSaveSettings} className="space-y-5"><div><h3 className="font-bold text-[#223128]">Edit Top Ticker Announcement</h3><p className="mt-1 text-xs text-[#68736c]">This replaces only the existing top green ticker content.</p><Field label="Ticker text" name="ticker_text" defaultValue={ticker.text || ''} required /><Field label="Ticker link" name="ticker_link" type="url" defaultValue={ticker.link || ''} hint="Optional destination URL" /></div><div className="border-t border-[#edf0ed] pt-5"><h3 className="font-bold text-[#223128]">Edit Registration Deadline Banner</h3><Field label="Deadline title" name="deadline_title" defaultValue={deadline.title || ''} required /><Field label="Deadline date and time" name="deadline_at" type="datetime-local" defaultValue={deadlineLocal} required /><Field label="Countdown / status badge" name="deadline_badge" defaultValue={deadline.badge || ''} hint="Optional label displayed below the deadline title" /></div><ModalActions busy={isWorking} submitLabel="Save homepage announcements" /></form><div className="rounded-xl border border-[#e1e7e1] bg-[#fafcf9] p-4"><div className="flex items-center justify-between gap-3"><div><h3 className="font-bold text-[#223128]">News posts</h3><p className="mt-1 text-xs text-[#68736c]">Visible posts are available through the public announcements API.</p></div><span className="rounded-full bg-[#e6f4e8] px-2.5 py-1 text-xs font-bold text-[#16582b]">{management.news_posts.length} posts</span></div><div className="mt-4 max-h-[420px] divide-y divide-[#e4ebe4] overflow-auto">{management.news_posts.length === 0 ? <p className="py-5 text-sm text-[#68736c]">No news posts have been created.</p> : management.news_posts.map((post) => <article className="py-4" key={post.id}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#25332a]">{post.title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#68736c]">{post.body || 'No body content.'}</p><p className="mt-2 text-[11px] text-[#849087]">{new Date(post.published_at).toLocaleString()}</p></div><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${post.is_visible ? 'bg-[#e6f4e8] text-[#16582b]' : 'bg-[#f1f2f1] text-[#6d766f]'}`}>{post.is_visible ? 'Visible' : 'Hidden'}</span></div><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => onEdit(post)} className="min-h-11 rounded-lg border border-[#dce3dc] px-2.5 py-1.5 text-xs font-bold text-[#405349] hover:bg-white">Edit</button><button onClick={() => onToggle(post)} className="min-h-11 rounded-lg border border-[#dce3dc] px-2.5 py-1.5 text-xs font-bold text-[#405349] hover:bg-white">{post.is_visible ? 'Hide' : 'Show'}</button><button onClick={() => onDelete(post)} className="min-h-11 rounded-lg border border-[#f2cfca] px-2.5 py-1.5 text-xs font-bold text-[#ad4939] hover:bg-[#fff3f1]">Delete</button></div></article>)}</div></div></div></section>;
}

function SystemSettingsPanel({ settings, isWorking, onSave }: { settings?: SystemSettings; isWorking: boolean; onSave: (formData: FormData) => Promise<void> }) {
  const defaults = settings || { academic_levels: ['9+1', '9+2', '9+3', 'Bachelor Year 1', 'Bachelor Year 2', 'Bachelor Year 3', 'Bachelor Year 4'], utility_rates: { electricity_khr_per_kwh: 800, water_khr_per_m3: 1500, trash_khr_per_room: 10000 }, housing_fee: { annual_khr: 120000 }, telegram: { username: '@KSITDorm_bot', webhook_configured: false } };
  function downloadConfig() { const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), system_settings: defaults }, null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'ksit-dorm-system-settings-backup.json'; link.click(); URL.revokeObjectURL(link.href); }
  return <section className="ksit-card mt-8 overflow-hidden"><div className="p-6"><h2 className="text-lg font-bold">⚙️ System Settings</h2><p className="mt-1 text-sm text-[#68736c]">Academic structures and safe operational defaults. Secret values, including Telegram bot tokens, are intentionally never shown in the browser.</p></div><form action={onSave} className="grid gap-6 border-t border-[#edf0ed] p-6 xl:grid-cols-2"><div className="space-y-4"><label className="block text-sm font-medium text-[#39473f]">Academic levels & majors<textarea name="academic_levels" defaultValue={(defaults.academic_levels || []).join('\n')} className="mt-1.5 min-h-32 w-full rounded-xl border border-[#dce3dc] bg-white p-3 text-sm outline-none focus:border-[#5f9b6f]" /></label><div className="grid gap-4 sm:grid-cols-3"><Field label="Electricity (៛/kWh)" name="electricity_rate" type="number" min="0" defaultValue={String(defaults.utility_rates?.electricity_khr_per_kwh ?? 800)} required /><Field label="Water (៛/m³)" name="water_rate" type="number" min="0" defaultValue={String(defaults.utility_rates?.water_khr_per_m3 ?? 1500)} required /><Field label="Trash (៛/room)" name="trash_fee" type="number" min="0" defaultValue={String(defaults.utility_rates?.trash_khr_per_room ?? 10000)} required /></div><Field label="Annual housing fee (៛)" name="housing_fee" type="number" min="0" defaultValue={String(defaults.housing_fee?.annual_khr ?? 120000)} required /></div><div className="space-y-4 rounded-xl border border-[#e1e7e1] bg-[#fafcf9] p-4"><Field label="Telegram bot username" name="telegram_username" defaultValue={defaults.telegram?.username || '@KSITDorm_bot'} required /><p className="rounded-lg bg-white p-3 text-sm text-[#405349]">Webhook status: <b className={defaults.telegram?.webhook_configured ? 'text-[#0b6937]' : 'text-[#a66b10]'}>{defaults.telegram?.webhook_configured ? 'Configured on the server' : 'Needs server configuration'}</b></p><button type="button" onClick={downloadConfig} className="w-full rounded-lg border border-[#dce3dc] bg-white px-3 py-2 text-xs font-bold text-[#31513d] hover:bg-[#f4f8f4]">Download configuration backup</button><p className="text-xs leading-5 text-[#68736c]">For privacy and data safety, full database backup and restore remain an administrator-operated Supabase/pg_dump procedure and are not executed from this browser.</p></div><div className="xl:col-span-2"><ModalActions busy={isWorking} submitLabel="Save system settings" /></div></form></section>;
}

function Kpi({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: number; note: string }) { return <div className="ksit-card min-h-[172px] p-5"><div className="flex items-start justify-between text-[#0b5c2c]"><p className="text-sm font-medium text-[#59655e]">{label}</p>{icon}</div><p className="mt-7 text-3xl font-extrabold tracking-[-0.04em]">{value}</p><p className="mt-1 text-xs text-[#68736c]">{note}</p></div>; }
function ActionButton({ icon, children, onClick, tone = 'primary' }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void; tone?: 'primary' | 'secondary' }) { return <button onClick={onClick} className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${tone === 'primary' ? 'bg-[#0b5c2c] text-white hover:bg-[#084a23]' : 'border border-[#dce3dc] bg-white text-[#31513d] hover:bg-[#f4f8f4]'}`}>{icon}{children}</button>; }
function IconButton({ children, label, onClick, tone = 'default' }: { children: React.ReactNode; label: string; onClick: () => void; tone?: 'default' | 'danger' }) { return <button aria-label={label} title={label} onClick={onClick} className={`flex size-11 items-center justify-center rounded-lg ${tone === 'danger' ? 'text-[#ad4939] hover:bg-[#fff3f1]' : 'text-[#3d5747] hover:bg-[#edf5ee]'}`}>{children}</button>; }
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#10211780] p-4" role="dialog" aria-modal="true" aria-label={title}><section className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between gap-4"><h2 className="text-xl font-bold text-[#18231d]">{title}</h2><button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-[#68736c] hover:bg-[#f2f5f1]">Close</button></div>{children}</section></div>; }
function Field({ label, hint, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) { return <label className="block text-sm font-medium text-[#39473f]">{label}<input {...props} className="mt-1.5 h-11 w-full rounded-xl border border-[#dce3dc] bg-white px-3 text-sm outline-none focus:border-[#5f9b6f]" />{hint && <span className="mt-1 block text-xs font-normal text-[#748078]">{hint}</span>}</label>; }
function SelectField({ label, name, defaultValue, options, required }: { label: string; name: string; defaultValue: string; options: string[][]; required?: boolean }) { return <label className="block text-sm font-medium text-[#39473f]">{label}<select name={name} defaultValue={defaultValue} required={required} className="mt-1.5 h-11 w-full rounded-xl border border-[#dce3dc] bg-white px-3 text-sm outline-none focus:border-[#5f9b6f]">{options.map(([value, optionLabel]) => <option value={value} key={value}>{optionLabel}</option>)}</select></label>; }
function ModalActions({ busy, submitLabel }: { busy: boolean; submitLabel: string }) { return <div className="flex justify-end gap-3 border-t border-[#edf0ed] pt-5"><button disabled={busy} className="min-h-11 rounded-lg bg-[#0b5c2c] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Saving…' : submitLabel}</button></div>; }
