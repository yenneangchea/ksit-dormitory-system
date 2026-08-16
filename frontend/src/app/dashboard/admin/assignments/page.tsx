"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { assignmentsAPI, applicationsAPI } from "@/lib/api";
import type { User } from "@/types";

export default function RoomAssignmentsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<any[]>([]);
  const [unassignedApps, setUnassignedApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [showAutoAssignModal, setShowAutoAssignModal] = useState(false);
  const [academicYear, setAcademicYear] = useState("2025-2026");

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    vacated: 0,
    pendingAutoAssign: 0
  });

  useEffect(() => {
    // Check authentication
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/login");
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== "admin" && parsedUser.role !== "manager") {
      router.push("/login");
      return;
    }

    setCurrentUser(parsedUser);
    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch assignments
      const assignResponse = await assignmentsAPI.getAll();
      let assignmentsList = [];
      if (assignResponse.success && assignResponse.data) {
        assignmentsList = assignResponse.data;
        setAssignments(assignmentsList);
      } else {
        setError(assignResponse.error?.message || "Failed to fetch assignments");
      }

      // Fetch pending approved applications
      const appsResponse = await applicationsAPI.getAll({ status: "approved" });
      let pendingAppsList = [];
      if (appsResponse.success && appsResponse.data) {
        pendingAppsList = appsResponse.data;
        setUnassignedApps(pendingAppsList);
      }

      // Calculate statistics
      setStats({
        total: assignmentsList.length,
        active: assignmentsList.filter((a: any) => a.is_active).length,
        vacated: assignmentsList.filter((a: any) => !a.is_active).length,
        pendingAutoAssign: pendingAppsList.length
      });

    } catch (err) {
      setError("An error occurred while fetching assignments data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filters assignments list
  useEffect(() => {
    let filtered = assignments;

    // Status filter
    if (statusFilter === "active") {
      filtered = filtered.filter(a => a.is_active);
    } else if (statusFilter === "vacated") {
      filtered = filtered.filter(a => !a.is_active);
    }

    // Gender filter
    if (genderFilter !== "all") {
      filtered = filtered.filter(a => a.student?.gender === genderFilter);
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.student?.full_name_latin?.toLowerCase().includes(search) ||
        a.student?.full_name_khmer?.includes(search) ||
        a.student?.email?.toLowerCase().includes(search) ||
        a.room?.room_number?.toLowerCase().includes(search) ||
        a.room?.building?.code?.toLowerCase().includes(search) ||
        a.room?.building?.name?.toLowerCase().includes(search)
      );
    }

    setFilteredAssignments(filtered);
  }, [assignments, searchTerm, statusFilter, genderFilter]);

  const handleAutoAssign = async () => {
    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const response = await assignmentsAPI.autoAssign(academicYear);

      if (response.success) {
        setSuccess(response.message || "Auto-assignment completed successfully!");
        setShowAutoAssignModal(false);
        await fetchData();
      } else {
        setError(response.error?.message || "Failed running auto-assignment");
      }
    } catch (err) {
      setError("An error occurred during auto-assignment execution");
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVacate = async (id: string) => {
    if (!confirm("Are you sure you want to vacate this room assignment? The student will be recorded as vacated and the bed space will become available.")) return;

    try {
      setActionLoading(true);
      const response = await assignmentsAPI.vacate(id);

      if (response.success) {
        setSuccess("Assignment vacated successfully!");
        await fetchData();
      } else {
        setError(response.error?.message || "Failed to vacate assignment");
      }
    } catch (err) {
      setError("An error occurred while vacating the assignment");
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this assignment history? This action cannot be undone.")) return;

    try {
      setActionLoading(true);
      const response = await assignmentsAPI.delete(id);

      if (response.success) {
        setSuccess("Assignment deleted successfully!");
        await fetchData();
      } else {
        setError(response.error?.message || "Failed to delete assignment");
      }
    } catch (err) {
      setError("An error occurred while deleting the assignment");
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading room assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => router.push(currentUser?.role === "admin" ? "/dashboard/admin" : "/dashboard/manager")}>
              ← Back
            </Button>
            <div>
              <h1 className="font-bold text-xl text-indigo-900">Room Assignments</h1>
              <p className="text-sm text-gray-600">Assign beds and manage student room placements</p>
            </div>
          </div>
          <Badge className="bg-indigo-600 capitalize">{currentUser?.role}</Badge>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center justify-between">
            <span>⚠️ {error}</span>
            <Button variant="ghost" size="sm" onClick={() => setError("")}>X</Button>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center justify-between">
            <span>✨ {success}</span>
            <Button variant="ghost" size="sm" onClick={() => setSuccess("")}>X</Button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white border hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardDescription className="text-sm font-semibold text-gray-500">Active Allocations</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-emerald-600">{stats.active}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardDescription className="text-sm font-semibold text-gray-500">Vacated History</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-600">{stats.vacated}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardDescription className="text-sm font-semibold text-gray-500">Total Records</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-indigo-700">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border border-amber-200 bg-amber-50/30 hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardDescription className="text-sm font-semibold text-amber-700">Unassigned Approved</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-600">{stats.pendingAutoAssign}</p>
            </CardContent>
          </Card>
        </div>

        {/* Unassigned Warning Banner */}
        {stats.pendingAutoAssign > 0 && (
          <div className="mb-8 p-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-amber-900 mb-1">Approved Applications Pending Placement</h2>
              <p className="text-amber-800 text-sm max-w-2xl">
                There are currently <strong>{stats.pendingAutoAssign}</strong> approved student applications without dormitory bed assignments. You can trigger the Waterfall Auto-Assignment Algorithm to instantly allocate them.
              </p>
            </div>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold whitespace-nowrap shadow"
              onClick={() => setShowAutoAssignModal(true)}
              disabled={actionLoading}
            >
              🚀 Run Waterfall Auto-Assign
            </Button>
          </div>
        )}

        {/* Management Controls */}
        <Card className="mb-6 bg-white shadow-sm border">
          <CardHeader>
            <CardTitle>Dormitory Placements ({filteredAssignments.length})</CardTitle>
            <CardDescription>Search placements, filter by status, or trigger allocation runs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 w-full">
                <Input
                  placeholder="Search by student, room number, building..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                <div className="w-full md:w-[150px]">
                  <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Placements" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                      <SelectItem value="vacated">Vacated Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full md:w-[150px]">
                  <Select value={genderFilter} onValueChange={(v) => v && setGenderFilter(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Genders" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Genders</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full md:w-auto border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                onClick={() => setShowAutoAssignModal(true)}
                disabled={actionLoading}
              >
                Auto-Assign Run
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Room Assignments List */}
        <div className="grid gap-4">
          {filteredAssignments.map((assignment: any) => (
            <Card key={assignment.id} className={`border hover:shadow-md transition-shadow bg-white ${!assignment.is_active ? 'opacity-88 bg-gray-50/50' : 'border-l-4 border-l-emerald-500'}`}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
                  {/* Left Side: Student Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-indigo-950">
                        {assignment.student?.full_name_latin}
                      </h3>
                      <Badge className={assignment.student?.gender === 'male' ? 'bg-sky-100 text-sky-800 hover:bg-sky-100' : 'bg-rose-100 text-rose-800 hover:bg-rose-100'}>
                        {assignment.student?.gender}
                      </Badge>
                      <Badge className={assignment.is_active ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : 'bg-gray-100 text-gray-700 hover:bg-gray-100'}>
                        {assignment.is_active ? "Active" : "Vacated"}
                      </Badge>
                    </div>
                    <p className="text-gray-600 font-medium text-sm mb-3">
                      {assignment.student?.full_name_khmer}
                    </p>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-gray-600">
                      <div>📧 Email: <span className="font-semibold text-gray-800">{assignment.student?.email}</span></div>
                      <div>📱 Phone: <span className="font-semibold text-gray-800">{assignment.student?.phone}</span></div>
                      <div>🎓 Major: <span className="font-semibold text-gray-800">IT / CS</span></div>
                      <div>📅 Year: <span className="font-semibold text-gray-800">{assignment.academic_year}</span></div>
                    </div>
                  </div>

                  {/* Middle Side: Room and building placement */}
                  <div className="flex-1 bg-indigo-50/50 rounded-xl p-4 border border-indigo-100/60 max-w-sm">
                    <h4 className="text-sm font-semibold text-indigo-500 uppercase tracking-widest mb-1.5">Assigned Location</h4>
                    <p className="text-2xl font-black text-indigo-950 flex items-baseline gap-1">
                      Room {assignment.room?.room_number}
                      <span className="text-sm font-medium text-indigo-700">({assignment.room?.building?.code})</span>
                    </p>
                    <div className="mt-2 text-sm text-indigo-805 space-y-1">
                      <div>🏢 Building: <span className="font-bold">{assignment.room?.building?.name || "N/A"}</span></div>
                      <div>🛌 Bed Number: <span className="font-bold text-indigo-900 text-base">Bed #{assignment.bed_number}</span></div>
                      <div>📶 Floor: <span className="font-bold">{assignment.room?.floor_number}F</span></div>
                    </div>
                  </div>

                  {/* Right Side: Action buttons */}
                  <div className="flex flex-row md:flex-col justify-end gap-3 min-w-[120px]">
                    <div className="text-xs text-gray-500 text-right md:-mt-1 mb-1">
                      {assignment.is_active ? (
                        <div>Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}</div>
                      ) : (
                        <div>Vacated: {assignment.vacated_at ? new Date(assignment.vacated_at).toLocaleDateString() : 'N/A'}</div>
                      )}
                    </div>
                    {assignment.is_active ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-rose-700 hover:text-white hover:bg-rose-600 border-rose-200"
                        onClick={() => handleVacate(assignment.id)}
                        disabled={actionLoading}
                      >
                        Vacate Student
                      </Button>
                    ) : (
                      currentUser?.role === 'admin' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          onClick={() => handleDelete(assignment.id)}
                          disabled={actionLoading}
                        >
                          Delete Record
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredAssignments.length === 0 && (
            <Card>
              <CardContent className="p-16 text-center">
                <div className="text-gray-400 text-4xl mb-3">🛏️</div>
                <p className="text-gray-600 font-semibold mb-2">No Room Assignments Found</p>
                <p className="text-gray-500 text-sm max-w-md mx-auto">
                  {searchTerm || statusFilter !== "all" || genderFilter !== "all"
                    ? "Try adjusting filters or clearing the search text to find room assignments."
                    : "There are no student bed assignments in the system yet. Run Waterfall Auto-Assignment if you have approved applications."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Waterfall Auto-Assignment Dialog Modal */}
        {showAutoAssignModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <Card className="w-full max-w-lg shadow-2xl bg-white border border-indigo-150">
              <CardHeader className="bg-indigo-600 text-white rounded-t-xl">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  🚀 Waterfall Auto-Assignment
                </CardTitle>
                <CardDescription className="text-indigo-100">
                  Runs the intelligent room allocation algorithm based on compatibility priorities.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-gray-700 uppercase tracking-widest">Priority Mapping Priorities</h4>
                  <ol className="text-sm font-medium text-gray-600 space-y-2 list-decimal list-inside">
                    <li><strong className="text-indigo-900">Priority 1: Same Major & Year</strong> — Groups classmates together</li>
                    <li><strong className="text-indigo-900">Priority 2: Same Major</strong> — Groups similar academic paths</li>
                    <li><strong className="text-indigo-900">Priority 3: Same Academic Year</strong> — Groups similar seniorities</li>
                    <li><strong className="text-indigo-900">Priority 4: Any Empty Space</strong> — Optimizes total occupancy</li>
                  </ol>
                </div>

                <div className="border-t pt-4">
                  <Label htmlFor="academic_year" className="text-sm font-bold text-gray-700 block mb-2">
                    Academic Year to Process
                  </Label>
                  <Select value={academicYear} onValueChange={(v) => v && setAcademicYear(v)}>
                    <SelectTrigger id="academic_year" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025-2026">2025-2026</SelectItem>
                      <SelectItem value="2026-2027">2026-2027</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg p-4 mt-2">
                  💡 <strong>Note:</strong> Auto-assignment will only evaluate student applications in <strong>Approved</strong> code status. It respects boys/girls building segregation and updates dormitory room capacities automatically.
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAutoAssignModal(false)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                    onClick={handleAutoAssign}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Processing Allocations..." : "Execute Auto-Assign"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
