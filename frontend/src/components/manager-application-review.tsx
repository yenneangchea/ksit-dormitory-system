'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eye, FileText, Loader2, Send, XCircle } from 'lucide-react';
import { applicationsAPI } from '@/lib/api';
import type { RoomApplication } from '@/types';

const filters = [
  ['all', 'ទាំងអស់'],
  ['under_review', 'កំពុងពិនិត្យ'],
  ['correction_needed', 'ត្រូវកែសម្រួល'],
  ['approved', 'អនុម័ត'],
  ['rejected', 'បដិសេធ'],
  ['assigned', 'បានចាត់បន្ទប់'],
] as const;

type DocumentType = 'student_photo' | 'national_id' | 'family_book' | 'prefilled_pdf' | 'signed_application';

function profileFor(application: RoomApplication) {
  const profile = application.academic_profiles || application.users?.academic_profiles;
  return Array.isArray(profile) ? profile[0] || null : profile || null;
}

export function ManagerApplicationReview() {
  const [applications, setApplications] = useState<RoomApplication[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number][0]>('all');
  const [selected, setSelected] = useState<RoomApplication | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const response = await applicationsAPI.managerList(filter === 'all' ? undefined : { status: filter });
    if (!response.success || !response.data) {
      setError(response.error?.message || 'Unable to load applications.');
      return;
    }
    setApplications(response.data);
    setError('');
  }, [filter]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const totals = useMemo(() => ({
    review: applications.filter((item) => item.status === 'under_review').length,
    approved: applications.filter((item) => ['approved', 'assigned'].includes(item.status)).length,
  }), [applications]);

  async function decide(action: 'approve' | 'request_correction' | 'reject') {
    if (!selected) return;
    setBusy(true);
    const response = await applicationsAPI.managerReview(selected.id, { action, manager_notes: note.trim() || undefined });
    setBusy(false);
    if (!response.success || !response.data) {
      setError(response.error?.message || 'Unable to record the manager decision.');
      return;
    }
    setSelected(response.data);
    setNote('');
    await load();
  }

  async function autoAssign() {
    if (!selected) return;
    setBusy(true);
    const response = await applicationsAPI.autoAssign(selected.id);
    setBusy(false);
    if (!response.success) {
      setError(response.error?.message || 'Unable to complete waterfall assignment.');
      return;
    }
    setSelected(null);
    await load();
  }

  return (
    <section className="space-y-5">
      <div className="ksit-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#287243]">Manager verification</p>
            <h2 className="mt-1 text-xl font-extrabold text-[#18231d]">ពិនិត្យពាក្យសុំ និងឯកសាររបស់និស្សិត</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#68736c]">ពិនិត្យព័ត៌មានទម្រង់ ៤ ផ្នែក ឯកសារយោង និងឯកសារដែលបានចុះហត្ថលេខា មុនអនុម័ត ឬស្នើសុំកែសម្រួល។</p>
          </div>
          <div className="flex gap-3"><Stat label="កំពុងពិនិត្យ" value={totals.review} /><Stat label="អនុម័ត" value={totals.approved} /></div>
        </div>
        <div className="scrollbar-none mt-5 flex gap-2 overflow-x-auto whitespace-nowrap border-t border-[#edf0ed] pt-4">
          {filters.map(([value, label]) => <button type="button" key={value} onClick={() => setFilter(value)} className={`min-h-10 shrink-0 rounded-lg px-3 text-xs font-bold ${filter === value ? 'bg-[#0b5c2c] text-white' : 'bg-[#f3f6f3] text-[#526058] hover:bg-[#e7efe8]'}`}>{label}</button>)}
        </div>
      </div>
      {error && <div className="rounded-xl border border-[#f2cfca] bg-[#fff4f2] px-4 py-3 text-sm text-[#a73627]">{error}</div>}
      <section className="ksit-card overflow-hidden">
        <div className="border-b border-[#edf0ed] p-5"><h3 className="font-bold">ពាក្យសុំប្រចាំឆ្នាំ</h3><p className="mt-1 text-sm text-[#68736c]">ជ្រើសពាក្យសុំមួយដើម្បីមើលទិន្នន័យ និងឯកសារពេញលេញ។</p></div>
        {applications.length === 0 ? <p className="px-6 py-8 text-sm text-[#68736c]">មិនមានពាក្យសុំក្នុងស្ថានភាពនេះទេ។</p> : <div className="overflow-x-auto"><table className="w-full min-w-[880px] text-left text-sm"><thead className="bg-[#fafcf9] text-xs uppercase tracking-[0.08em] text-[#748078]"><tr><th className="px-6 py-3">Student</th><th className="px-4 py-3">Year</th><th className="px-4 py-3">Progress</th><th className="px-4 py-3">Signed form</th><th className="px-4 py-3">Status</th><th className="px-6 py-3 text-right">Review</th></tr></thead><tbody>{applications.map((application) => {
          const profile = profileFor(application);
          const student = application.users;
          return <tr key={application.id} className="border-t border-[#edf0ed]"><td className="px-6 py-4"><p className="font-bold text-[#20342a]">{student?.full_name_khmer || student?.full_name_latin || 'Student'}</p><p className="mt-1 text-xs text-[#68736c]">{profile?.student_id_card || student?.email || 'Profile pending'} · {profile?.major || 'Major pending'}</p></td><td className="px-4 py-4 text-[#526058]">{application.academic_year_applied}</td><td className="px-4 py-4 text-[#526058]">{application.submission_step || 1} / 5</td><td className="px-4 py-4">{application.document_available?.signed_application ? <span className="inline-flex items-center gap-1 text-xs font-bold text-[#188a47]"><CheckCircle2 className="size-4" />Ready</span> : <span className="text-xs text-[#a27b24]">Pending</span>}</td><td className="px-4 py-4"><ReviewStatus status={application.status} /></td><td className="px-6 py-4 text-right"><button type="button" onClick={() => { setSelected(application); setNote(application.manager_notes || application.rejection_reason || ''); }} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[#0b5c2c] px-3 text-xs font-bold text-[#0b5c2c] hover:bg-[#eef8ef]"><Eye className="size-4" />Review</button></td></tr>;
        })}</tbody></table></div>}
      </section>
      {selected && <ReviewDrawer application={selected} note={note} setNote={setNote} busy={busy} onClose={() => setSelected(null)} onDecide={decide} onAutoAssign={autoAssign} />}
    </section>
  );
}

