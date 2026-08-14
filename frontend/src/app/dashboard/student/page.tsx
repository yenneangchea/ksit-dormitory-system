'use client';

import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, CreditCard, QrCode, Wrench } from 'lucide-react';
import { PortalShell } from '@/components/portal-shell';
import { DashboardRoleGuardLoading, useRoleGuard } from '@/components/role-guard';
import { applicationsAPI, attendanceAPI, billingAPI, maintenanceAPI, residenceAPI } from '@/lib/api';
import type { MaintenanceRequest, RoomApplication, StudentBill } from '@/types';

type StudentTab = 'overview' | 'bills' | 'maintenance' | 'application';
type ResidenceDetails = { assignment: { bed_number: number; academic_year: string; rooms?: { room_number?: string; floor_number?: number; buildings?: { code?: string; name?: string } | null } | null } | null; roommates: { student_id: string; bed_number: number; users?: { full_name_latin?: string; full_name_khmer?: string } | null }[] };
const tabs: { id: StudentTab; label: string }[] = [{ id: 'overview', label: 'My residence' }, { id: 'bills', label: 'KHQR bills' }, { id: 'maintenance', label: 'Maintenance' }, { id: 'application', label: 'Dormitory application' }];

export default function StudentDashboard() {
  const { isAuthorized, isChecking } = useRoleGuard('student');
  const [activeTab, setActiveTab] = useState<StudentTab>('overview');
  const [bills, setBills] = useState<StudentBill[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([]);
  const [applications, setApplications] = useState<RoomApplication[]>([]);
  const [attendance, setAttendance] = useState<{ id: string; status: string; attendance_date: string }[]>([]);
  const [residence, setResidence] = useState<ResidenceDetails | null>(null);
  const [notice, setNotice] = useState('');
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    const [billsResponse, maintenanceResponse, applicationsResponse, attendanceResponse, residenceResponse] = await Promise.all([billingAPI.listStudent(), maintenanceAPI.list(), applicationsAPI.list(), attendanceAPI.list(), residenceAPI.mine()]);
    if (billsResponse.success && billsResponse.data) setBills(billsResponse.data);
    if (maintenanceResponse.success && maintenanceResponse.data) setMaintenance(maintenanceResponse.data);
    if (applicationsResponse.success && applicationsResponse.data) setApplications(applicationsResponse.data);
    if (attendanceResponse.success && attendanceResponse.data) setAttendance(attendanceResponse.data as typeof attendance);
    if (residenceResponse.success && residenceResponse.data) setResidence(residenceResponse.data as ResidenceDetails);
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [isAuthorized, load]);

  async function selectTab(tab: StudentTab) {
    setActiveTab(tab);
    setNotice('');
    await load();
  }

  async function submitMaintenance(formData: FormData) {
    setWorking(true);
    const response = await maintenanceAPI.create({ magic_qr_code: String(formData.get('magic_qr_code') || ''), category: String(formData.get('category') || 'other'), urgency: String(formData.get('urgency') || 'medium'), title: String(formData.get('title') || ''), description: String(formData.get('description') || '') });
    setWorking(false);
    setNotice(response.success ? 'Maintenance ticket submitted to the residence team.' : response.error?.message || 'Unable to submit your maintenance request.');
    if (response.success) await load();
  }

  async function submitApplication(formData: FormData) {
    setWorking(true);
    const response = await applicationsAPI.submit({ academic_year_applied: String(formData.get('academic_year_applied') || '2025-2026'), photo_4x6_attached: Boolean(formData.get('photo_4x6_attached')), contract_signed: Boolean(formData.get('contract_signed')), parent_guarantee_attached: Boolean(formData.get('parent_guarantee_attached')), family_book_attached: Boolean(formData.get('family_book_attached')), id_card_attached: Boolean(formData.get('id_card_attached')) });
    setWorking(false);
    setNotice(response.success ? 'Dormitory application submitted for manager review.' : response.error?.message || 'Complete all required document confirmations before submitting.');
    if (response.success) await load();
  }

  async function confirmBillPayment(bill: StudentBill) {
    const transaction_ref = window.prompt('Enter the KHQR / bank transaction reference for this payment:');
    if (!transaction_ref?.trim()) return;
    setWorking(true);
    const response = await billingAPI.markPaid(bill.id, { transaction_ref: transaction_ref.trim(), payment_method: 'khqr' });
    setWorking(false);
    setNotice(response.success ? 'Payment reference recorded. The residence office can reconcile the transaction.' : response.error?.message || 'Unable to record the payment reference.');
    if (response.success) await load();
  }

  const present = attendance.filter((item) => item.status === 'present').length;

  if (isChecking) return <DashboardRoleGuardLoading />;
  if (!isAuthorized) return null;

  return <PortalShell role="student"><section className="min-h-[calc(100vh-156px)]"><div className="mb-8"><h1 className="text-[29px] font-extrabold tracking-[-0.045em]">Welcome back, Student Portal</h1><p className="mt-1.5 text-sm text-[#68736c]">Your residence information, utilities, support requests, and annual application in one secure place.</p></div>{notice && <div className="mb-5 rounded-xl border border-[#cfe0d1] bg-[#edf7ee] px-4 py-3 text-sm text-[#16582b]">{notice}</div>}<div className="inline-flex max-w-full flex-wrap gap-1 rounded-2xl border border-[#d9e5da] bg-[#eaf2eb] p-1">{tabs.map((tab) => <button key={tab.id} onClick={() => void selectTab(tab.id)} className={`rounded-xl px-3 py-2 text-sm font-medium ${activeTab === tab.id ? 'bg-white shadow-sm' : 'text-[#395043] hover:bg-white/60'}`}>{tab.label}</button>)}</div><div className="mt-8">{activeTab === 'overview' && <Overview bills={bills} maintenance={maintenance} applications={applications} present={present} residence={residence} />} {activeTab === 'bills' && <Bills bills={bills} working={working} onMarkPaid={confirmBillPayment} />} {activeTab === 'maintenance' && <Maintenance maintenance={maintenance} working={working} submit={submitMaintenance} />} {activeTab === 'application' && <Application applications={applications} working={working} submit={submitApplication} />}</div></section></PortalShell>;
}

