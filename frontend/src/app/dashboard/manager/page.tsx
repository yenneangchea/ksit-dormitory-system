'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  BarChart3,
  Building2,
  Download,
  FileSpreadsheet,
  Plus,
  ReceiptText,
  UsersRound,
  Wrench,
} from 'lucide-react';
import { PortalShell } from '@/components/portal-shell';
import { AcademicAnalyticsPanel } from '@/components/academic-analytics-panel';
import { ManagerApplicationReview } from '@/components/manager-application-review';
import { DashboardAnalytics } from '@/components/dashboard-analytics';
import { DashboardRoleGuardLoading, useRoleGuard } from '@/components/role-guard';
import {
  applicationsAPI,
  attendanceAPI,
  billingAPI,
  buildingsAPI,
  dashboardAPI,
  maintenanceAPI,
  roomAssignmentsAPI,
  type AssignmentBoard,
  type DashboardAnalytics as DashboardAnalyticsData,
  type DashboardSummary,
} from '@/lib/api';
import type { Building, MaintenanceRequest, RoomApplication, UtilityBill } from '@/types';

type ManagerTab = 'dashboard' | 'buildings' | 'applications' | 'academics' | 'rosters' | 'billing' | 'maintenance' | 'attendance';

const emptySummary: DashboardSummary = {
  buildings: 0,
  rooms_in_service: 0,
  rooms_total: 0,
  total_capacity: 0,
  occupied_beds: 0,
  vacant_beds: 0,
  occupancy_percent: 0,
  pending_maintenance: 0,
  pending_applications: 0,
  attendance_today: 0,
};