function ReviewDrawer({ application, note, setNote, busy, onClose, onDecide, onAutoAssign }: { application: RoomApplication; note: string; setNote: (value: string) => void; busy: boolean; onClose: () => void; onDecide: (action: 'approve' | 'request_correction' | 'reject') => Promise<void>; onAutoAssign: () => Promise<void> }) {
  const profile = profileFor(application);
  const student = application.users;
  const docs = application.document_available || {};
  const [documentError, setDocumentError] = useState('');
  const canReview = ['under_review', 'correction_needed'].includes(application.status);
  async function openDocument(type: DocumentType) {
    if (!docs[type]) return;
    try {
      await applicationsAPI.openDocument(application.id, type);
      setDocumentError('');
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : 'Unable to open the protected document.');
    }
  }
  const documentItems: [DocumentType, string][] = [['student_photo', 'រូបថត ៤ × ៦'], ['national_id', 'អត្តសញ្ញាណប័ណ្ណ'], ['family_book', 'សៀវភៅគ្រួសារ'], ['prefilled_pdf', 'PDF ពាក្យសុំដើម'], ['signed_application', 'ឯកសារចុះហត្ថលេខា និងផ្ដិតមេដៃ']];
  return <div className="fixed inset-0 z-50 flex justify-end bg-[#18231d]/35"><aside role="dialog" aria-modal="true" aria-label="Application review" className="h-full w-full max-w-3xl overflow-y-auto bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#edf0ed] bg-white p-5"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#287243]">Application review</p><h2 className="mt-1 text-xl font-extrabold text-[#18231d]">{student?.full_name_khmer || student?.full_name_latin || 'Student'}</h2><p className="mt-1 text-sm text-[#68736c]">ឆ្នាំសិក្សា {application.academic_year_applied} · {profile?.major || '—'}</p></div><button type="button" onClick={onClose} className="min-h-10 rounded-lg px-3 text-sm font-bold text-[#526058] hover:bg-[#f3f6f3]">បិទ</button></div><div className="space-y-6 p-5"><div className="flex flex-wrap items-center gap-3"><ReviewStatus status={application.status} /><span className="text-xs text-[#68736c]">បានបញ្ជូន {new Date(application.applied_at).toLocaleDateString()}</span></div><InfoSection title="ព័ត៌មានសិស្ស/និស្សិត" items={[["ឈ្មោះខ្មែរ", student?.full_name_khmer], ['Latin name', student?.full_name_latin], ['ភេទ', student?.gender], ['ថ្ងៃកំណើត', profile?.date_of_birth], ['លេខសម្គាល់', profile?.student_id_card], ['ជំនាញ / ឆ្នាំទី', `${profile?.major || '—'} / ${profile?.academic_year || '—'}`], ['ទីលំនៅ', profile?.current_address], ['ទូរស័ព្ទ', student?.phone]]} /><InfoSection title="ព័ត៌មានគ្រួសារ" items={[["ឪពុក", `${profile?.father_name || '—'} · ${profile?.father_occupation || '—'} · ${profile?.father_phone || '—'}`], ['ម្តាយ', `${profile?.mother_name || '—'} · ${profile?.mother_occupation || '—'} · ${profile?.mother_phone || '—'}`], ['អ្នកធានា', `${profile?.guarantor_name || '—'} · ${profile?.guarantor_relation || '—'} · ${profile?.guarantor_phone || '—'}`], ['ទីលំនៅអ្នកធានា', profile?.guarantor_address]]} /><StructuredRows title="បងប្អូនបង្កើត" rows={profile?.siblings_json || []} /><StructuredRows title="ប្រវត្តិការសិក្សា" rows={profile?.education_history_json || []} /><StructuredRows title="ទំនាក់ទំនងបន្ទាន់" rows={profile?.emergency_contacts_json || []} /><section><h3 className="font-extrabold text-[#20342a]">ឯកសារ និងភស្តុតាង</h3>{documentError && <p className="mt-2 text-sm text-[#a73627]">{documentError}</p>}<div className="mt-3 grid gap-3 sm:grid-cols-2">{documentItems.map(([type, label]) => { const available = Boolean(docs[type]); return <button type="button" key={type} onClick={() => void openDocument(type)} disabled={!available} className={`flex min-h-16 items-center gap-3 rounded-xl border p-3 text-left text-sm font-bold ${available ? 'border-[#cfe0d1] bg-[#f7fbf7] text-[#0b5c2c] hover:bg-[#eef8ef]' : 'cursor-not-allowed border-[#e6e9e6] bg-[#fafbfa] text-[#9aa39d]'}`}><FileText className="size-5" />{label}<span className="ml-auto text-xs">{available ? 'Open' : 'Missing'}</span></button>; })}</div></section>{(application as RoomApplication & { drive_archive_url?: string }).drive_archive_url && <section className="rounded-2xl border border-[#cfe0d1] bg-[#f7fbf7] p-4"><h3 className="font-extrabold text-[#20342a]">Google Drive archive</h3><p className="mt-1 text-sm text-[#68736c]">The approved student documents have been compressed into a ZIP archive.</p><a href={(application as RoomApplication & { drive_archive_url?: string }).drive_archive_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-[#0b5c2c] px-3 text-sm font-bold text-white">Open approved-student ZIP</a></section>}{application.manager_notes && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Manager note:</strong><br />{application.manager_notes}</div>}{canReview && <section className="rounded-2xl border border-[#d9e8db] bg-[#f7fbf7] p-4"><h3 className="font-extrabold text-[#20342a]">សម្រេចចិត្ត</h3><p className="mt-1 text-sm text-[#68736c]">សម្រាប់ការស្នើសុំកែសម្រួល ឬបដិសេធ សូមសរសេរកំណត់ចំណាំច្បាស់លាស់សម្រាប់និស្សិត។</p><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="ឧទាហរណ៍៖ សូមផ្ដិតមេដៃលើទំព័រទី ៣ ឡើងវិញ" className="mt-3 min-h-24 w-full rounded-xl border border-[#dce3dc] bg-white p-3 text-sm outline-none focus:border-[#5f9b6f]" /><div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={busy || !docs.signed_application} onClick={() => void onDecide('approve')} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#0b5c2c] px-4 text-sm font-bold text-white disabled:opacity-50">{busy && <Loader2 className="size-4 animate-spin" />}អនុម័ត</button><button type="button" disabled={busy} onClick={() => void onDecide('request_correction')} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-amber-500 px-4 text-sm font-bold text-amber-900 disabled:opacity-50"><Send className="size-4" />ស្នើសុំកែសម្រួល</button><button type="button" disabled={busy} onClick={() => void onDecide('reject')} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#dc8f83] px-4 text-sm font-bold text-[#a73627] disabled:opacity-50"><XCircle className="size-4" />បដិសេធ</button></div></section>}{application.status === 'approved' && <section className="rounded-2xl border border-[#cfe0d1] bg-[#f7fbf7] p-4"><h3 className="font-extrabold text-[#20342a]">ចាត់បន្ទប់</h3><p className="mt-1 text-sm text-[#68736c]">ប្រើ waterfall rules សម្រាប់ភេទ ជំនាញ ឆ្នាំសិក្សា និងសមត្ថភាពបន្ទប់។</p><button type="button" disabled={busy} onClick={() => void onAutoAssign()} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#0b5c2c] px-4 text-sm font-bold text-white disabled:opacity-50">{busy && <Loader2 className="size-4 animate-spin" />}Auto-assign room</button></section>}</div></aside></div>;
}