function Overview({ bills, maintenance, applications, present, residence }: { bills: StudentBill[]; maintenance: MaintenanceRequest[]; applications: RoomApplication[]; present: number; residence: ResidenceDetails | null }) { const assignment = residence?.assignment; const room = assignment?.rooms; return <div className="grid gap-6 lg:grid-cols-3"><div className="ksit-card p-6 lg:col-span-2"><div className="flex items-center gap-2 text-[#0b5c2c]"><QrCode className="size-5" /><h2 className="text-lg font-bold text-[#18231d]">Residence status</h2></div><p className="mt-2 text-sm leading-6 text-[#68736c]">Your active room assignment and roommates are loaded from the residence record.</p><div className="mt-6 rounded-xl border border-dashed border-[#cdd9ce] bg-[#fafcf9] p-5">{assignment && room ? <><p className="font-semibold">{room.buildings?.code || 'Residence'} · Room {room.room_number} · Bed {assignment.bed_number}</p><p className="mt-1 text-sm text-[#68736c]">Floor {room.floor_number || '—'} · Academic year {assignment.academic_year}</p><p className="mt-4 text-xs font-bold uppercase tracking-wide text-[#68736c]">Roommates</p><p className="mt-1 text-sm text-[#526058]">{residence?.roommates.map((mate) => `${mate.users?.full_name_latin || mate.users?.full_name_khmer || 'Resident'} (Bed ${mate.bed_number})`).join(' · ') || 'No roommates assigned.'}</p></> : <><p className="font-semibold">Room assignment pending</p><p className="mt-1 text-sm text-[#68736c]">Your manager-assigned room details will appear after an approved application is allocated.</p></>}</div></div><div className="space-y-4"><OverviewStat icon={<CreditCard />} label="Unpaid KHQR bills" value={bills.filter((bill) => bill.bill_status !== 'paid').length} /><OverviewStat icon={<Wrench />} label="Open tickets" value={maintenance.filter((ticket) => !['resolved', 'cancelled'].includes(ticket.status)).length} /><OverviewStat icon={<ClipboardList />} label="Present records" value={present} /></div><section className="ksit-card p-6 lg:col-span-3"><h2 className="text-lg font-bold">Annual residence application</h2><p className="mt-1 text-sm text-[#68736c]">{applications.length ? `Latest application status: ${applications[0].status.replaceAll('_', ' ')}` : 'No application has been submitted for the current academic year.'}</p></section></div>; }
function OverviewStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <div className="ksit-card p-5"><div className="flex items-center justify-between text-[#0b5c2c]"><p className="text-sm font-medium text-[#59655e]">{label}</p>{icon}</div><p className="mt-5 text-3xl font-extrabold">{value}</p></div>; }
function Bills({ bills, working, onMarkPaid }: { bills: StudentBill[]; working: boolean; onMarkPaid: (bill: StudentBill) => Promise<void> }) { return <section className="ksit-card overflow-hidden"><div className="p-6"><h2 className="text-lg font-bold">My dynamic KHQR bills</h2><p className="mt-1 text-sm text-[#68736c]">Each balance is calculated from the room utility total divided between its active residents.</p></div>{bills.length === 0 ? <p className="border-t border-[#edf0ed] px-6 py-7 text-sm text-[#68736c]">No utility bills are due at this time.</p> : <div className="border-t border-[#edf0ed]">{bills.map((bill) => <div className="grid gap-4 border-b border-[#edf0ed] px-6 py-5 md:grid-cols-[1fr_auto_auto] md:items-center" key={bill.id}><div><p className="font-semibold">Utility bill · {bill.billing_month}</p><p className="mt-1 text-xs text-[#68736c]">Room {bill.room_id.slice(0, 8)} · Payment reference generated for this invoice.</p><code className="mt-3 block max-w-full overflow-x-auto rounded-lg bg-[#f1f6f1] px-3 py-2 text-xs text-[#28533a]">{bill.khqr_string}</code></div><div><p className="text-xs text-[#68736c]">Amount due</p><p className="mt-1 text-xl font-extrabold text-[#0b5c2c]">៛ {new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(bill.amount_khr))}</p></div><div className="flex flex-col items-start gap-2"><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${bill.bill_status === 'paid' ? 'bg-[#eaf6ec] text-[#1a6a37]' : 'bg-[#f5f0e7] text-[#806525]'}`}>{bill.bill_status}</span>{bill.bill_status !== 'paid' && <button disabled={working} onClick={() => void onMarkPaid(bill)} className="rounded-lg bg-[#0b5c2c] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Confirm KHQR payment</button>}</div></div>)}</div>}</section>; }
function Maintenance({ maintenance, working, submit }: { maintenance: MaintenanceRequest[]; working: boolean; submit: (formData: FormData) => Promise<void> }) { return <div className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]"><section className="ksit-card p-6"><h2 className="text-lg font-bold">New maintenance ticket</h2><p className="mt-1 text-sm text-[#68736c]">Start from your room’s Magic QR code so the ticket is routed to the correct residence.</p><form action={submit} className="mt-6 space-y-4"><StudentField label="Room Magic QR" name="magic_qr_code" placeholder="Scan or paste the room code" required /><StudentField label="Issue title" name="title" placeholder="For example: Bathroom light not working" required /><label className="block text-sm font-medium text-[#39473f]">Category<select name="category" className="mt-1.5 h-10 w-full rounded-xl border border-[#dce3dc] bg-white px-3 text-sm"><option value="electricity">Electricity</option><option value="plumbing">Plumbing</option><option value="furniture">Furniture</option><option value="door_lock">Door / lock</option><option value="internet">Internet</option><option value="other">Other</option></select></label><label className="block text-sm font-medium text-[#39473f]">Urgency<select name="urgency" className="mt-1.5 h-10 w-full rounded-xl border border-[#dce3dc] bg-white px-3 text-sm"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="emergency">Emergency</option></select></label><label className="block text-sm font-medium text-[#39473f]">Description<textarea name="description" required className="mt-1.5 min-h-24 w-full rounded-xl border border-[#dce3dc] bg-white p-3 text-sm" placeholder="Describe what is needed and when it began." /></label><button disabled={working} className="rounded-lg bg-[#0b5c2c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{working ? 'Submitting…' : 'Submit ticket'}</button></form></section><section className="ksit-card overflow-hidden"><div className="p-6"><h2 className="text-lg font-bold">My maintenance tickets</h2><p className="mt-1 text-sm text-[#68736c]">Track the status and outcome of reported residence issues.</p></div>{maintenance.length === 0 ? <p className="border-t border-[#edf0ed] px-6 py-7 text-sm text-[#68736c]">No maintenance tickets have been submitted.</p> : <div className="border-t border-[#edf0ed]">{maintenance.map((ticket) => <div className="border-b border-[#edf0ed] px-6 py-4" key={ticket.id}><div className="flex items-start justify-between gap-4"><div><p className="font-semibold">{ticket.title}</p><p className="mt-1 text-sm text-[#68736c]">{ticket.description}</p></div><span className="rounded-full bg-[#f4f1e8] px-2.5 py-1 text-xs font-semibold capitalize text-[#806525]">{ticket.status.replaceAll('_', ' ')}</span></div><p className="mt-3 text-xs text-[#68736c]">{ticket.category} · {ticket.urgency} urgency{ticket.resolution_notes ? ` · ${ticket.resolution_notes}` : ''}</p></div>)}</div>}</section></div>; }
function Application({ applications, working, submit }: { applications: RoomApplication[]; working: boolean; submit: (formData: FormData) => Promise<void> }) { return <div className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]"><section className="ksit-card p-6"><h2 className="text-lg font-bold">Submit residence application</h2><p className="mt-1 text-sm text-[#68736c]">Confirm that every required attachment is ready before sending the annual application.</p><form action={submit} className="mt-6 space-y-4"><StudentField label="Academic year" name="academic_year_applied" defaultValue="2025-2026" required />{[['photo_4x6_attached', 'Recent 4×6 photo attached'], ['contract_signed', 'Residence contract signed'], ['parent_guarantee_attached', 'Parent/guardian guarantee attached'], ['family_book_attached', 'Family book attached'], ['id_card_attached', 'National ID card attached']].map(([name, label]) => <label className="flex items-center gap-3 rounded-lg border border-[#e1e7e1] p-3 text-sm" key={name}><input type="checkbox" name={name} />{label}</label>)}<button disabled={working} className="rounded-lg bg-[#0b5c2c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{working ? 'Submitting…' : 'Submit application'}</button></form></section><section className="ksit-card overflow-hidden"><div className="p-6"><h2 className="text-lg font-bold">Application history</h2><p className="mt-1 text-sm text-[#68736c]">Manager review decisions and final room allocation are shown here.</p></div>{applications.length === 0 ? <p className="border-t border-[#edf0ed] px-6 py-7 text-sm text-[#68736c]">You have not submitted an application yet.</p> : <div className="border-t border-[#edf0ed]">{applications.map((application) => <div className="flex items-center justify-between gap-4 border-b border-[#edf0ed] px-6 py-4" key={application.id}><div><p className="font-semibold">Academic year {application.academic_year_applied}</p><p className="mt-1 text-xs text-[#68736c]">Submitted {new Date(application.applied_at).toLocaleDateString()}</p></div><span className="rounded-full bg-[#f4f1e8] px-2.5 py-1 text-xs font-semibold capitalize text-[#806525]">{application.status.replaceAll('_', ' ')}</span></div>)}</div>}</section></div>; }
function StudentField({ label, name, placeholder, defaultValue, required }: { label: string; name: string; placeholder?: string; defaultValue?: string; required?: boolean }) { return <label className="block text-sm font-medium text-[#39473f]">{label}<input name={name} placeholder={placeholder} defaultValue={defaultValue} required={required} className="mt-1.5 h-10 w-full rounded-xl border border-[#dce3dc] bg-white px-3 text-sm outline-none focus:border-[#5f9b6f]" /></label>; }