function formatKhr(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

function ManagerDashboardContent() {
  const { isAuthorized, isChecking } = useRoleGuard('manager');
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [analytics, setAnalytics] = useState<DashboardAnalyticsData | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [applications, setApplications] = useState<RoomApplication[]>([]);
  const [assignmentBoard, setAssignmentBoard] = useState<AssignmentBoard | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [utilityBills, setUtilityBills] = useState<UtilityBill[]>([]);
  const [attendance, setAttendance] = useState<{ id: string; attendance_date: string; status: string; rooms?: { room_number?: string } | null; users?: { full_name_latin?: string } | null }[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([]);
  const [notice, setNotice] = useState('');
  const [showBuildingForm, setShowBuildingForm] = useState(false);
  const [showBillForm, setShowBillForm] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [exportingReport, setExportingReport] = useState<'attendance' | 'billing' | null>(null);
  const [driveLinks, setDriveLinks] = useState<{ attendance?: string; billing?: string }>({});

  const loadCoreData = async () => {
    const [summaryResponse, analyticsResponse, buildingsResponse, applicationsResponse] = await Promise.all([
      dashboardAPI.summary(),
      dashboardAPI.analytics(),
      buildingsAPI.list(),
      applicationsAPI.list(),
    ]);
    if (summaryResponse.success && summaryResponse.data) setSummary(summaryResponse.data);
    if (analyticsResponse.success && analyticsResponse.data) setAnalytics(analyticsResponse.data);
    if (buildingsResponse.success && buildingsResponse.data) setBuildings(buildingsResponse.data);
    if (applicationsResponse.success && applicationsResponse.data) setApplications(applicationsResponse.data);
  };

  const loadAssignmentBoard = useCallback(async () => {
    const response = await roomAssignmentsAPI.board();
    if (response.success && response.data) setAssignmentBoard(response.data);
  }, []);

  const loadTabData = useCallback(async (tab: ManagerTab) => {
    if (tab === 'buildings') await loadAssignmentBoard();
    if (tab === 'billing') {
      const response = await billingAPI.listUtility();
      if (response.success && response.data) setUtilityBills(response.data);
    }
    if (tab === 'attendance') {
      const response = await attendanceAPI.list({ date: new Date().toISOString().slice(0, 10) });
      if (response.success && response.data) setAttendance(response.data as typeof attendance);
    }
    if (tab === 'maintenance') {
      const response = await maintenanceAPI.list();
      if (response.success && response.data) setMaintenance(response.data);
    }
  }, [loadAssignmentBoard]);

  useEffect(() => {
    if (!isAuthorized) return;
    const timer = window.setTimeout(() => void loadCoreData(), 0);
    return () => window.clearTimeout(timer);
  }, [isAuthorized]);

  const activeTab = useMemo<ManagerTab>(() => {
    const requested = searchParams?.get('tab');
    if (requested === 'applications') return 'applications';
    if (requested === 'rooms') return 'buildings';
    if (requested === 'academics') return 'academics';
    if (requested === 'utilities') return 'billing';
    if (requested === 'maintenance') return 'maintenance';
    return 'dashboard';
  }, [searchParams]);

  useEffect(() => {
    if (!isAuthorized) return;
    const timer = window.setTimeout(() => void loadTabData(activeTab), 0);
    return () => window.clearTimeout(timer);
  }, [activeTab, isAuthorized, loadTabData]);

  const occupancyWidth = `${Math.max(0, Math.min(summary.occupancy_percent, 100))}%`;
  const totalRooms = useMemo(() => buildings.reduce((count, building) => count + ((building as Building & { rooms?: unknown[] }).rooms?.length || 0), 0), [buildings]);

  async function createBuilding(formData: FormData) {
    setIsWorking(true);
    const response = await buildingsAPI.create({
      code: String(formData.get('code') || ''),
      name: String(formData.get('name') || ''),
      gender_restriction: String(formData.get('gender_restriction') || 'male') as Building['gender_restriction'],
      total_floors: Number(formData.get('total_floors') || 1),
      description: String(formData.get('description') || ''),
    });
    setIsWorking(false);
    if (!response.success) {
      setNotice(response.error?.message || 'Unable to create building.');
      return;
    }
    setShowBuildingForm(false);
    setNotice('Building added successfully.');
    await loadCoreData();
  }

  async function reviewApplication(applicationId: string, status: 'approved' | 'rejected') {
    const rejection_reason = status === 'rejected' ? window.prompt('State the reason for rejecting this application:', 'Returned for document correction') || '' : '';
    if (status === 'rejected' && !rejection_reason.trim()) return;
    setIsWorking(true);
    const response = await applicationsAPI.review(applicationId, status === 'rejected' ? { status, rejection_reason } : { status });
    setIsWorking(false);
    setNotice(response.success ? `Application ${status}.` : response.error?.message || 'Unable to update the application.');
    if (response.success) await loadCoreData();
  }

  async function updateMaintenanceStatus(maintenanceId: string, status: MaintenanceRequest['status']) {
    const resolution_notes = status === 'resolved' ? window.prompt('Enter resolution notes for this ticket:') || '' : '';
    if (status === 'resolved' && !resolution_notes.trim()) return;
    setIsWorking(true);
    const response = await maintenanceAPI.update(maintenanceId, { status, ...(resolution_notes ? { resolution_notes } : {}) });
    setIsWorking(false);
    setNotice(response.success ? `Maintenance ticket marked ${status.replace('_', ' ')}.` : response.error?.message || 'Unable to update maintenance ticket.');
    if (response.success) await loadTabData('maintenance');
  }

  async function autoAssign(applicationId: string) {
    setIsWorking(true);
    const response = await applicationsAPI.autoAssign(applicationId);
    setIsWorking(false);
    setNotice(response.success ? 'Waterfall room assignment completed.' : response.error?.message || 'No compatible room could be assigned.');
    if (response.success) await loadCoreData();
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
    await Promise.all([loadCoreData(), loadAssignmentBoard()]);
  }

  async function createBill(formData: FormData) {
    setIsWorking(true);
    const trashFeeOverride = String(formData.get('trash_fee_khr') || '').trim();
    const response = await billingAPI.createUtility({
      room_id: String(formData.get('room_id') || ''),
      billing_month: String(formData.get('billing_month') || ''),
      prev_electric_reading: Number(formData.get('prev_electric_reading') || 0),
      curr_electric_reading: Number(formData.get('curr_electric_reading') || 0),
      prev_water_reading: Number(formData.get('prev_water_reading') || 0),
      curr_water_reading: Number(formData.get('curr_water_reading') || 0),
      ...(trashFeeOverride ? { trash_fee_khr: Number(trashFeeOverride) } : {}),
    });
    setIsWorking(false);
    if (!response.success) {
      setNotice(response.error?.message || 'Unable to generate the split bill.');
      return;
    }
    setShowBillForm(false);
    setNotice('Utility bill split and KHQR payment references generated.');
    await loadTabData('billing');
  }

  function downloadRosterCsv() {
    const rows = applications.map((application) => {
      const record = application as RoomApplication & { users?: { full_name_latin?: string; email?: string }; academic_profiles?: { student_id_card?: string; major?: string; academic_year?: number } };
      return [record.academic_profiles?.student_id_card || '', record.users?.full_name_latin || '', record.users?.email || '', record.academic_profiles?.major || '', record.academic_profiles?.academic_year || '', record.status];
    });
    const csv = [['Student ID', 'Student name', 'Email', 'Major', 'Year', 'Application status'], ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = 'ksit-student-roster.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function exportReport(report: 'attendance' | 'billing') {
    setExportingReport(report);
    const response = report === 'attendance'
      ? await attendanceAPI.exportToDrive(reportMonth)
      : await billingAPI.exportToDrive(reportMonth);
    setExportingReport(null);
    if (!response.success || !response.data?.url) {
      setNotice(response.error?.message || `Unable to export the ${report} report to Google Drive.`);
      return;
    }
    setDriveLinks((current) => ({ ...current, [report]: response.data?.url || undefined }));
    setNotice(`${report === 'attendance' ? 'Attendance' : 'Utility billing'} report exported to Google Drive.`);
  }

  if (isChecking) return <DashboardRoleGuardLoading />;
  if (!isAuthorized) return null;

  return (
    <PortalShell role="manager">
      <section className="min-h-[calc(100vh-156px)]">
        <div className="mb-9 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[28px] font-extrabold tracking-[-0.045em] text-[#18231d] sm:text-[32px]">{activeTab === 'dashboard' ? 'Operations Overview' : activeTab === 'applications' ? 'Applications Review' : activeTab === 'buildings' ? 'Room Matrix & Auto-Assign' : activeTab === 'academics' ? 'Academic & Majors' : activeTab === 'billing' ? 'Electricity & Water' : 'Work Orders'}</h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#68736c] sm:text-[15px]">{activeTab === 'dashboard' ? 'A live overview of residence operations, attendance, billing, and student services.' : 'This protected workspace displays only the section selected in the sidebar.'}</p>
          </div>
          {activeTab === 'dashboard' && <div className="self-start rounded-xl border border-[#dce3dc] bg-white p-2 shadow-sm"><div className="flex flex-wrap items-center gap-2"><input type="month" value={reportMonth} onChange={(event) => setReportMonth(event.target.value)} aria-label="Report month" className="min-h-11 rounded-lg border border-[#dce3dc] px-2 text-xs outline-none" /><button onClick={() => void exportReport('attendance')} disabled={Boolean(exportingReport) || !reportMonth} className="flex min-h-11 items-center gap-1 rounded-lg border border-[#dce3dc] px-3 text-xs font-semibold text-[#27342c] disabled:opacity-50"><Download className="size-3.5" />{exportingReport === 'attendance' ? 'Exporting…' : 'Attendance to Drive'}</button><button onClick={() => void exportReport('billing')} disabled={Boolean(exportingReport) || !reportMonth} className="flex min-h-11 items-center gap-1 rounded-lg bg-[#0b5c2c] px-3 text-xs font-semibold text-white disabled:opacity-50"><Download className="size-3.5" />{exportingReport === 'billing' ? 'Exporting…' : 'Billing to Drive'}</button></div>{(driveLinks.attendance || driveLinks.billing) && <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-semibold text-[#1a6a37]">{driveLinks.attendance && <a href={driveLinks.attendance} target="_blank" rel="noreferrer" className="underline">Open attendance archive</a>}{driveLinks.billing && <a href={driveLinks.billing} target="_blank" rel="noreferrer" className="underline">Open billing archive</a>}</div>}</div>}
        </div>

        {notice && <div className="mb-5 rounded-xl border border-[#cfe0d1] bg-[#edf7ee] px-4 py-3 text-sm text-[#16582b]">{notice}</div>}

        {activeTab === 'dashboard' && <><div className="grid gap-4 lg:grid-cols-12">
          <MetricCard className="lg:col-span-3" icon={<UsersRound className="size-4 text-[#0b5c2c]" />} label="Real-time occupancy" value={`${summary.occupied_beds} / ${summary.total_capacity}`} description={`${summary.occupancy_percent}% of residence capacity`} />
          <MetricCard className="lg:col-span-3" icon={<Building2 className="size-4 text-[#17613a]" />} label="Rooms in service" value={summary.rooms_in_service} description={`${summary.buildings || 0} building${summary.buildings === 1 ? '' : 's'} active`} />
          <MetricCard className="lg:col-span-3" icon={<Wrench className="size-4 text-[#b95b47]" />} label="Pending maintenance" value={summary.pending_maintenance} description="Requires manager review" />
          <div className="ksit-card min-h-[242px] p-6 lg:col-span-3">
            <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-[#59655e]">Occupancy breakdown</p><p className="mt-2 text-[15px] text-[#68736c]">Live bed utilization statistics</p></div><BarChart3 className="size-4 text-[#1d6a3c]" /></div>
            <div className="mt-12 h-2 overflow-hidden rounded-full bg-[#edf0ed]" aria-label="Occupancy graph"><div className="h-full rounded-full bg-[#0b6937] transition-all" style={{ width: occupancyWidth }} /></div>
            <div className="mt-7 flex flex-wrap gap-x-4 gap-y-2 text-xs"><span className="flex items-center gap-1.5 text-[#37694a]"><i className="size-3 rounded-full bg-[#0b6937]" />Occupied beds</span><span className="flex items-center gap-1.5 text-[#a2aba4]"><i className="size-3 rounded-full bg-[#e7eae8]" />Vacant beds</span></div>
          </div>
        </div>{analytics && <DashboardAnalytics data={analytics} />}</>}

        <div className={activeTab === 'dashboard' ? 'hidden' : 'mt-8'}>
          {activeTab === 'buildings' && <><BuildingsPanel buildings={buildings} totalRooms={totalRooms} onAdd={() => setShowBuildingForm(true)} /><RoomAssignmentBoard board={assignmentBoard} selectedApplicationId={selectedApplicationId} isWorking={isWorking} onSelect={setSelectedApplicationId} onMove={manuallyPlaceStudent} /></>}
          {activeTab === 'applications' && <ManagerApplicationReview />}
          {activeTab === 'academics' && <AcademicAnalyticsPanel role="manager" />}
          {activeTab === 'rosters' && <RostersPanel applications={applications} onDownload={downloadRosterCsv} />}
          {activeTab === 'billing' && <BillingPanel bills={utilityBills} onCreate={() => setShowBillForm(true)} />}
          {activeTab === 'maintenance' && <MaintenancePanel tickets={maintenance} isWorking={isWorking} onUpdate={updateMaintenanceStatus} />}
          {activeTab === 'attendance' && <AttendancePanel attendance={attendance} />}
        </div>
      </section>

      {showBuildingForm && <Dialog title="Add building" onClose={() => setShowBuildingForm(false)}><form action={createBuilding} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Building code" name="code" placeholder="A" required /><Field label="Building name" name="name" placeholder="Male Residence A" required /><SelectField label="Gender restriction" name="gender_restriction" options={[['male', 'Male'], ['female', 'Female'], ['mixed', 'Mixed']]} /><Field label="Total floors" name="total_floors" type="number" defaultValue="1" min="1" required /></div><label className="block text-sm font-medium text-[#39473f]">Description<textarea name="description" className="mt-1.5 min-h-20 w-full rounded-xl border border-[#dce3dc] bg-white p-3 text-sm outline-none focus:border-[#5f9b6f]" placeholder="Optional building notes" /></label><DialogActions busy={isWorking} submitLabel="Add building" /></form></Dialog>}
      {showBillForm && <Dialog title="Create dynamic split bill" onClose={() => setShowBillForm(false)}><form action={createBill} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><SelectField label="Room" name="room_id" options={buildings.flatMap((building) => ((building as Building & { rooms?: { id: string; room_number: string }[] }).rooms || []).map((room): [string, string] => [room.id, `${building.code} · ${room.room_number}`]))} required /><Field label="Billing month" name="billing_month" type="month" required /><Field label="Previous electricity reading" name="prev_electric_reading" type="number" defaultValue="0" required /><Field label="Current electricity reading" name="curr_electric_reading" type="number" defaultValue="0" required /><Field label="Previous water reading" name="prev_water_reading" type="number" defaultValue="0" required /><Field label="Current water reading" name="curr_water_reading" type="number" defaultValue="0" required /><Field label="Trash fee override (KHR)" name="trash_fee_khr" type="number" placeholder="Uses System Settings by default" /></div><p className="rounded-lg bg-[#f1f6f1] p-3 text-xs leading-5 text-[#516057]">Electricity, water, and trash rates use the Admin System Settings unless an optional per-bill trash override is entered. The system divides the room total evenly among active residents and generates a unique KHQR payment reference for each student.</p><DialogActions busy={isWorking} submitLabel="Generate bills" /></form></Dialog>}
    </PortalShell>
  );
}

export default function ManagerDashboard() {
  return <Suspense fallback={<DashboardRoleGuardLoading />}><ManagerDashboardContent /></Suspense>;
}

function MetricCard({ label, value, description, icon, className }: { label: string; value: string | number; description: string; icon: React.ReactNode; className?: string }) {
  return <div className={`ksit-card min-h-[242px] p-6 ${className || ''}`}><div className="flex items-start justify-between gap-3"><p className="max-w-[150px] text-sm font-medium text-[#59655e]">{label}</p>{icon}</div><p className="mt-9 text-[25px] font-extrabold tracking-[-0.035em] text-[#18231d]">{value}</p><p className="mt-1.5 text-xs text-[#68736c]">{description}</p></div>;
}

function BuildingsPanel({ buildings, totalRooms, onAdd }: { buildings: Building[]; totalRooms: number; onAdd: () => void }) {
  return <section className="ksit-card overflow-hidden"><div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-lg font-bold tracking-[-0.02em]">Building & room inventory</h2><p className="mt-1 text-sm text-[#68736c]">Managed structures, capacities, and floor allocations</p></div><button onClick={onAdd} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-[#0b5c2c] px-3 text-sm font-semibold text-white hover:bg-[#084a23]"><Plus className="size-4" />Add building</button></div>{buildings.length === 0 ? <div className="border-t border-[#edf0ed] px-6 py-6 text-sm text-[#68736c]">—</div> : <div className="border-t border-[#edf0ed]"><div className="grid grid-cols-[1fr_auto] gap-3 bg-[#fafcf9] px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#748078]"><span>Building</span><span>Rooms</span></div>{buildings.map((building) => { const rooms = (building as Building & { rooms?: { capacity: number; occupied_count: number; room_number: string }[] }).rooms || []; return <div key={building.id} className="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-[#edf0ed] px-6 py-4"><div><p className="font-semibold text-[#223128]">{building.code} · {building.name}</p><p className="mt-1 text-xs text-[#68736c]">{building.total_floors} floors · {building.gender_restriction} residence</p></div><div className="text-right"><p className="font-semibold text-[#223128]">{rooms.length} rooms</p><p className="mt-1 text-xs text-[#68736c]">{rooms.reduce((sum, room) => sum + room.occupied_count, 0)} / {rooms.reduce((sum, room) => sum + room.capacity, 0)} beds</p></div></div>; })}<div className="border-t border-[#edf0ed] bg-[#fafcf9] px-6 py-3 text-xs text-[#68736c]">{buildings.length} buildings · {totalRooms} rooms in inventory</div></div>}</section>;
}

function firstProfile(value: { major?: string; academic_year?: number } | { major?: string; academic_year?: number }[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function firstApplication<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function RoomAssignmentBoard({ board, selectedApplicationId, isWorking, onSelect, onMove }: { board: AssignmentBoard | null; selectedApplicationId: string | null; isWorking: boolean; onSelect: (applicationId: string | null) => void; onMove: (applicationId: string, targetRoomId: string) => Promise<void> }) {
  const [draggedApplicationId, setDraggedApplicationId] = useState<string | null>(null);
  const allStudents = useMemo(() => {
    if (!board) return [];
    return [
      ...board.unassigned_students,
      ...board.rooms.flatMap((room) => room.residents.map((resident) => firstApplication(resident.room_applications)).filter(Boolean)),
    ];
  }, [board]);
  const selectedStudent = allStudents.find((student) => student?.id === (draggedApplicationId || selectedApplicationId));

  if (!board) return <section className="ksit-card mt-6 p-6"><p className="text-sm text-[#68736c]">Loading the live assignment board…</p></section>;

  const labelFor = (student: AssignmentBoard['unassigned_students'][number]) => student.users?.full_name_latin || student.users?.full_name_khmer || student.users?.email || 'Student';
  const canPlace = (room: AssignmentBoard['rooms'][number]) => Boolean(selectedStudent && room.status !== 'maintenance' && room.residents.length < room.capacity && room.gender === selectedStudent.users?.gender);
  const placeSelected = async (roomId: string) => {
    const applicationId = draggedApplicationId || selectedApplicationId;
    if (!applicationId) return;
    await onMove(applicationId, roomId);
    setDraggedApplicationId(null);
  };

  return <section className="mt-6 space-y-5"><div className="flex flex-col gap-3 rounded-2xl border border-[#d5e6d7] bg-[#f3faf4] p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold text-[#193925]">Manual room placement</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-[#55705d]">Drag an approved student to an available compatible room. You can also select a student, then use “Place here” for touch devices. Moving a resident between room cards transfers the active assignment.</p></div><span className="inline-flex w-fit rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#1c6b37]">{board.unassigned_students.length} awaiting placement</span></div>
    <div className="ksit-card overflow-hidden"><div className="border-b border-[#edf0ed] p-5"><h3 className="font-bold">Approved students without a room</h3><p className="mt-1 text-sm text-[#68736c]">Drag from this pool into a room, or select one for tap-to-place.</p></div><div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">{board.unassigned_students.length === 0 ? <p className="col-span-full px-2 py-3 text-sm text-[#68736c]">All approved students currently have active room assignments.</p> : board.unassigned_students.map((student) => <StudentMoveCard key={student.id} student={student} selected={selectedApplicationId === student.id} onDragStart={() => setDraggedApplicationId(student.id)} onDragEnd={() => setDraggedApplicationId(null)} onSelect={() => onSelect(selectedApplicationId === student.id ? null : student.id)} />)}</div></div>
    <div className="grid gap-4 xl:grid-cols-2">{board.rooms.map((room) => { const compatible = canPlace(room); const isFull = room.residents.length >= room.capacity; return <article key={room.id} onDragOver={(event) => { if (compatible) event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); if (compatible) void placeSelected(room.id); }} className={`rounded-2xl border bg-white p-5 ${compatible ? 'border-[#54a56a] ring-2 ring-[#d6f1db]' : room.status === 'maintenance' ? 'border-[#f0d8d2] bg-[#fffaf8]' : 'border-[#dfe5df]'}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.1em] text-[#5d7765]">{room.buildings?.code || 'Residence'} · Floor {room.floor_number}</p><h3 className="mt-1 text-xl font-extrabold text-[#20342a]">Room {room.room_number}</h3><p className="mt-1 text-sm text-[#68736c]">{room.gender} · {room.residents.length} / {room.capacity} beds · {room.status}</p></div><button disabled={isWorking || !compatible} onClick={() => void placeSelected(room.id)} className="min-h-11 rounded-lg bg-[#0b5c2c] px-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-[#c9d4ca]">{selectedStudent ? compatible ? 'Place here' : isFull ? 'Room full' : 'Not compatible' : 'Select student'}</button></div><div className="mt-4 min-h-20 space-y-2 rounded-xl border border-dashed border-[#cbdacc] bg-[#fbfdfb] p-3">{room.residents.length === 0 ? <p className="py-2 text-sm text-[#78867c]">Drop an approved compatible student here.</p> : room.residents.map((resident) => { const student = firstApplication(resident.room_applications); if (!student) return null; return <div key={resident.id} draggable={!isWorking} onDragStart={() => setDraggedApplicationId(student.id)} onDragEnd={() => setDraggedApplicationId(null)} className={`flex min-h-11 items-center justify-between gap-3 rounded-lg border px-3 py-2 ${selectedApplicationId === student.id ? 'border-[#0b5c2c] bg-[#eaf6ec]' : 'border-[#e0e8e1] bg-white'}`}><button type="button" onClick={() => onSelect(selectedApplicationId === student.id ? null : student.id)} className="min-h-9 min-w-0 flex-1 text-left text-sm font-semibold text-[#27372d]"><span className="mr-2 text-xs font-bold text-[#0b5c2c]">Bed {resident.bed_number}</span>{labelFor(student)}</button><span className="text-[11px] text-[#708076]">Move</span></div>; })}</div></article>; })}</div>
  </section>;
}

function StudentMoveCard({ student, selected, onDragStart, onDragEnd, onSelect }: { student: AssignmentBoard['unassigned_students'][number]; selected: boolean; onDragStart: () => void; onDragEnd: () => void; onSelect: () => void }) {
  const profile = firstProfile(student.academic_profiles);
  const name = student.users?.full_name_latin || student.users?.full_name_khmer || student.users?.email || 'Student';
  return <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd} className={`rounded-xl border p-3 ${selected ? 'border-[#0b5c2c] bg-[#eaf6ec]' : 'border-[#e1e8e1] bg-white'}`}><button type="button" onClick={onSelect} className="min-h-11 w-full text-left"><p className="font-semibold text-[#26372d]">{name}</p><p className="mt-1 text-xs text-[#68736c]">{student.users?.gender || '—'} · {profile?.major || 'Major pending'} · Year {profile?.academic_year || '—'}</p></button><p className="mt-2 text-[11px] font-semibold text-[#498158]">Drag or select to place</p></div>;
}

function ApplicationsPanel({ applications, isWorking, onReview, onAutoAssign }: { applications: RoomApplication[]; isWorking: boolean; onReview: (id: string, status: 'approved' | 'rejected') => Promise<void>; onAutoAssign: (id: string) => Promise<void> }) {
  return <section className="ksit-card overflow-hidden"><div className="p-6"><h2 className="text-lg font-bold">Yearly applications</h2><p className="mt-1 text-sm text-[#68736c]">Review required documents, approve eligible residents, and apply waterfall allocation.</p></div>{applications.length === 0 ? <p className="border-t border-[#edf0ed] px-6 py-6 text-sm text-[#68736c]">No yearly applications have been submitted.</p> : <div className="overflow-x-auto border-t border-[#edf0ed]"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#fafcf9] text-xs uppercase tracking-[0.08em] text-[#748078]"><tr><th className="px-6 py-3 font-semibold">Student</th><th className="px-4 py-3 font-semibold">Year</th><th className="px-4 py-3 font-semibold">Documents</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-6 py-3 text-right font-semibold">Action</th></tr></thead><tbody>{applications.map((application) => { const record = application as RoomApplication & { users?: { full_name_latin?: string; email?: string }; academic_profiles?: { major?: string; academic_year?: number } }; const documents = [application.photo_4x6_attached, application.contract_signed, application.parent_guarantee_attached, application.family_book_attached, application.id_card_attached].filter(Boolean).length; return <tr key={application.id} className="border-t border-[#edf0ed]"><td className="px-6 py-4"><p className="font-semibold">{record.users?.full_name_latin || 'Student application'}</p><p className="mt-1 text-xs text-[#68736c]">{record.academic_profiles?.major || record.users?.email || 'Profile pending'}</p></td><td className="px-4 py-4 text-[#526058]">{application.academic_year_applied}</td><td className="px-4 py-4 text-[#526058]">{documents} / 5 confirmed</td><td className="px-4 py-4"><StatusPill value={application.status} /></td><td className="px-6 py-4 text-right"><div className="flex justify-end gap-2">{['submitted', 'under_review'].includes(application.status) && <><SmallButton disabled={isWorking} onClick={() => void onReview(application.id, 'approved')}>Approve</SmallButton><SmallButton disabled={isWorking} tone="muted" onClick={() => void onReview(application.id, 'rejected')}>Reject</SmallButton></>}{application.status === 'approved' && <SmallButton disabled={isWorking} onClick={() => void onAutoAssign(application.id)}>Auto-assign</SmallButton>}</div></td></tr>; })}</tbody></table></div>}</section>;
}

function RostersPanel({ applications, onDownload }: { applications: RoomApplication[]; onDownload: () => void }) {
  return <section className="ksit-card p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-lg font-bold">Student rosters (CSV)</h2><p className="mt-1 text-sm text-[#68736c]">Create a portable roster from yearly application and academic-profile records.</p></div><button onClick={onDownload} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0b5c2c] px-3 text-sm font-semibold text-white hover:bg-[#084a23]"><FileSpreadsheet className="size-4" />Download CSV</button></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><InfoBox label="Roster records" value={applications.length} /><InfoBox label="Approved" value={applications.filter((item) => ['approved', 'assigned'].includes(item.status)).length} /><InfoBox label="Awaiting review" value={applications.filter((item) => ['submitted', 'under_review'].includes(item.status)).length} /></div></section>;
}

function BillingPanel({ bills, onCreate }: { bills: UtilityBill[]; onCreate: () => void }) {
  return <section className="ksit-card overflow-hidden"><div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-lg font-bold">Dynamic split-billing</h2><p className="mt-1 text-sm text-[#68736c]">Generate a room bill, divide it among active residents, and issue per-student KHQR references.</p></div><button onClick={onCreate} className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-[#0b5c2c] px-3 text-sm font-semibold text-white hover:bg-[#084a23]"><ReceiptText className="size-4" />Create bill</button></div>{bills.length === 0 ? <p className="border-t border-[#edf0ed] px-6 py-6 text-sm text-[#68736c]">No utility bills have been generated.</p> : <div className="border-t border-[#edf0ed]">{bills.map((bill) => <div key={bill.id} className="grid gap-3 border-b border-[#edf0ed] px-6 py-4 sm:grid-cols-4 sm:items-center"><div><p className="font-semibold">{bill.billing_month}</p><p className="mt-1 text-xs text-[#68736c]">Room {bill.room_id.slice(0, 8)}</p></div><div><p className="text-xs text-[#68736c]">Room total</p><p className="mt-1 font-semibold">៛ {formatKhr(Number(bill.total_amount_khr || 0))}</p></div><div><p className="text-xs text-[#68736c]">Residents</p><p className="mt-1 font-semibold">{bill.active_students_count}</p></div><div><p className="text-xs text-[#68736c]">Each KHQR bill</p><p className="mt-1 font-semibold text-[#0b5c2c]">៛ {formatKhr(Number(bill.split_amount_per_student_khr || 0))}</p></div></div>)}</div>}</section>;
}

function MaintenancePanel({ tickets, isWorking, onUpdate }: { tickets: MaintenanceRequest[]; isWorking: boolean; onUpdate: (id: string, status: MaintenanceRequest['status']) => Promise<void> }) {
  return <section className="ksit-card overflow-hidden"><div className="p-6"><h2 className="text-lg font-bold">Maintenance tickets</h2><p className="mt-1 text-sm text-[#68736c]">Assign the appropriate lifecycle status and record resolution notes when work is complete.</p></div>{tickets.length === 0 ? <p className="border-t border-[#edf0ed] px-6 py-6 text-sm text-[#68736c]">No maintenance tickets are currently open.</p> : <div className="divide-y divide-[#edf0ed] border-t border-[#edf0ed]">{tickets.map((ticket) => <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between" key={ticket.id}><div><p className="font-semibold">{ticket.title}</p><p className="mt-1 text-sm text-[#68736c]">{ticket.category} · {ticket.urgency} urgency · Room {ticket.room_id.slice(0, 8)}</p><p className="mt-1 text-xs text-[#748078]">{ticket.description}</p></div><div className="flex flex-wrap items-center gap-2"><StatusPill value={ticket.status} />{ticket.status === 'open' && <SmallButton disabled={isWorking} onClick={() => void onUpdate(ticket.id, 'in_progress')}>Start work</SmallButton>}{ticket.status === 'in_progress' && <SmallButton disabled={isWorking} onClick={() => void onUpdate(ticket.id, 'resolved')}>Resolve</SmallButton>}</div></div>)}</div>}</section>;
}

function AttendancePanel({ attendance }: { attendance: { id: string; attendance_date: string; status: string; rooms?: { room_number?: string } | null; users?: { full_name_latin?: string } | null }[] }) {
  return <section className="ksit-card overflow-hidden"><div className="p-6"><h2 className="text-lg font-bold">Daily attendance</h2><p className="mt-1 text-sm text-[#68736c]">Teacher-entered records from secure room Magic QR scans.</p></div>{attendance.length === 0 ? <p className="border-t border-[#edf0ed] px-6 py-6 text-sm text-[#68736c]">No attendance scans have been recorded for today.</p> : <div className="border-t border-[#edf0ed]">{attendance.map((record) => <div key={record.id} className="flex items-center justify-between gap-4 border-b border-[#edf0ed] px-6 py-4"><div><p className="font-semibold">{record.users?.full_name_latin || 'Resident'} · Room {record.rooms?.room_number || '—'}</p><p className="mt-1 text-xs text-[#68736c]">{record.attendance_date}</p></div><StatusPill value={record.status} /></div>)}</div>}</section>;
}

function StatusPill({ value }: { value: string }) { const tone = value === 'rejected' || value === 'overdue' ? 'bg-[#fff0ef] text-[#a73627]' : value === 'approved' || value === 'assigned' || value === 'paid' || value === 'present' || value === 'resolved' ? 'bg-[#eaf6ec] text-[#1a6a37]' : 'bg-[#f4f1e8] text-[#806525]'; return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}>{value.replaceAll('_', ' ')}</span>; }
function SmallButton({ children, onClick, disabled, tone = 'primary' }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; tone?: 'primary' | 'muted' }) { return <button disabled={disabled} onClick={onClick} className={`min-h-11 rounded-lg px-2.5 py-1.5 text-xs font-semibold disabled:opacity-60 ${tone === 'primary' ? 'bg-[#0b5c2c] text-white hover:bg-[#084a23]' : 'border border-[#dce3dc] text-[#536158] hover:bg-[#f6f8f5]'}`}>{children}</button>; }
function InfoBox({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-[#e1e7e1] bg-[#fafcf9] p-4"><p className="text-xs text-[#68736c]">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>; }
function Field({ label, name, placeholder, type = 'text', defaultValue, required, min }: { label: string; name: string; placeholder?: string; type?: string; defaultValue?: string; required?: boolean; min?: string }) { return <label className="block text-sm font-medium text-[#39473f]">{label}<input name={name} type={type} placeholder={placeholder} defaultValue={defaultValue} required={required} min={min} className="mt-1.5 h-10 w-full rounded-xl border border-[#dce3dc] bg-white px-3 text-sm outline-none focus:border-[#5f9b6f]" /></label>; }
function SelectField({ label, name, options, required }: { label: string; name: string; options: [string, string][]; required?: boolean }) { return <label className="block text-sm font-medium text-[#39473f]">{label}<select name={name} required={required} className="mt-1.5 h-10 w-full rounded-xl border border-[#dce3dc] bg-white px-3 text-sm outline-none focus:border-[#5f9b6f]"><option value="">Select an option</option>{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>; }
function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18231d]/35 p-4"><div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between gap-4"><h2 className="text-xl font-bold">{title}</h2><button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-[#68736c] hover:bg-[#f3f6f3]">Close</button></div>{children}</div></div>; }
function DialogActions({ busy, submitLabel }: { busy: boolean; submitLabel: string }) { return <div className="flex justify-end border-t border-[#edf0ed] pt-4"><button disabled={busy} type="submit" className="rounded-lg bg-[#0b5c2c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Working…' : submitLabel}</button></div>; }
