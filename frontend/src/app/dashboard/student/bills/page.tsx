"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import { utilityBillsAPI } from "@/lib/api";
import type { User } from "@/types";

export default function StudentBillsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // KHQR payment detail modal
  const [payingBill, setPayingBill] = useState<any | null>(null);
  const [simulatingPay, setSimulatingPay] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/login");
      return;
    }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== "student") {
      router.push("/login");
      return;
    }
    setCurrentUser(parsedUser);
    fetchBills();
  }, [router]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await utilityBillsAPI.getMyBills();
      if (res.success && res.data) {
        setBills(res.data);
      } else {
        setError(res.error?.message || "Failed to load your bills");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred loading bills");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePayment = async () => {
    if (!payingBill) return;
    setSimulatingPay(true);
    setError("");
    setSuccess("");
    try {
      const generatedRef = `ABA-${Math.floor(100000 + Math.random() * 900000)}`;
      const res = await utilityBillsAPI.markPaid(payingBill.id, {
        payment_method: "bakong_qr",
        transaction_ref: generatedRef,
      });

      if (res.success) {
        setSuccess(`Payment simulated successfully! Transaction Ref: ${generatedRef}`);
        setPayingBill(null);
        await fetchBills();
      } else {
        setError(res.error?.message || "Failed to save simulated payment");
      }
    } catch (err) {
      console.error(err);
      setError("Error settling invoice");
    } finally {
      setSimulatingPay(false);
    }
  };

  // Calculate totals
  const unpaidBills = bills.filter(b => b.bill_status !== "paid");
  const totalArrearsKhr = unpaidBills.reduce((acc, b) => acc + Number(b.amount_khr), 0);
  const totalArrearsUsd = unpaidBills.reduce((acc, b) => acc + Number(b.amount_usd), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bills...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => router.push("/dashboard/student")}>
              ← Dashboard
            </Button>
            <div>
              <h1 className="font-bold text-xl text-amber-950">Utility Bills & KHQR</h1>
              <p className="text-sm text-gray-600">Scan real-time KHQR code to pay monthly dormitory dues</p>
            </div>
          </div>
          <Badge className="bg-amber-600">Student Role</Badge>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {error && <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">⚠️ {error}</div>}
        {success && <div className="mb-6 p-4 bg-emerald-50 border border-emerald-250 text-emerald-805 rounded-xl">✨ {success}</div>}

        {/* Arrears Summary Card */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="md:col-span-2 bg-gradient-to-br from-amber-500 to-orange-600 text-white border-none shadow-md shadow-amber-100">
            <CardContent className="p-6 flex flex-col justify-between h-minus">
              <div>
                <span className="text-xs uppercase tracking-widest font-black text-amber-100">Outstanding Balance Due</span>
                <h2 className="text-3xl font-black mt-2">{totalArrearsKhr.toLocaleString()} KHR</h2>
                <p className="text-sm text-amber-100 mt-1">~${totalArrearsUsd.toFixed(2)} USD combined billing</p>
              </div>
              <p className="text-xs font-semibold text-amber-105 mt-6">Please pay before the 10th of every calendar month to avoid late fee penalties.</p>
            </CardContent>
          </Card>

          <Card className="bg-white border shadow-sm">
            <CardContent className="p-6 flex flex-col justify-center h-full">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Invoices Audited</span>
              <span className="text-3xl font-black text-gray-900">{bills.length}</span>
              <p className="text-xs text-gray-500 font-semibold mt-1">
                {unpaidBills.length} pending settlement
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Bills list */}
        <h3 className="font-extrabold text-gray-800 text-sm uppercase tracking-widest mb-4">My Invoices Ledger</h3>
        <div className="space-y-4">
          {bills.map((bill) => (
            <div
              key={bill.id}
              className="bg-white p-5 rounded-2xl border hover:border-amber-200 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-sm"
            >
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h4 className="text-base font-black text-gray-900">Room {bill.room?.room_number || "My Room"} Billing</h4>
                  <Badge className="bg-amber-50 text-amber-800 text-[10px] uppercase font-bold tracking-widest border-none">
                    {bill.billing_month}
                  </Badge>
                  <Badge className={
                    bill.bill_status === 'paid' ? "bg-emerald-100 text-emerald-805" : "bg-rose-100 text-rose-800"
                  }>
                    {bill.bill_status === 'paid' ? "Paid" : "Unpaid"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-indigo-900/60 font-semibold pt-3">
                  <p>KHR Invoice: {bill.amount_khr.toLocaleString()} KHR</p>
                  <p>USD Equiv: ${bill.amount_usd}</p>
                  {bill.paid_at && (
                    <p className="col-span-2 text-emerald-600 font-bold">
                      Settled on: {new Date(bill.paid_at).toLocaleDateString()} via {bill.payment_method}
                    </p>
                  )}
                </div>
              </div>

              {bill.bill_status !== "paid" && (
                <Button className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-5" onClick={() => setPayingBill(bill)}>
                  ⚡ Pay via KHQR
                </Button>
              )}
            </div>
          ))}

          {bills.length === 0 && (
            <div className="py-20 text-center bg-white border border-dashed border-gray-250 rounded-2xl">
              <div className="text-5xl mb-3">🧾</div>
              <h4 className="font-bold text-gray-800 mb-1">No Bills Found</h4>
              <p className="text-gray-500 text-sm">No billing reports generated for your room assignment yet.</p>
            </div>
          )}
        </div>

        {/* Modal: KHQR payment panel */}
        {payingBill && currentUser && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-sm shadow-2xl bg-white rounded-2xl overflow-hidden">
              <div className="bg-indigo-950 p-4 text-white flex justify-between items-center border-b">
                <span className="font-bold text-sm tracking-widest">PAYMENT PORTAL</span>
                <button onClick={() => setPayingBill(null)} className="text-white hover:text-gray-200">
                  ✕
                </button>
              </div>

              <CardContent className="p-6 space-y-6 flex flex-col items-center">
                  {/* Real KHQR-formatted QR code */}
                  <div className="w-full bg-[#E12A34] text-white rounded-xl p-4 shadow-lg border border-red-500/20 max-w-[280px]">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-black text-sm italic tracking-widest text-white">KHQR</span>
                      <span className="text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded text-white flex items-center gap-1">
                        🔴 BAKONG
                      </span>
                    </div>

                    {/* QR Code Box */}
                    <div className="bg-white p-3 rounded-lg flex items-center justify-center shadow-inner">
                      <QRCodeSVG
                        value={payingBill.khqr_string || `KSIT-PAY-${payingBill.id}`}
                        size={148}
                        level="M"
                        includeMargin={false}
                        imageSettings={{
                          src: "",
                          height: 0,
                          width: 0,
                          excavate: false,
                        }}
                      />
                    </div>

                    <div className="text-center mt-3.5 space-y-0.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-red-100">KSIT DORMITORY PAYMENT</p>
                      <p className="font-extrabold text-sm">{Number(payingBill.amount_khr).toLocaleString()} KHR</p>
                      <p className="text-[9px] text-red-200">≈ ${payingBill.amount_usd} USD · {payingBill.billing_month}</p>
                    </div>
                  </div>

                <div className="w-full text-center space-y-1.5 text-xs text-gray-500 font-medium">
                  <p>Scan above to settle invoice with Bakong, ABA, Wing, or Acleda directly.</p>
                  <p className="font-extrabold text-[10px] text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider inline-block">
                    Ref: {payingBill.khqr_string}
                  </p>
                </div>

                <div className="w-full space-y-2 pt-3 border-t">
                  {/* Telegram share button (opens Telegram with bill info pre-filled) */}
                  {currentUser?.telegram_id && (
                    <Button variant="outline" className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 font-bold text-xs"
                      onClick={() => {
                        const msg = encodeURIComponent(
                          `📋 KSIT Dormitory Bill\nRoom: ${payingBill.room?.room_number}\nMonth: ${payingBill.billing_month}\nAmount: ${Number(payingBill.amount_khr).toLocaleString()} KHR (~$${payingBill.amount_usd})\nRef: ${payingBill.khqr_string}\n\nPlease pay via KHQR above.`
                        );
                        window.open(`https://t.me/${currentUser.telegram_id}?text=${msg}`, '_blank');
                      }}>
                      📱 Send to My Telegram
                    </Button>
                  )}
                  <Button
                    onClick={handleSimulatePayment}
                    className="w-full bg-[#E12A34] hover:bg-[#c9222c] text-white font-bold"
                    disabled={simulatingPay}
                  >
                    {simulatingPay ? "Processing Settle..." : "Simulate Settle Payment ✓"}
                  </Button>
                  <Button variant="outline" className="w-full text-gray-500" onClick={() => setPayingBill(null)}>
                    Cancel
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
