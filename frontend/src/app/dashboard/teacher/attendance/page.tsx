// @ts-nocheck
"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildingsAPI, roomsAPI, assignmentsAPI, attendancesAPI } from "@/lib/api";
import type { User } from "@/types";

function AttendancePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Lists
  const [buildings, setBuildings] = useState<any[]>([]);
  const [selectedBldgId, setSelectedBldgId] = useState("");
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);

  // Selection date
  const [attendanceDate, setAttendanceDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  // Students list derived from active room assignments
  const [students, setStudents] = useState<any[]>([]);

  // Attendance records state
  const [records, setRecords] = useState<{ [studentId: string]: { status: string; leave_reason: string } }>({});

  const [loading, setLoading] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/login");
      return;
    }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== "teacher" && parsedUser.role !== "admin" && parsedUser.role !== "manager") {
      router.push("/login");
      return;
    }
    setCurrentUser(parsedUser);
    fetchBuildingsAndHandleQR();
  }, [router]);

  const fetchBuildingsAndHandleQR = async () => {
    try {
      setLoading(true);
      setError("");

      const bldgRes = await buildingsAPI.getAll();
      if (bldgRes.success && bldgRes.data) {
        setBuildings(bldgRes.data);
      }

      // Check if magic QR code query param exists
      const qrCode = searchParams?.get("qr");
      if (qrCode) {
        // Load all rooms to find the matching Magic QR Code
        const roomsRes = await roomsAPI.getAll();
        if (roomsRes.success && roomsRes.data) {
          const matchedRoom = roomsRes.data.find((r: any) => r.magic_qr_code === qrCode);
          if (matchedRoom) {
            setSelectedBldgId(matchedRoom.building_id);
            setSelectedRoom(matchedRoom);
            setSuccess(`Scanned Magic QR! Room ${matchedRoom.room_number} loaded successfully.`);
            await loadRoomStudents(matchedRoom.id);
          } else {
            setError(`Could not find a room associated with door QR code: "${qrCode}"`);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred loading initial data");
    } finally {
      setLoading(false);
    }
  };

  const handleBuildingChange = async (bldgId: string) => {
    setSelectedBldgId(bldgId);
    setSelectedRoom(null);
    setStudents([]);
    setRecords({});
    setLoadingRooms(true);
    try {
      const res = await roomsAPI.getAll({ building_id: bldgId });
      if (res.success && res.data) {
        setRooms(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleRoomChange = async (roomId: string) => {
    const rm = rooms.find(r => r.id === roomId);
    setSelectedRoom(rm || null);
    if (rm) {
      await loadRoomStudents(rm.id);
    }
  };

  const loadRoomStudents = async (roomId: string) => {
    setLoadingStudents(true);
    setStudents([]);
    setRecords({});
    try {
      // 1. Get active room assignments
      const assignRes = await assignmentsAPI.getAll({ room_id: roomId, is_active: true });
      // 2. Feel if there's previous logs for selected date
      const attendanceRes = await attendancesAPI.getAll({ room_id: roomId, attendance_date: attendanceDate });

      if (assignRes.success && assignRes.data) {
        setStudents(assignRes.data);

        // Build initial local records maps
        const initialRecords: any = {};
        assignRes.data.forEach((assign: any) => {
          const studentId = assign.student_id;

          // Check if there is an existing record for today
          const existing = attendanceRes.success && attendanceRes.data
            ? attendanceRes.data.find((att: any) => att.student_id === studentId)
            : null;

          initialRecords[studentId] = {
            status: existing ? existing.status : "present",
            leave_reason: existing ? existing.leave_reason || "" : "",
          };
        });
        setRecords(initialRecords);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load room occupants.");
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleStatusChange = (studentId: string, status: string) => {
    setRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleLeaveReasonChange = (studentId: string, reason: string) => {
    setRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        leave_reason: reason,
      },
    }));
  };

  const handleMarkAll = (status: string) => {
    const updated = { ...records };
    students.forEach((s: any) => {
      const studentId = s.student_id;
      if (updated[studentId]) {
        updated[studentId].status = status;
      }
    });
    setRecords(updated);
  };

  const handleSubmitAttendance = async () => {
    if (!selectedRoom) return;
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      // Format payload for bulk record API
      const bulkPayload = {
        room_id: selectedRoom.id,
        attendance_date: attendanceDate,
        records: Object.keys(records).map(studentId => ({
          student_id: studentId,
          status: records[studentId].status,
          leave_reason: records[studentId].status === "leave" ? records[studentId].leave_reason : undefined,
        })),
      };

      const res = await attendancesAPI.bulkRecord(bulkPayload);
      if (res.success) {
        setSuccess(`Attendance sheet for Room ${selectedRoom.room_number} recorded successfully!`);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setError(res.error?.message || "Failed to submit attendance");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred during submission");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => router.push(currentUser?.role === "teacher" ? "/dashboard/teacher" : "/dashboard/admin")}>
              ← Back
            </Button>
            <div>
              <h1 className="font-bold text-xl text-emerald-950">Room QR Attendance</h1>
              <p className="text-sm text-gray-600">Scan door QR or select configurations manually</p>
            </div>
          </div>
          <Badge className="bg-emerald-600 capitalize">{currentUser?.role}</Badge>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {error && <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">⚠️ {error}</div>}
        {success && <div className="mb-6 p-4 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-xl">✨ {success}</div>}

        {/* Configuration Selector */}
        <Card className="mb-8 bg-white border">
          <CardHeader className="bg-emerald-600 text-white rounded-t-xl">
            <CardTitle className="text-base font-black">Choose Session Parameters</CardTitle>
            <CardDescription className="text-emerald-100">Setup Date & Dormitory room</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid sm:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="date">Session date</Label>
                <Input
                  id="date"
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="bg-gray-50/50 mt-1"
                />
              </div>

              <div>
                <Label htmlFor="bldg">Dorm Building</Label>
                <Select value={selectedBldgId} onValueChange={(v) => v && handleBuildingChange(v)}>
                  <SelectTrigger id="bldg" className="bg-gray-50/50 mt-1">
                    <SelectValue placeholder="Select Building" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.code} ({b.name})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="room">Room Code</Label>
                <Select value={selectedRoom?.id || ""} onValueChange={(v) => v && handleRoomChange(v)} disabled={!selectedBldgId || loadingRooms}>
                  <SelectTrigger id="room" className="bg-gray-50/50 mt-1">
                    <SelectValue placeholder={loadingRooms ? "Loading..." : "Select Room"} />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map(r => (
                      <SelectItem key={r.id} value={r.id}>Room {r.room_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Sheet */}
        {selectedRoom ? (
          <div className="space-y-6">
            <Card className="bg-white border shadow-sm">
              <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 border-b bg-gray-50/50">
                <div>
                  <h3 className="text-lg font-black text-gray-900">Room {selectedRoom.room_number} Roll Call</h3>
                  <p className="text-xs text-gray-500 font-medium">Academic constraints: {selectedRoom.assigned_major || "Open Major"} | Date: {attendanceDate}</p>
                </div>
                {/* Fast actions */}
                <div className="flex gap-2 mt-4 sm:mt-0">
                  <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-800 hover:bg-emerald-50" onClick={() => handleMarkAll("present")}>
                    All Present
                  </Button>
                  <Button size="sm" variant="outline" className="border-amber-200 text-amber-800 hover:bg-amber-50" onClick={() => handleMarkAll("leave")}>
                    All Leave
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {loadingStudents ? (
                  <div className="py-12 text-center text-gray-500">Loading occupants list...</div>
                ) : students.length > 0 ? (
                  <div className="divide-y space-y-4 divide-gray-150/40">
                    {students.map((assign: any, i) => {
                      const student = assign.student;
                      if (!student) return null;
                      const record = records[student.id] || { status: "present", leave_reason: "" };

                      return (
                        <div key={student.id} className="pt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="space-y-0.5">
                            <h4 className="font-extrabold text-sm text-gray-900">{student.full_name_latin}</h4>
                            <p className="text-xs text-gray-500 capitalize">{student.gender} | Bed Number: {assign.bed_number}</p>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            {/* Present */}
                            <Button
                              size="sm"
                              variant={record.status === "present" ? "default" : "outline"}
                              className={record.status === "present" ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold" : "text-gray-500"}
                              onClick={() => handleStatusChange(student.id, "present")}
                            >
                              Present
                            </Button>

                            {/* Leave */}
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant={record.status === "leave" ? "default" : "outline"}
                                className={record.status === "leave" ? "bg-amber-500 hover:bg-amber-600 text-white font-bold" : "text-gray-500"}
                                onClick={() => handleStatusChange(student.id, "leave")}
                              >
                                Leave
                              </Button>
                              {record.status === "leave" && (
                                <Input
                                  placeholder="Specify Reason"
                                  value={record.leave_reason}
                                  onChange={(e) => handleLeaveReasonChange(student.id, e.target.value)}
                                  className="w-40 text-xs bg-gray-50/70 h-8"
                                />
                              )}
                            </div>

                            {/* Absent */}
                            <Button
                              size="sm"
                              variant={record.status === "absent" ? "default" : "outline"}
                              className={record.status === "absent" ? "bg-rose-600 hover:bg-rose-700 text-white font-bold" : "text-gray-500"}
                              onClick={() => handleStatusChange(student.id, "absent")}
                            >
                              Absent
                            </Button>
                          </div>
                        </div>
                      );
                    })}

                    <div className="pt-6 border-t flex justify-end">
                      <Button
                        onClick={handleSubmitAttendance}
                        disabled={submitting}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6"
                      >
                        {submitting ? "Saving..." : "📁 Submit Attendance Record"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-gray-500 border border-dashed rounded-xl bg-gray-50/50">
                    <p className="font-semibold text-gray-700">No Active Students</p>
                    <p className="text-xs text-gray-500 mt-1">This room does not have any active room assignments registered.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="py-20 text-center bg-white border border-dashed border-gray-200 rounded-2xl">
            <div className="text-6xl mb-4">📱</div>
            <h3 className="text-lg font-black text-gray-800 mb-1">Select a Room</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">Please choose a dormitory building and room number above to load the student list and record attendance.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AttendancePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading search params...</div>}>
      <AttendancePageContent />
    </Suspense>
  );
}
