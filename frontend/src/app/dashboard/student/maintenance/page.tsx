// @ts-nocheck
"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { maintenanceAPI, roomsAPI } from "@/lib/api";
import { uploadFile } from "@/lib/api";

function StudentMaintenanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qrCode = searchParams?.get("qr") || "";

  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [prefillRoom, setPrefillRoom] = useState<any>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    category: "plumbing",
    title: "",
    description: "",
    urgency: "medium",
    photo_url: "",
  });
  const [photoPreview, setPhotoPreview] = useState("");

  useEffect(() => {
    const ud = localStorage.getItem("user");
    if (!ud) { router.push("/login"); return; }
    const u = JSON.parse(ud);
    if (u.role !== "student") { router.push("/login"); return; }

    // If QR param present, fetch room info for context display
    const init = async () => {
      if (qrCode) {
        const roomRes = await roomsAPI.getByQrCode(qrCode);
        if (roomRes.success && roomRes.data) setPrefillRoom(roomRes.data);
      }
      await fetchHistory();
    };
    init();
  }, [qrCode, router]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await maintenanceAPI.getMy();
      if (res.success && res.data) setHistory(res.data);
      else setError(res.error?.message || "Failed to load maintenance logs");
    } catch { setError("Error loading tickets"); }
    finally { setLoading(false); }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    setUploadingPhoto(true);
    const result = await uploadFile(file, "maintenance");
    setUploadingPhoto(false);
    if (result.success && result.url) {
      setForm(f => ({ ...f, photo_url: result.url! }));
    } else {
      setForm(f => ({ ...f, photo_url: `local:${file.name}` }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await maintenanceAPI.create(form);
      if (res.success) {
        setSuccess("Maintenance ticket submitted! Dispatched to administrator queue.");
        setForm({ category: "plumbing", title: "", description: "", urgency: "medium", photo_url: "" });
        setPhotoPreview("");
        await fetchHistory();
      } else {
        setError(res.error?.message || "Failed to submit. Make sure you have an active room assignment.");
      }
    } catch { setError("Error submitting ticket"); }
    finally { setSaving(false); }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      open: "bg-blue-100 text-blue-800", in_progress: "bg-amber-100 text-amber-800",
      resolved: "bg-emerald-100 text-emerald-800", cancelled: "bg-gray-100 text-gray-700",
    };
    return <Badge className={`${map[s] || "bg-gray-100"} border-none font-semibold capitalize`}>{s.replace("_", " ")}</Badge>;
  };

  const urgencyBadge = (u: string) => {
    const map: Record<string, string> = {
      low: "border-gray-200 text-gray-400", medium: "border-blue-200 text-blue-500",
      high: "border-orange-200 text-orange-600 font-bold", emergency: "border-red-300 text-red-600 font-extrabold animate-pulse",
    };
    return <Badge variant="outline" className={`${map[u] || ""} capitalize text-[10px]`}>{u}</Badge>;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading maintenance portal...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => router.push("/dashboard/student")}>← Dashboard</Button>
            <div>
              <h1 className="font-bold text-xl text-purple-950">Maintenance & Repairs</h1>
              <p className="text-sm text-gray-600">File a room complaint or track outstanding repair dispatches</p>
            </div>
          </div>
          <Badge className="bg-purple-600">Student</Badge>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {error && <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">⚠️ {error}</div>}
        {success && <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl">✓ {success}</div>}

        {/* QR prefill banner */}
        {prefillRoom && (
          <div className="mb-6 p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center gap-3 text-sm">
            <span className="text-xl">📷</span>
            <div>
              <p className="font-bold text-teal-900">Scanned from Room {prefillRoom.room_number}</p>
              <p className="text-teal-700 text-xs">{prefillRoom.building?.name} · Floor {prefillRoom.floor_number} — this request will be linked to this room automatically.</p>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          {/* Submit form */}
          <div className="md:col-span-1">
            <Card className="bg-white sticky top-24 shadow-sm border">
              <CardHeader className="bg-purple-600 text-white rounded-t-xl">
                <CardTitle className="text-base font-black">Report Room Issue</CardTitle>
                <CardDescription className="text-purple-100">Dispatches automatically to managers</CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>Issue Category</Label>
                    <Select value={form.category} onValueChange={v => setForm({...form, category: v || "plumbing"})}>
                      <SelectTrigger className="mt-1 bg-gray-50/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="plumbing">Plumbing / Faucet</SelectItem>
                        <SelectItem value="electricity">Electrical / Lighting</SelectItem>
                        <SelectItem value="furniture">Furniture / Bed frame</SelectItem>
                        <SelectItem value="door_lock">Door Lock / Windows</SelectItem>
                        <SelectItem value="internet">Internet / WiFi</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Urgency Level</Label>
                    <Select value={form.urgency} onValueChange={v => setForm({...form, urgency: v || "medium"})}>
                      <SelectTrigger className="mt-1 bg-gray-50/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low — Cosmetic / minor</SelectItem>
                        <SelectItem value="medium">Medium — Needs attention</SelectItem>
                        <SelectItem value="high">High — Disrupting daily life</SelectItem>
                        <SelectItem value="emergency">Emergency — Water/electric hazard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Brief Title *</Label>
                    <Input className="mt-1 bg-gray-50/50 text-sm" placeholder="e.g. Bathroom sink leaking"
                      value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
                  </div>

                  <div>
                    <Label>Full Description *</Label>
                    <textarea className="mt-1 w-full p-2 text-sm border rounded-md bg-gray-50/50 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Describe where and how the problem occurs..."
                      value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />
                  </div>

                  {/* Photo upload */}
                  <div>
                    <Label>Photo of Issue</Label>
                    <div className="mt-1">
                      {photoPreview && (
                        <div className="mb-2 relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photoPreview} alt="Issue photo" className="w-full h-28 object-cover rounded-lg border" />
                          <button type="button" onClick={() => { setPhotoPreview(""); setForm(f => ({...f, photo_url: ""})); }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">✕</button>
                        </div>
                      )}
                      <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                      <Button type="button" variant="outline" size="sm" className="w-full text-xs border-dashed"
                        onClick={() => photoRef.current?.click()} disabled={uploadingPhoto}>
                        {uploadingPhoto ? 'Uploading...' : photoPreview ? '📷 Replace Photo' : '📷 Attach Photo'}
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold" disabled={saving}>
                    {saving ? "Submitting..." : "🔧 File Repair Request"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* History feed */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="font-extrabold text-gray-800 text-sm uppercase tracking-widest">My Tickets</h3>
            {history.map(t => (
              <div key={t.id} className="bg-white p-5 rounded-2xl border hover:border-purple-200 transition-all shadow-sm">
                <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-black text-gray-900">{t.title}</h4>
                      <Badge className="bg-purple-50 text-purple-700 border-none text-[10px] uppercase font-bold">{t.category}</Badge>
                    </div>
                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5 uppercase">
                      Filed: {new Date(t.created_at).toLocaleDateString()} · Room {t.room?.room_number || "My Room"}
                    </p>
                  </div>
                  <div className="flex gap-2">{urgencyBadge(t.urgency)}{statusBadge(t.status)}</div>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed mb-3">{t.description}</p>
                {t.photo_url && !t.photo_url.startsWith('local:') && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.photo_url} alt="Issue" className="w-full max-h-36 object-cover rounded-lg border mb-3" />
                )}
                {t.resolution_notes && (
                  <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-xs">
                    <span className="font-bold text-emerald-800 uppercase block mb-0.5">Resolution Notes</span>
                    <p className="text-gray-700">{t.resolution_notes}</p>
                  </div>
                )}
              </div>
            ))}
            {history.length === 0 && (
              <div className="py-20 text-center bg-white border border-dashed rounded-2xl">
                <div className="text-5xl mb-3">🛠️</div>
                <h4 className="font-bold text-gray-700 mb-1">No Tickets Logged Yet</h4>
                <p className="text-gray-500 text-sm">Use the form on the left to report a problem in your room.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StudentMaintenancePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <StudentMaintenanceContent />
    </Suspense>
  );
}
