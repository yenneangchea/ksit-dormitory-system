"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { applicationsAPI, storageAPI } from "@/lib/api";
import type { User } from "@/types";

export default function ApplicationsReviewPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [filteredApps, setFilteredApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Detail Modal / Sidebar
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [actioning, setActioning] = useState(false);
  const [previewingDocument, setPreviewingDocument] = useState<string | null>(null);

  // Statistics
  const [stats, setStats] = useState({ totalCount: 0, pending: 0, approved: 0, rejected: 0, assigned: 0 });

  useEffect(() => {
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
    fetchApplications();
  }, [router]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await applicationsAPI.getAll();
      if (res.success && res.data) {
        setApplications(res.data);
        calculateStats(res.data);
      } else {
        setError(res.error?.message || "Failed to load applications");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred loading applications");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: any[]) => {
    const totalCount = data.length;
    const pending = data.filter(a => a.status === 'submitted' || a.status === 'under_review').length;
    const approved = data.filter(a => a.status === 'approved').length;
    const rejected = data.filter(a => a.status === 'rejected').length;
    const assigned = data.filter(a => a.status === 'assigned').length;

    setStats({ totalCount, pending, approved, rejected, assigned });
  };

  // Apply filters in frontend
  useEffect(() => {
    let result = applications;

    if (statusFilter !== "all") {
      result = result.filter(a => a.status === statusFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        (a.user?.full_name_latin || "").toLowerCase().includes(q) ||
        (a.user?.full_name_khmer || "").includes(q) ||
        (a.user?.email || "").toLowerCase().includes(q)
      );
    }

    setFilteredApps(result);
  }, [applications, statusFilter, searchQuery]);

  const handleReview = async (appId: string) => {
    // Automatically set status to 'under_review' if it's currently 'submitted'
    try {
      const app = applications.find(a => a.id === appId);
      if (app && app.status === 'submitted') {
        await applicationsAPI.update(appId, { status: 'under_review' });
        // Refresh local cache silently
        setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: 'under_review' } : a));
      }
      setSelectedApp(applications.find(a => a.id === appId) || null);
      setShowRejectForm(false);
      setRejectionReason("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    setActioning(true);
    setError("");
    setSuccess("");
    try {
      const res = await applicationsAPI.update(selectedApp.id, {
        status: "approved",
      });
      if (res.success) {
        const updatedApplication = { ...selectedApp, ...res.data };
        setSelectedApp(updatedApplication);
        setApplications(prev => prev.map(app => app.id === updatedApplication.id ? updatedApplication : app));
        const archiveMessage = res.sync?.success === false ? ` ${res.sync.message}` : '';
        setSuccess(`Application for ${selectedApp.user?.full_name_latin} approved!${archiveMessage}`);
        await fetchApplications();
      } else {
        setError(res.error?.message || "Failed to approve application");
      }
    } catch (err) {
      console.error(err);
      setError("Error approving application");
    } finally {
      setActioning(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || !rejectionReason.trim()) return;
    setActioning(true);
    setError("");
    setSuccess("");
    try {
      const res = await applicationsAPI.update(selectedApp.id, {
        status: "rejected",
        rejection_reason: rejectionReason,
      });
      if (res.success) {
        setSuccess(`Application for ${selectedApp.user?.full_name_latin} rejected.`);
        setSelectedApp(null);
        setShowRejectForm(false);
        setRejectionReason("");
        await fetchApplications();
      } else {
        setError(res.error?.message || "Failed to reject application");
      }
    } catch (err) {
      console.error(err);
      setError("Error rejecting application");
    } finally {
      setActioning(false);
    }
  };

  const handleDocumentPreview = async (documentKey: string, document: any) => {
    if (!document?.path) return;
    setPreviewingDocument(documentKey);
    const result = await storageAPI.getPreviewUrl(document.bucket || (documentKey === 'photo_4x6' ? 'student-avatars' : 'student-documents'), document.path);
    setPreviewingDocument(null);
    if (result.success && result.data?.url) {
      window.open(result.data.url, '_blank', 'noopener,noreferrer');
    } else {
      setError(result.error?.message || 'The preview link could not be created.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted": return <Badge className="bg-blue-100 text-blue-800 border-none font-semibold">Submitted</Badge>;
      case "under_review": return <Badge className="bg-yellow-100 text-yellow-800 border-none font-semibold">Under Review</Badge>;
      case "approved": return <Badge className="bg-emerald-100 text-emerald-800 border-none font-semibold">Approved</Badge>;
      case "rejected": return <Badge className="bg-rose-100 text-rose-800 border-none font-semibold">Rejected</Badge>;
      case "assigned": return <Badge className="bg-purple-100 text-purple-850 border-none font-semibold">Beds Assigned</Badge>;
      default: return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading student applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50">
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => router.push(currentUser?.role === "admin" ? "/dashboard/admin" : "/dashboard/manager")}>
              ← Back
            </Button>
            <div>
              <h1 className="font-bold text-xl text-indigo-950">Application Review Inbox</h1>
              <p className="text-sm text-gray-600">Audit submitted files and approve for auto-assignment queue</p>
            </div>
          </div>
          <Badge className="bg-indigo-600 capitalize">{currentUser?.role}</Badge>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {error && <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">⚠️ {error}</div>}
        {success && <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl">✨ {success}</div>}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Submitted Queue", value: stats.pending, color: "text-blue-600" },
            { label: "Approved Candidates", value: stats.approved, color: "text-emerald-600" },
            { label: "Assigned Bedrooms", value: stats.assigned, color: "text-purple-600" },
            { label: "Rejected Applications", value: stats.rejected, color: "text-rose-600" },
            { label: "Total Applications", value: stats.totalCount, color: "text-gray-605" },
          ].map((st, i) => (
            <Card key={i} className="bg-white/90 shadow-sm border border-gray-150">
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
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              {[
                { value: "all", label: "All Statuses" },
                { value: "submitted", label: "Submitted" },
                { value: "under_review", label: "Under Review" },
                { value: "approved", label: "Approved" },
                { value: "assigned", label: "Assigned" },
                { value: "rejected", label: "Rejected" },
              ].map(opt => (
                <Button
                  key={opt.value}
                  size="sm"
                  variant={statusFilter === opt.value ? "default" : "outline"}
                  className={statusFilter === opt.value ? "bg-indigo-600 font-semibold" : "text-gray-600"}
                  onClick={() => setStatusFilter(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>

            <div className="w-full md:w-80">
              <Input
                placeholder="Search candidates by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-50/50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Listings */}
        <div className="grid gap-4">
          {filteredApps.map((app) => (
            <div
              key={app.id}
              className="bg-white p-5 rounded-2xl border hover:border-indigo-200 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-sm shadow-indigo-50/50"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-extrabold text-gray-900">{app.user?.full_name_latin}</h3>
                  <span className="text-sm font-semibold text-gray-400">({app.user?.gender})</span>
                  {getStatusBadge(app.status)}
                </div>
                <p className="text-gray-500 text-xs font-medium">Applied Year: <span className="text-gray-800 font-semibold">{app.academic_year_applied}</span> | Date: {new Date(app.applied_at).toLocaleDateString()}</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-0.5 text-xs text-indigo-900/60 pt-2 font-medium">
                  <p>📧 {app.user?.email || "No Email"}</p>
                  <p>📱 {app.user?.phone || "No Phone"}</p>
                  <p>🎓 {app.academic_profile?.major || "No Major Info"}</p>
                  <p>🏢 Class: {app.academic_profile?.class_section || "N/A"}</p>
                </div>
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                <Button variant="outline" size="sm" className="w-full md:w-auto border-indigo-200 text-indigo-700" onClick={() => handleReview(app.id)}>
                  View Document Checklist
                </Button>
              </div>
            </div>
          ))}

          {filteredApps.length === 0 && (
            <div className="py-20 text-center bg-white border border-dashed border-gray-200 rounded-2xl">
              <div className="text-5xl mb-3">📁</div>
              <h4 className="font-bold text-gray-700 mb-1">No Applications Found</h4>
              <p className="text-gray-500 text-sm">Matches are empty. Check your status filter parameters.</p>
            </div>
          )}
        </div>

        {/* Modal: Document Verification list */}
        {selectedApp && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-xl shadow-2xl bg-white max-h-[92vh] overflow-y-auto rounded-2xl">
              <CardHeader className="bg-indigo-600 text-white rounded-t-2xl">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-black">{selectedApp.user?.full_name_latin}</CardTitle>
                    <p className="text-xs text-indigo-150">Enrollment Year: {selectedApp.academic_profile?.academic_year || "Unknown"}</p>
                  </div>
                  <Button variant="ghost" onClick={() => setSelectedApp(null)} className="h-8 w-8 p-0 text-white hover:bg-indigo-700">
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-widest text-indigo-900 mb-3">Academic Placement Info</h4>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl border text-sm text-gray-700">
                    <p><strong>Major Constraint:</strong> {selectedApp.academic_profile?.major || "Computer Science"}</p>
                    <p><strong>Class Section:</strong> {selectedApp.academic_profile?.class_section || "N/A"}</p>
                    <p><strong>Student ID Card:</strong> {selectedApp.academic_profile?.student_id_card || "N/A"}</p>
                    <p><strong>Mobile No:</strong> {selectedApp.user?.phone}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-xs uppercase tracking-widest text-indigo-900 mb-2.5">Uploaded Verification Documents</h4>

                  <div className="space-y-2">
                    {[
                      { key: 'photo_4x6', flag: 'photo_4x6_attached', label: 'Recent 4x6 Passport Photo' },
                      { key: 'contract', flag: 'contract_signed', label: 'Signed Dormitory Rules Contract' },
                      { key: 'parent_guarantee', flag: 'parent_guarantee_attached', label: 'Parent Guarantor Guarantee Letter' },
                      { key: 'family_book', flag: 'family_book_attached', label: 'Official family registration book copy' },
                      { key: 'id_card', flag: 'id_card_attached', label: 'National ID Identification Card Copy' },
                    ].map((doc) => {
                      const document = selectedApp.document_metadata_json?.[doc.key];
                      const isAttached = Boolean(document?.path || selectedApp[doc.flag]);
                      return (
                        <div key={doc.key} className="flex justify-between items-center p-3 rounded-lg border bg-white hover:bg-gray-50 text-sm gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900">{doc.label}</p>
                            {document?.path ? (
                              <button type="button" onClick={() => handleDocumentPreview(doc.key, document)} disabled={previewingDocument === doc.key} className="text-left text-xs text-indigo-600 font-semibold underline mt-0.5 disabled:opacity-50">
                                {previewingDocument === doc.key ? 'Creating secure preview…' : `Preview ${document.fileName || 'uploaded document'}`}
                              </button>
                            ) : isAttached ? (
                              <p className="text-xs text-amber-700 font-semibold mt-0.5">Marked uploaded; no storage object is recorded.</p>
                            ) : (
                              <p className="text-xs text-red-500 font-semibold mt-0.5">Not uploaded</p>
                            )}
                          </div>
                          <Badge className={isAttached ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}>
                            {isAttached ? "Uploaded" : "Missing"}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedApp.drive_archive_url && (
                  <div className="bg-emerald-50 p-4 border border-emerald-200 rounded-xl">
                    <h5 className="font-bold text-xs text-emerald-900 uppercase tracking-widest mb-1">Google Drive Archive Ready</h5>
                    <a href={selectedApp.drive_archive_url} target="_blank" rel="noreferrer" className="text-sm text-emerald-800 font-semibold underline">Open approved-student ZIP archive</a>
                  </div>
                )}

                {selectedApp.rejection_reason && (
                  <div className="bg-red-50 p-4 border border-red-200 rounded-xl">
                    <h5 className="font-bold text-xs text-red-800 uppercase tracking-widest mb-1">Previous Rejection Reason</h5>
                    <p className="text-sm text-red-700">{selectedApp.rejection_reason}</p>
                  </div>
                )}

                {/* Reject Form */}
                {showRejectForm && (
                  <form onSubmit={handleReject} className="space-y-3 p-4 bg-rose-50/50 border border-rose-200 rounded-xl">
                    <Label htmlFor="reject_r" className="text-sm font-bold text-rose-900">Reason for Rejection *</Label>
                    <Input
                      id="reject_r"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="e.g. Missing parent signature on guarantor file"
                      required
                      className="bg-white"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button type="button" size="sm" variant="outline" onClick={() => setShowRejectForm(false)}>Cancel</Button>
                      <Button type="submit" size="sm" className="bg-rose-600 hover:bg-rose-700 text-white" disabled={actioning}>
                        Confirm Rejection
                      </Button>
                    </div>
                  </form>
                )}

                {/* Action Buttons */}
                {!showRejectForm && selectedApp.status !== "assigned" && (
                  <div className="flex gap-3 pt-3 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-rose-200 text-rose-700 hover:bg-rose-50"
                      onClick={() => setShowRejectForm(true)}
                    >
                      Reject Application
                    </Button>
                    <Button
                      type="button"
                      onClick={handleApprove}
                      disabled={actioning || selectedApp.status === "approved"}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    >
                      {selectedApp.status === "approved" ? "Already Approved" : "Approve Candidate"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
