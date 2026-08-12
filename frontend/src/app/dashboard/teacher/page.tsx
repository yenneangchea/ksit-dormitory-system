'use client';

import { useEffect, useState } from 'react';
import { Camera, CheckCircle2, ClipboardCheck, UsersRound } from 'lucide-react';
import { PortalShell } from '@/components/portal-shell';
import { attendanceAPI, magicQrAPI } from '@/lib/api';

type Resident = { student_id: string; bed_number: number; users?: { full_name_latin?: string; full_name_khmer?: string } | null };
type RoomScan = { room?: { room_number?: string; buildings?: { code?: string; name?: string } | null }; residents?: Resident[] };
type AttendanceRow = { id: string; attendance_date: string; status: string; leave_reason?: string; rooms?: { room_number?: string } | null; users?: { full_name_latin?: string } | null };

export default function TeacherDashboard() {
  const [magicQrCode, setMagicQrCode] = useState('');
  const [scan, setScan] = useState<RoomScan | null>(null);
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [notice, setNotice] = useState('');
  const [working, setWorking] = useState(false);

  async function loadToday() {
    const response = await attendanceAPI.list({ date: new Date().toISOString().slice(0, 10) });
    if (response.success && response.data) setRecords(response.data as AttendanceRow[]);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadToday(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function resolveRoom() {
    setWorking(true);
    const response = await magicQrAPI.resolve(magicQrCode.trim());
    setWorking(false);
    if (!response.success) {
      setScan(null);
      setNotice(response.error?.message || 'Unable to read that Magic QR code.');
      return;
    }
    setScan(response.data as RoomScan);
    setNotice('Room verified. Select a resident to record their attendance.');
  }

  async function record(studentId: string, status: 'present' | 'absent' | 'leave') {
    setWorking(true);
    const response = await magicQrAPI.scanAttendance({ magic_qr_code: magicQrCode.trim(), student_id: studentId, status });
    setWorking(false);
    setNotice(response.success ? `Attendance marked ${status}.` : response.error?.message || 'Unable to record attendance.');
    if (response.success) await loadToday();
  }

  const present = records.filter((record) => record.status === 'present').length;
  const absent = records.filter((record) => record.status === 'absent').length;
  const leave = records.filter((record) => record.status === 'leave').length;

  return <PortalShell role="teacher"><section className="min-h-[calc(100vh-156px)]"><div className="mb-8"><h1 className="text-[29px] font-extrabold tracking-[-0.045em]">Welcome back, Teacher Portal</h1><p className="mt-1.5 text-sm text-[#68736c]">Validate room access, take accurate daily attendance, and monitor resident engagement.</p></div>{notice && <div className="mb-5 rounded-xl border border-[#cfe0d1] bg-[#edf7ee] px-4 py-3 text-sm text-[#16582b]">{notice}</div>}<div className="grid gap-4 sm:grid-cols-3"><Kpi icon={<CheckCircle2 />} label="Present today" value={present} /><Kpi icon={<UsersRound />} label="Absent today" value={absent} /><Kpi icon={<ClipboardCheck />} label="On approved leave" value={leave} /></div><div className="mt-8 grid gap-6 xl:grid-cols-[1fr_1.2fr]"><section className="ksit-card p-6"><div className="flex items-center gap-2 text-[#0b5c2c]"><Camera className="size-5" /><h2 className="text-lg font-bold text-[#18231d]">Magic QR attendance scan</h2></div><p className="mt-2 text-sm leading-6 text-[#68736c]">Enter the room’s encoded Magic QR value from the scanner to load its active residents.</p><div className="mt-6 flex flex-col gap-3 sm:flex-row"><input value={magicQrCode} onChange={(event) => setMagicQrCode(event.target.value)} placeholder="Scan or paste Magic QR code" className="h-10 flex-1 rounded-xl border border-[#dce3dc] bg-white px-3 text-sm outline-none focus:border-[#5f9b6f]" /><button disabled={working || !magicQrCode.trim()} onClick={() => void resolveRoom()} className="h-10 rounded-lg bg-[#0b5c2c] px-4 text-sm font-semibold text-white disabled:opacity-50">Verify room</button></div>{scan?.room && <div className="mt-6 rounded-xl border border-[#dfe7df] bg-[#fafcf9] p-4"><p className="font-semibold">{scan.room.buildings?.code || 'Residence'} · Room {scan.room.room_number}</p><p className="mt-1 text-xs text-[#68736c]">{scan.residents?.length || 0} active resident{(scan.residents?.length || 0) === 1 ? '' : 's'} loaded from the secured room record.</p></div>}</section><section className="ksit-card overflow-hidden"><div className="p-6"><h2 className="text-lg font-bold">Resident attendance register</h2><p className="mt-1 text-sm text-[#68736c]">Record the selected status for every resident returned by the verified room QR.</p></div>{!scan?.residents?.length ? <p className="border-t border-[#edf0ed] px-6 py-8 text-sm text-[#68736c]">Verify a room Magic QR code to begin taking attendance.</p> : <div className="border-t border-[#edf0ed]">{scan.residents.map((resident) => <div key={resident.student_id} className="flex flex-col gap-3 border-b border-[#edf0ed] px-6 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{resident.users?.full_name_latin || resident.users?.full_name_khmer || 'Resident'}</p><p className="mt-1 text-xs text-[#68736c]">Bed {resident.bed_number}</p></div><div className="flex gap-2"><StatusButton disabled={working} onClick={() => void record(resident.student_id, 'present')} tone="positive">Present</StatusButton><StatusButton disabled={working} onClick={() => void record(resident.student_id, 'absent')} tone="muted">Absent</StatusButton></div></div>)}</div>}</section></div><section className="ksit-card mt-8 overflow-hidden"><div className="flex items-center justify-between p-6"><div><h2 className="text-lg font-bold">Today’s scan history</h2><p className="mt-1 text-sm text-[#68736c]">The latest recorded status for every checked-in resident.</p></div><button onClick={() => void loadToday()} className="rounded-lg border border-[#dce3dc] px-3 py-2 text-sm font-semibold text-[#47554d] hover:bg-[#f7f9f6]">Refresh</button></div>{records.length === 0 ? <p className="border-t border-[#edf0ed] px-6 py-6 text-sm text-[#68736c]">No scans have been logged today.</p> : <div className="border-t border-[#edf0ed]">{records.map((record) => <div key={record.id} className="flex items-center justify-between gap-4 border-b border-[#edf0ed] px-6 py-4"><div><p className="font-semibold">{record.users?.full_name_latin || 'Resident'} · Room {record.rooms?.room_number || '—'}</p><p className="mt-1 text-xs text-[#68736c]">{record.attendance_date}{record.leave_reason ? ` · ${record.leave_reason}` : ''}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${record.status === 'present' ? 'bg-[#eaf6ec] text-[#1a6a37]' : 'bg-[#f5f0e7] text-[#806525]'}`}>{record.status}</span></div>)}</div>}</section></section></PortalShell>;
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <div className="ksit-card min-h-[150px] p-5"><div className="flex items-center justify-between text-[#0b5c2c]"><p className="text-sm font-medium text-[#59655e]">{label}</p>{icon}</div><p className="mt-7 text-3xl font-extrabold tracking-[-0.04em]">{value}</p></div>; }
function StatusButton({ onClick, disabled, tone, children }: { onClick: () => void; disabled: boolean; tone: 'positive' | 'muted'; children: React.ReactNode }) { return <button onClick={onClick} disabled={disabled} className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${tone === 'positive' ? 'bg-[#0b5c2c] text-white hover:bg-[#084a23]' : 'border border-[#dce3dc] text-[#526058] hover:bg-[#f6f8f5]'}`}>{children}</button>; }
