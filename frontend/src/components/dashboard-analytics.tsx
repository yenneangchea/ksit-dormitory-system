type Analytics = {
  applications: Record<string, number>;
  occupancy: { occupied: number; capacity: number };
  attendance: Record<string, number>;
  billing: Record<string, number> & { total_khr: number };
};

function value(data: Record<string, number>, ...keys: string[]) {
  return keys.reduce((sum, key) => sum + Number(data[key] || 0), 0);
}

export function DashboardAnalytics({ data }: { data: Analytics }) {
  const approved = value(data.applications, 'approved', 'assigned');
  const rejected = value(data.applications, 'rejected');
  const pending = value(data.applications, 'submitted', 'under_review');
  const applicationTotal = Math.max(approved + rejected + pending, 1);
  const occupancyPercent = data.occupancy.capacity ? Math.round((data.occupancy.occupied / data.occupancy.capacity) * 100) : 0;
  const present = value(data.attendance, 'present');
  const absent = value(data.attendance, 'absent');
  const leave = value(data.attendance, 'leave');
  const attendanceTotal = Math.max(present + absent + leave, 1);
  const paid = value(data.billing, 'paid');
  const unpaid = value(data.billing, 'unpaid', 'pending', 'overdue');
  const billTotal = Math.max(paid + unpaid, 1);
  const riel = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(data.billing.total_khr || 0));

  return <section className="mt-8 grid gap-5 xl:grid-cols-4" aria-label="Operational analytics">
    <article className="ksit-card p-5"><div className="flex items-center justify-between"><div><p className="text-sm font-bold">Applications status</p><p className="mt-1 text-xs text-[#68736c]">Approved, pending, rejected</p></div><div className="size-16 rounded-full" style={{ background: `conic-gradient(#0b6937 0 ${(approved / applicationTotal) * 100}%, #e4a11b ${(approved / applicationTotal) * 100}% ${((approved + pending) / applicationTotal) * 100}%, #d55d4c ${((approved + pending) / applicationTotal) * 100}% 100%)` }} /></div><div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs"><span><b className="block text-[#0b6937]">{approved}</b>Approved</span><span><b className="block text-[#a66b10]">{pending}</b>Pending</span><span><b className="block text-[#b83e31]">{rejected}</b>Rejected</span></div></article>
    <article className="ksit-card p-5"><p className="text-sm font-bold">Bed occupancy</p><p className="mt-1 text-xs text-[#68736c]">Occupied beds versus capacity</p><div className="mt-8 flex items-end gap-4"><div className="flex h-20 flex-1 items-end rounded-t-xl bg-[#edf4ee]"><div className="w-full rounded-t-xl bg-[#0b6937]" style={{ height: `${occupancyPercent}%` }} /></div><div><p className="text-3xl font-extrabold">{occupancyPercent}%</p><p className="mt-1 text-xs text-[#68736c]">{data.occupancy.occupied} / {data.occupancy.capacity} beds</p></div></div></article>
    <article className="ksit-card p-5"><p className="text-sm font-bold">Daily attendance</p><p className="mt-1 text-xs text-[#68736c]">Current attendance status mix</p><div className="mt-7 flex h-24 items-end gap-3"><Bar label="Present" count={present} total={attendanceTotal} tone="bg-[#0b6937]" /><Bar label="Absent" count={absent} total={attendanceTotal} tone="bg-[#e4a11b]" /><Bar label="Leave" count={leave} total={attendanceTotal} tone="bg-[#5b87bc]" /></div></article>
    <article className="ksit-card p-5"><p className="text-sm font-bold">Utilities split-billing</p><p className="mt-1 text-xs text-[#68736c]">Paid and outstanding student bills</p><p className="mt-5 text-2xl font-extrabold text-[#0b5c2c]">៛ {riel}</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-[#edf0ed]"><div className="h-full bg-[#0b6937]" style={{ width: `${(paid / billTotal) * 100}%` }} /></div><div className="mt-3 flex justify-between text-xs"><span className="text-[#1a6a37]">{paid} paid</span><span className="text-[#806525]">{unpaid} unpaid</span></div></article>
  </section>;
}

function Bar({ label, count, total, tone }: { label: string; count: number; total: number; tone: string }) {
  return <div className="flex flex-1 flex-col items-center gap-2"><div className="flex h-16 w-full items-end rounded-t-md bg-[#f0f3f0]"><div className={`w-full rounded-t-md ${tone}`} style={{ height: `${Math.max((count / total) * 100, count ? 10 : 2)}%` }} /></div><span className="text-[10px] text-[#68736c]">{label} · {count}</span></div>;
}
