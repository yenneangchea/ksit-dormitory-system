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
import { buildingsAPI, roomsAPI, utilityBillsAPI } from "@/lib/api";
import type { User } from "@/types";

export default function UtilityBillsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [selectedBldgId, setSelectedBldgId] = useState("");
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [bills, setBills] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Statistics
  const [stats, setStats] = useState({ total: 0, paid: 0, unpaid: 0, outstandingKhr: 0 });

  // Bill creation form
  const [form, setForm] = useState({
    billing_month: "2025-08",
    prev_electric_reading: 0,
    curr_electric_reading: 0,
    prev_water_reading: 0,
    curr_water_reading: 0,
    electric_rate_khr: 800,
    water_rate_khr: 1500,
    trash_fee_khr: 10000,
  });

  // Selected Bill Detail for payment check
  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  const [paymentForm, setPaymentForm] = useState({ payment_method: "cash", transaction_ref: "" });
  const [markingPaid, setMarkingPaid] = useState(false);

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
    fetchInitialData();
  }, [router]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError("");

      const [bldgRes, billRes, statsRes] = await Promise.all([
        buildingsAPI.getAll(),
        utilityBillsAPI.getAll(),
        utilityBillsAPI.getStats(),
      ]);

      if (bldgRes.success && bldgRes.data) {
        setBuildings(bldgRes.data);
      }
      if (billRes.success && billRes.data) {
        setBills(billRes.data);
      }
      if (statsRes.success && statsRes.data) {
        setStats({
          total: statsRes.data.total || 0,
          paid: statsRes.data.paid || 0,
          unpaid: statsRes.data.unpaid || 0,
          outstandingKhr: statsRes.data.total_unpaid_khr || 0,
        });
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred fetching dashboard billing data");
    } finally {
      setLoading(false);
    }
  };

  // When building changes, fetch rooms
  const handleBuildingChange = async (bldgId: string) => {
    setSelectedBldgId(bldgId);
    setSelectedRoomId("");
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

  // When room changes, check for previous readings
  const handleRoomChange = (roomId: string) => {
    setSelectedRoomId(roomId);

    // Find last bill for this room to populate previous readings
    const roomBills = bills.filter(b => b.room_id === roomId);
    if (roomBills.length > 0) {
      // Sort to get latest
      const latest = roomBills[0];
      setForm(prev => ({
        ...prev,
        prev_electric_reading: latest.curr_electric_reading,
        curr_electric_reading: latest.curr_electric_reading,
        prev_water_reading: latest.curr_water_reading,
        curr_water_reading: latest.curr_water_reading,
      }));
    } else {
      setForm(prev => ({
        ...prev,
        prev_electric_reading: 0,
        curr_electric_reading: 0,
        prev_water_reading: 0,
        curr_water_reading: 0,
      }));
    }
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId) {
      setError("Please select a dormitory room.");
      return;
    }
    setError("");
    setSuccess("");
    try {
      const res = await utilityBillsAPI.create({
        room_id: selectedRoomId,
        ...form,
      });

      if (res.success) {
        setSuccess(`Utility bill and individual student splits created successfully!`);
        setSelectedRoomId("");
        setSelectedBldgId("");
        // Reload all bills
        await fetchInitialData();
      } else {
        setError(res.error?.message || "Failed to create utility bill");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred creating utility bill");
    }
  };

  const handleOpenBillDetail = async (billId: string) => {
    try {
      const res = await utilityBillsAPI.getById(billId);
      if (res.success && res.data) {
        setSelectedBill(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkStudentPaid = async (studentBillId: string) => {
    setMarkingPaid(true);
    setError("");
    setSuccess("");
    try {
      const res = await utilityBillsAPI.markPaid(studentBillId, paymentForm);
      if (res.success) {
        setSuccess("Student bill marked as paid successfully.");
        // Refresh details modal
        if (selectedBill) {
          await handleOpenBillDetail(selectedBill.id);
        }
        await fetchInitialData();
      } else {
        setError(res.error?.message || "Failed to approve payment");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMarkingPaid(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading utility billing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => router.push(currentUser?.role === "admin" ? "/dashboard/admin" : "/dashboard/manager")}>
              ← Back
            </Button>
            <div>
              <h1 className="font-bold text-xl text-amber-950">Utility Billing & Splits</h1>
              <p className="text-sm text-gray-600">Enter monthly readings, audit splits, and verify student payments</p>
            </div>
          </div>
          <Badge className="bg-amber-600 capitalize">{currentUser?.role}</Badge>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {error && <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">⚠️ {error}</div>}
        {success && <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl">✨ {success}</div>}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Active Student Bills", value: stats.total, color: "text-amber-600" },
            { label: "Cleared Payments", value: stats.paid, color: "text-emerald-600" },
            { label: "Pending Collection", value: stats.unpaid, color: "text-rose-600" },
            { label: "Outstanding (KHR)", value: stats.outstandingKhr.toLocaleString(), color: "text-red-700" },
          ].map((st, i) => (
            <Card key={i} className="bg-white/95 shadow-sm border border-gray-150">
              <CardContent className="pt-4 pb-4">
                <span className="text-xs text-gray-500 font-bold block mb-1 uppercase tracking-wider">{st.label}</span>
                <span className={`text-2xl font-black ${st.color}`}>{st.value}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Create Utility Bill Form */}
          <div className="md:col-span-1">
            <Card className="bg-white sticky top-24 shadow-sm border">
              <CardHeader className="bg-amber-600 text-white rounded-t-xl">
                <CardTitle className="text-base font-black">Generate Monthly Bill</CardTitle>
                <CardDescription className="text-amber-100/90">Splits electricity/water usages evenly</CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <form onSubmit={handleCreateBill} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="month">Billing Month</Label>
                      <Input
                        id="month"
                        type="month"
                        value={form.billing_month}
                        onChange={(e) => setForm({...form, billing_month: e.target.value})}
                        required
                        className="text-sm bg-gray-50/50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bldg">Building</Label>
                      <Select value={selectedBldgId} onValueChange={(v) => v && handleBuildingChange(v)}>
                        <SelectTrigger id="bldg" className="bg-gray-50/50">
                          <SelectValue placeholder="Bldg Code" />
                        </SelectTrigger>
                        <SelectContent>
                          {buildings.map(b => (
                            <SelectItem key={b.id} value={b.id}>{b.code}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="room">Dormitory Room *</Label>
                    <Select value={selectedRoomId} onValueChange={(v) => v && handleRoomChange(v)} disabled={!selectedBldgId || loadingRooms}>
                      <SelectTrigger id="room" className="bg-gray-50/50">
                        <SelectValue placeholder={loadingRooms ? "Loading rooms..." : "Select Room"} />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.map(r => (
                          <SelectItem key={r.id} value={r.id}>Room {r.room_number} (beds: {r.occupied_count}/{r.capacity})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <h4 className="font-bold text-xs uppercase tracking-widest text-amber-900 mb-2">Electricity meter (kWh)</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="prev_e">Previous Read</Label>
                        <Input
                          id="prev_e"
                          type="number"
                          value={form.prev_electric_reading}
                          onChange={(e) => setForm({...form, prev_electric_reading: Number(e.target.value)})}
                          required
                          className="bg-gray-50/50"
                        />
                      </div>
                      <div>
                        <Label htmlFor="curr_e">Current Read</Label>
                        <Input
                          id="curr_e"
                          type="number"
                          value={form.curr_electric_reading}
                          onChange={(e) => setForm({...form, curr_electric_reading: Number(e.target.value)})}
                          required
                          className="bg-gray-50/50"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <h4 className="font-bold text-xs uppercase tracking-widest text-amber-900 mb-2">Water meter (m³)</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="prev_w">Previous Read</Label>
                        <Input
                          id="prev_w"
                          type="number"
                          value={form.prev_water_reading}
                          onChange={(e) => setForm({...form, prev_water_reading: Number(e.target.value)})}
                          required
                          className="bg-gray-50/50"
                        />
                      </div>
                      <div>
                        <Label htmlFor="curr_w">Current Read</Label>
                        <Input
                          id="curr_w"
                          type="number"
                          value={form.curr_water_reading}
                          onChange={(e) => setForm({...form, curr_water_reading: Number(e.target.value)})}
                          required
                          className="bg-gray-50/50"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <Label htmlFor="trash">Trash Fee (Flat KHR)</Label>
                    <Input
                      id="trash"
                      type="number"
                      value={form.trash_fee_khr}
                      onChange={(e) => setForm({...form, trash_fee_khr: Number(e.target.value)})}
                      required
                      className="bg-gray-50/50"
                    />
                  </div>

                  <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold">
                    🧮 Compute Split & Save
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* List of Generated Bills */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="font-extrabold text-gray-800 text-sm uppercase tracking-widest">Billing Audit List</h3>

            <div className="space-y-4">
              {bills.map((bill) => (
                <div
                  key={bill.id}
                  className="bg-white p-5 rounded-2xl border hover:border-amber-200 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-sm"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-base font-black text-gray-900">Room {bill.room?.room_number || "Deleted"}</h4>
                      <Badge className="bg-amber-50 text-amber-750 uppercase tracking-widest text-[10px]">
                        {bill.billing_month}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 font-medium">{bill.room?.building?.name || "No Building Location"}</p>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-indigo-900/60 font-semibold pt-3.5">
                      <p>⚡ Electricity Usage: {bill.curr_electric_reading - bill.prev_electric_reading} kWh</p>
                      <p>💧 Water Usage: {bill.curr_water_reading - bill.prev_water_reading} m³</p>
                      <p>👥 Split: divided by {bill.active_students_count} students</p>
                      <p className="text-amber-805">💰 Per Student: {bill.split_amount_per_student_khr.toLocaleString()} KHR</p>
                    </div>
                  </div>

                  <Button size="sm" variant="outline" className="border-amber-200 text-amber-750 font-bold" onClick={() => handleOpenBillDetail(bill.id)}>
                    View Payments
                  </Button>
                </div>
              ))}

              {bills.length === 0 && (
                <div className="py-20 text-center bg-white border border-dashed border-gray-250 rounded-2xl">
                  <div className="text-5xl mb-3">💡</div>
                  <h4 className="font-bold text-gray-700 mb-1">No Utility Bills Generated</h4>
                  <p className="text-gray-500 text-sm">Select building & room on the left dashboard to create your first monthly report ledger.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal: Room Payments Detail */}
        {selectedBill && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl shadow-2xl bg-white max-h-[92vh] overflow-y-auto rounded-2xl">
              <CardHeader className="bg-amber-600 text-white rounded-t-2xl">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-black">Room {selectedBill.room?.room_number} Bills</CardTitle>
                    <p className="text-xs text-amber-100">Cycle Month: {selectedBill.billing_month}</p>
                  </div>
                  <Button variant="ghost" onClick={() => setSelectedBill(null)} className="h-8 w-8 p-0 text-white hover:bg-amber-700">
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-widest text-amber-900 mb-3">Room Split Summary</h4>
                  <div className="grid grid-cols-3 gap-2 px-4 py-3 bg-gray-50 border rounded-xl text-center text-sm font-semibold">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Electric</span>
                      <span className="text-gray-800">
                        {((selectedBill.curr_electric_reading - selectedBill.prev_electric_reading) * selectedBill.electric_rate_khr).toLocaleString()} KHR
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Water</span>
                      <span className="text-gray-800">
                        {((selectedBill.curr_water_reading - selectedBill.prev_water_reading) * selectedBill.water_rate_khr).toLocaleString()} KHR
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Trash</span>
                      <span className="text-gray-800">{selectedBill.trash_fee_khr.toLocaleString()} KHR</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-xs uppercase tracking-widest text-amber-900 mb-2.5">Student Bill Payments status</h4>
                  <div className="space-y-3">
                    {selectedBill.student_bills?.map((sb: any) => (
                      <div key={sb.id} className="p-4 rounded-xl border bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{sb.student?.full_name_latin} ({sb.student?.email})</p>
                          <p className="text-amber-805 font-bold text-xs mt-0.5">
                            {sb.amount_khr.toLocaleString()} KHR (~${sb.amount_usd})
                          </p>
                          {sb.khqr_string && (
                            <code className="text-[10px] text-gray-400 block mt-1">Ref: {sb.khqr_string}</code>
                          )}
                          {sb.bill_status === "paid" && (
                            <div className="text-xs text-emerald-600 font-semibold mt-1">
                              ✓ Paid via {sb.payment_method} on {new Date(sb.paid_at).toLocaleDateString()}
                              {sb.transaction_ref && ` (Ref: ${sb.transaction_ref})`}
                            </div>
                          )}
                        </div>

                        {sb.bill_status !== "paid" ? (
                          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <Select
                              value={paymentForm.payment_method}
                              onValueChange={(v) => v && setPaymentForm({ ...paymentForm, payment_method: v })}
                            >
                              <SelectTrigger className="w-full sm:w-32 bg-gray-50">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cash">Cash Pay</SelectItem>
                                <SelectItem value="bakong_qr">Bakong QR</SelectItem>
                                <SelectItem value="bank_transfer">ABA Direct</SelectItem>
                              </SelectContent>
                            </Select>

                            <Input
                              placeholder="Trx Ref (optional)"
                              value={paymentForm.transaction_ref}
                              onChange={(e) => setPaymentForm({ ...paymentForm, transaction_ref: e.target.value })}
                              className="w-full sm:w-32 placeholder:text-gray-400 bg-gray-50/50"
                            />

                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                              onClick={() => handleMarkStudentPaid(sb.id)}
                              disabled={markingPaid}
                            >
                              Mark Paid
                            </Button>
                          </div>
                        ) : (
                          <Badge className="bg-emerald-50 text-emerald-805 border-none font-bold">Settled</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
