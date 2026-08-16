'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { roomsAPI, attendancesAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type AttendanceStatus = 'present' | 'absent' | 'leave';

interface StudentRecord {
  student_id: string;
  bed_number: number;
  student: { id: string; full_name_latin: string; full_name_khmer: string; gender: string };
  status: AttendanceStatus;
  leave_reason: string;
}

function QRAttendanceScanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qrCode = searchParams.get('qr') || '';

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [room, setRoom] = useState<any>(null);
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [manualQr, setManualQr] = useState(qrCode);

  useEffect(() => {
    const ud = localStorage.getItem('user');
    if (!ud) { router.push('/login'); return; }
    const u = JSON.parse(ud);
    if (!['admin', 'manager', 'teacher'].includes(u.role)) { router.push('/login'); return; }
    setCurrentUser(u);
    if (qrCode) loadRoom(qrCode);
    else setLoading(false);
  }, [qrCode, router]);

  const loadRoom = useCallback(async (qr: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await roomsAPI.getByQrCode(qr);
      if (!res.success || !res.data) {
        setError('Room not found for this QR code. Please check and try again.');
        setLoading(false);
        return;
      }
      setRoom(res.data);
      // Initialise attendance records — default all present
      const initial: StudentRecord[] = (res.data.active_students || []).map((a: any) => ({
        student_id: a.student_id,
        bed_number: a.bed_number,
        student: a.student,
        status: 'present' as AttendanceStatus,
        leave_reason: '',
      }));
      setRecords(initial);
      // Load any existing attendance for today
      const attRes = await attendancesAPI.getRoomByDate(res.data.id, attendanceDate);
      if (attRes.success && attRes.data) {
        setRecords(prev => prev.map(r => {
          const existing = attRes.data.find((a: any) => a.student_id === r.student_id);
          if (existing?.attendance) {
            return { ...r, status: existing.attendance.status, leave_reason: existing.attendance.leave_reason || '' };
          }
          return r;
        }));
      }
    } catch (e) { setError('Failed to load room data'); }
    finally { setLoading(false); }
  }, [attendanceDate]);

  const handleDateChange = (date: string) => {
    setAttendanceDate(date);
    if (room) loadRoom(room.magic_qr_code);
  };

  const updateRecord = (studentId: string, field: 'status' | 'leave_reason', value: string) => {
    setRecords(prev => prev.map(r => r.student_id === studentId ? { ...r, [field]: value } : r));
  };

  const setAll = (status: AttendanceStatus) => {
    setRecords(prev => prev.map(r => ({ ...r, status })));
  };

  const handleSave = async () => {
    if (!room) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await attendancesAPI.bulkRecord({
        room_id: room.id,
        attendance_date: attendanceDate,
        records: records.map(r => ({
          student_id: r.student_id,
          status: r.status,
          leave_reason: r.leave_reason || undefined,
        })),
      });
      if (res.success) {
        setSuccess(`Attendance saved for ${records.length} students in Room ${room.room_number}.`);
      } else {
        setError(res.error?.message || 'Failed to save attendance');
      }
    } catch (e) { setError('Error saving attendance'); }
    finally { setSaving(false); }
  };

  const statusColor: Record<AttendanceStatus, string> = {
    present: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    absent: 'bg-red-100 text-red-800 border-red-200',
    leave: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  };

  const presentCount = records.filter(r => r.status === 'present').length;
  const absentCount = records.filter(r => r.status === 'absent').length;
  const leaveCount = records.filter(r => r.status === 'leave').length;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading room data...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50">
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>← Back</Button>
            <div>
              <h1 className="font-bold text-lg text-teal-950">QR Attendance Check-In</h1>
              <p className="text-xs text-gray-500">Scan room door QR to record nightly attendance</p>
            </div>
          </div>
          <Badge className="bg-teal-600 capitalize">{currentUser?.role}</Badge>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">⚠️ {error}</div>}
        {success && <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm">✓ {success}</div>}

        {/* QR / Manual lookup */}
        {!room && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Enter Room QR Code</CardTitle>
              <CardDescription>Paste the QR code value from the room door sticker</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Input placeholder="e.g. ROOM-A101-QR" value={manualQr}
                onChange={e => setManualQr(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadRoom(manualQr)} />
              <Button onClick={() => loadRoom(manualQr)} disabled={!manualQr}>
                Load Room
              </Button>
            </CardContent>
          </Card>
        )}

        {room && (
          <>
            {/* Room header */}
            <div className="mb-5 p-4 bg-teal-600 text-white rounded-2xl flex justify-between items-center">
              <div>
                <p className="text-xs uppercase tracking-widest text-teal-100 font-bold">Room</p>
                <h2 className="text-2xl font-black">{room.room_number}</h2>
                <p className="text-sm text-teal-100">{room.building?.name} · Floor {room.floor_number} · {room.gender}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-teal-100">Occupancy</p>
                <p className="text-xl font-black">{room.occupied_count}/{room.capacity}</p>
              </div>
            </div>

            {/* Date and quick-select */}
            <div className="flex flex-wrap items-end gap-3 mb-5">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider">Attendance Date</Label>
                <Input type="date" value={attendanceDate} onChange={e => handleDateChange(e.target.value)} className="mt-1 w-40" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-700" onClick={() => setAll('present')}>All Present</Button>
                <Button size="sm" variant="outline" className="border-red-300 text-red-700" onClick={() => setAll('absent')}>All Absent</Button>
              </div>
            </div>

            {/* Summary pills */}
            <div className="flex gap-3 mb-4">
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">✓ Present: {presentCount}</span>
              <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold">✗ Absent: {absentCount}</span>
              <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-bold">📋 Leave: {leaveCount}</span>
            </div>

            {records.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <p className="text-2xl mb-2">🛏️</p>
                  <p className="font-semibold">No students assigned to this room</p>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              {records.map((r) => (
                <div key={r.student_id} className={`p-4 rounded-xl border-2 ${statusColor[r.status]} transition-colors`}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900">{r.student?.full_name_latin}</span>
                        <Badge variant="outline" className="text-[10px] border-gray-300">Bed #{r.bed_number}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{r.student?.full_name_khmer}</p>
                    </div>
                    <div className="flex gap-2">
                      {(['present', 'absent', 'leave'] as AttendanceStatus[]).map(s => (
                        <button key={s} onClick={() => updateRecord(r.student_id, 'status', s)}
                          className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${r.status === s ? statusColor[s] + ' border-current' : 'bg-white/60 text-gray-500 border-gray-200 hover:border-gray-400'}`}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  {r.status === 'leave' && (
                    <Input className="mt-2 bg-white/70 text-sm h-8" placeholder="Leave reason (e.g. sick, family)"
                      value={r.leave_reason} onChange={e => updateRecord(r.student_id, 'leave_reason', e.target.value)} />
                  )}
                </div>
              ))}
            </div>

            {records.length > 0 && (
              <Button className="w-full mt-6 bg-teal-600 hover:bg-teal-700 text-white font-bold py-6 text-base"
                onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : `💾 Save Attendance (${records.length} students)`}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function QRAttendanceScanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <QRAttendanceScanContent />
    </Suspense>
  );
}