function InfoSection({ title, items }: { title: string; items: [string, string | undefined][] }) { return <section><h3 className="font-extrabold text-[#20342a]">{title}</h3><dl className="mt-3 grid gap-3 rounded-xl border border-[#e1e7e1] p-4 sm:grid-cols-2">{items.map(([label, value]) => <div key={label}><dt className="text-xs font-bold text-[#748078]">{label}</dt><dd className="mt-1 text-sm leading-5 text-[#39473f]">{value || '—'}</dd></div>)}</dl></section>; }
function StructuredRows({ title, rows }: { title: string; rows: object[] }) { return <section><h3 className="font-extrabold text-[#20342a]">{title}</h3>{rows.length === 0 ? <p className="mt-2 text-sm text-[#68736c]">មិនមានទិន្នន័យ</p> : <div className="mt-3 space-y-2">{rows.map((row, index) => <div key={index} className="rounded-xl border border-[#e1e7e1] bg-[#fbfdfb] p-3 text-sm text-[#39473f]">{Object.entries(row).filter(([, value]) => value).map(([key, value]) => <p key={key}><span className="font-bold text-[#5b6a60]">{key.replaceAll('_', ' ')}៖ </span>{String(value)}</p>)}</div>)}</div>}</section>; }
function ReviewStatus({ status }: { status: string }) { const tone = status === 'approved' || status === 'assigned' ? 'bg-[#eaf6ec] text-[#1a6a37]' : status === 'rejected' ? 'bg-[#fff0ef] text-[#a73627]' : status === 'correction_needed' ? 'bg-amber-100 text-amber-900' : 'bg-[#f4f1e8] text-[#806525]'; return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${tone}`}>{status.replaceAll('_', ' ')}</span>; }
function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-[#dce6dd] bg-[#fbfdfb] px-4 py-3"><p className="text-xs text-[#68736c]">{label}</p><p className="mt-1 text-xl font-extrabold text-[#20342a]">{value}</p></div>; }
