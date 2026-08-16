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
import { maintenanceAPI } from "@/lib/api";
import type { User } from "@/types";

export default function MaintenanceInboxPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [filteredReqs, setFilteredReqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Stats
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0, emergencies: 0 });

  // Modals & Action forms
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [resolutionForm, setResolutionForm] = useState({ status: "in_progress", resolution_notes: "" });
  const [submittingAction, setSubmittingAction] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/login");
      return;
    }
    const parsedUser = JSON.parse(userData);
    if (!["admin", "manager", "teacher"].includes(parsedUser.role)) {
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

      const [listRes, statsRes] = await Promise.all([
        maintenanceAPI.getAll(),
        maintenanceAPI.getStats(),
      ]);

      if (listRes.success && listRes.data) {
        setRequests(listRes.data);
      }
      if (statsRes.success && statsRes.data) {
        setStats({
          total: statsRes.data.total || 0,
          open: statsRes.data.open || 0,
          inProgress: statsRes.data.in_progress || 0,
          resolved: statsRes.data.resolved || 0,
          emergencies: statsRes.data.emergency || 0,
        });
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred loading maintenance tickets");
    } finally {
      setLoading(false);
    }
  };

  // Frontend filter
  useEffect(() => {
    let result = requests;

    if (statusFilter !== "all") {
      result = result.filter(r => r.status === statusFilter);
    }

    if (urgencyFilter !== "all") {
      result = result.filter(r => r.urgency === urgencyFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        (r.title || "").toLowerCase().includes(q) ||
        (r.reporter?.full_name_latin || "").toLowerCase().includes(q) ||
        (r.room?.room_number || "").toLowerCase().includes(q)
      );
    }

    setFilteredReqs(result);
  }, [requests, statusFilter, urgencyFilter, searchQuery]);

  const handleOpenTicket = async (ticketId: string) => {
    try {
      const res = await maintenanceAPI.getById(ticketId);
      if (res.success && res.data) {
        setSelectedTicket(res.data);
        setResolutionForm({
          status: res.data.status,
          resolution_notes: res.data.resolution_notes || "",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setSubmittingAction(true);
    setError("");
    setSuccess("");
    try {
      const res = await maintenanceAPI.update(selectedTicket.id, resolutionForm);
      if (res.success) {
        setSuccess(`Ticket ID ${selectedTicket.id.slice(0, 8)} updated successfully.`);
        setSelectedTicket(null);
        await fetchData();
      } else {
        setError(res.error?.message || "Failed to update ticket");
      }
    } catch (err) {
      console.error(err);
      setError("Error updating ticket details");
    } finally {
      setSubmittingAction(false);
    }
  };

  const statusBadges = (status: string) => {
    switch (status) {
      case "open": return <Badge className="bg-blue-105 text-blue-700 hover:bg-blue-150 border-none font-semibold capitalize">Open</Badge>;
      case "in_progress": return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-150 border-none font-semibold capitalize">In Progress</Badge>;
      case "resolved": return <Badge className="bg-emerald-100 text-emerald-805 hover:bg-emerald-150 border-none font-semibold capitalize">Resolved</Badge>;
      case "cancelled": return <Badge className="bg-gray-100 text-gray-700 border-none font-semibold capitalize">Cancelled</Badge>;
      default: return <Badge className="bg-gray-100 text-gray-600 capitalize">{status}</Badge>;
    }
  };

  const urgencyBadges = (urgency: string) => {
    switch (urgency) {
      case "low": return <Badge variant="outline" className="border-gray-200 text-gray-500 capitalize">Low</Badge>;
      case "medium": return <Badge variant="outline" className="border-blue-200 text-blue-500 capitalize">Medium</Badge>;
      case "high": return <Badge variant="outline" className="border-orange-200 text-orange-600 capitalize font-bold">High</Badge>;
      case "emergency": return <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700 font-extrabold capitalize animate-pulse">Emergency</Badge>;
      default: return <Badge variant="outline" className="capitalize">{urgency}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading maintenance requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => router.push(currentUser?.role === "teacher" ? "/dashboard/teacher" : currentUser?.role === "admin" ? "/dashboard/admin" : "/dashboard/manager")}>
              ← Back
            </Button>
            <div>
              <h1 className="font-bold text-xl text-purple-950">Maintenance Work Queue</h1>
              <p className="text-sm text-gray-600">Review repair requests and monitor worker resolutions</p>
            </div>
          </div>
          <Badge className="bg-purple-600 capitalize">{currentUser?.role}</Badge>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {error && <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">⚠️ {error}</div>}
        {success && <div className="mb-6 p-4 bg-emerald-50 border border-emerald-250 text-emerald-805 rounded-xl">✨ {success}</div>}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Submitted Tickets", value: stats.total, color: "text-purple-600" },
            { label: "Open Queue", value: stats.open, color: "text-blue-600" },
            { label: "In Progress", value: stats.inProgress, color: "text-amber-600" },
            { label: "Completed / Fixed", value: stats.resolved, color: "text-emerald-600" },
            { label: "Emergencies Priority", value: stats.emergencies, color: "text-red-650" },
          ].map((st, i) => (
            <Card key={i} className="bg-white/95 shadow-sm border border-gray-150">
              <CardContent className="pt-4 pb-4">
                <span className="text-xs text-gray-500 font-bold block mb-1 uppercase tracking-wider">{st.label}</span>
                <span className={`text-2xl font-black ${st.color}`}>{st.value}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-6 bg-white">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <Label htmlFor="status" className="text-xs font-bold text-gray-500 uppercase">Status</Label>
                <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
                  <SelectTrigger id="status" className="w-[140px] bg-gray-50">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="urgency" className="text-xs font-bold text-gray-500 uppercase">Priority</Label>
                <Select value={urgencyFilter} onValueChange={(v) => v && setUrgencyFilter(v)}>
                  <SelectTrigger id="urgency" className="w-[140px] bg-gray-50">
                    <SelectValue placeholder="All Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Pris</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="w-full md:w-80">
              <Input
                placeholder="Search by title, student, room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-50/50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tickets List */}
        <div className="grid gap-4">
          {filteredReqs.map((t) => (
            <div
              key={t.id}
              onClick={() => handleOpenTicket(t.id)}
              className="bg-white p-5 rounded-2xl border hover:border-purple-200 cursor-pointer transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-sm"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h4 className="text-base font-extrabold text-gray-900">{t.title}</h4>
                  <Badge className="bg-purple-50 text-purple-800 border-none font-bold text-[10px] uppercase">{t.category}</Badge>
                  {urgencyBadges(t.urgency)}
                  {statusBadges(t.status)}
                </div>
                <p className="text-xs text-gray-550 max-w-xl line-clamp-1">{t.description}</p>
                <div className="flex items-center gap-4 text-xs font-semibold text-gray-400 pt-2">
                  <span>Room: <strong className="text-gray-805">Room {t.room?.room_number || "Outside Details"}</strong></span>
                  <span>Reported By: <strong className="text-gray-850">{t.reporter?.full_name_latin || "Student"}</strong></span>
                  <span>Date: {new Date(t.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <Button size="sm" variant="outline" className="border-purple-200 text-purple-750 font-bold self-start sm:self-auto shrink-0">
                Update Ticket
              </Button>
            </div>
          ))}

          {filteredReqs.length === 0 && (
            <div className="py-20 text-center bg-white border border-dashed border-gray-200 rounded-2xl">
              <div className="text-5xl mb-3">🔧</div>
              <h4 className="font-bold text-gray-700 mb-1">No Maintenance Requests Found</h4>
              <p className="text-gray-500 text-sm">Matches are empty. Verify selected Priority filter query.</p>
            </div>
          )}
        </div>

        {/* Modal: Ticket details */}
        {selectedTicket && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-lg shadow-2xl bg-white max-h-[92vh] overflow-y-auto rounded-2xl">
              <CardHeader className="bg-purple-600 text-white rounded-t-2xl">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-black">{selectedTicket.title}</CardTitle>
                    <p className="text-xs text-purple-100">Category: {selectedTicket.category} | Room: {selectedTicket.room?.room_number}</p>
                  </div>
                  <Button variant="ghost" onClick={() => setSelectedTicket(null)} className="h-8 w-8 p-0 text-white hover:bg-purple-700">
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-widest text-purple-900 mb-2">Reporter Information</h4>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl border text-sm text-gray-750 font-semibold">
                    <p>Name: <span className="text-gray-900 font-extrabold">{selectedTicket.reporter?.full_name_latin}</span></p>
                    <p>Phone: <span className="text-gray-800">{selectedTicket.reporter?.phone}</span></p>
                    <p className="col-span-2">Email: <span className="text-gray-800 font-normal">{selectedTicket.reporter?.email}</span></p>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-xs uppercase tracking-widest text-purple-900 mb-2">Issue Description</h4>
                  <p className="text-sm p-4 bg-gray-50/50 rounded-xl border text-gray-800 leading-relaxed font-medium">
                    {selectedTicket.description}
                  </p>
                </div>

                {selectedTicket.resolver && (
                  <div className="bg-emerald-50 p-4 border border-emerald-250 rounded-xl text-sm">
                    <h5 className="font-bold text-xs text-emerald-850 uppercase tracking-widest mb-1">Resolution Details</h5>
                    <p className="text-gray-700 font-medium">{selectedTicket.resolution_notes || "Problem has been solved."}</p>
                    <p className="text-[10px] text-emerald-800 font-semibold mt-2 uppercase tracking-wide">
                      Resolved By: {selectedTicket.resolver?.full_name_latin}
                    </p>
                  </div>
                )}

                {/* Form to Update */}
                <form onSubmit={handleUpdateTicket} className="space-y-4 pt-4 border-t border-gray-150">
                  <h4 className="font-bold text-xs uppercase tracking-widest text-purple-900">Manage Dispatch</h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="t_status">Job status</Label>
                      <Select
                        value={resolutionForm.status}
                        onValueChange={(v) => v && setResolutionForm({ ...resolutionForm, status: v })}
                      >
                        <SelectTrigger id="t_status" className="bg-gray-50 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="t_urgency">Override Urgency</Label>
                      <Select
                        value={selectedTicket.urgency}
                        onValueChange={(v) => v && setSelectedTicket({ ...selectedTicket, urgency: v })}
                      >
                        <SelectTrigger id="t_urgency" className="bg-gray-50 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="emergency">Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Work Logs / Resolution Notes</Label>
                    <Input
                      id="notes"
                      value={resolutionForm.resolution_notes}
                      onChange={(e) => setResolutionForm({ ...resolutionForm, resolution_notes: e.target.value })}
                      placeholder="e.g. Plumber replaced seal gasket on bathroom faucet sink"
                      className="bg-gray-50/50 mt-1 placeholder:text-gray-400 text-sm"
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-3 border-t">
                    <Button type="button" variant="outline" onClick={() => setSelectedTicket(null)}>Cancel</Button>
                    <Button type="submit" className="bg-purple-650 hover:bg-purple-700 text-white font-bold" disabled={submittingAction}>
                      Update Dispatch Status
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
