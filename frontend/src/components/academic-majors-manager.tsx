'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileSpreadsheet, History, Search, Upload } from 'lucide-react';
import { majorsAPI, type AcademicMajorAuditLog, type AcademicMajorImportResult } from '@/lib/api';
import type { AcademicMajor } from '@/types';

type MajorModal = AcademicMajor | 'new' | null;

type Props = {
  majors: AcademicMajor[];
  isWorking: boolean;
  onAddMajor: () => void;
  onEditMajor: (major: AcademicMajor) => void;
  onToggleMajor: (major: AcademicMajor) => void;
  onDeleteMajor: (major: AcademicMajor) => void;
  auditRefreshToken: number;
  onImportComplete: (result: AcademicMajorImportResult) => Promise<void>;
};

const levelOptions = [
  'ផ្នែកអប់រំបច្ចេកទេស (៩+៣)',
  'កម្រិតបរិញ្ញាបត្ររង',
  'កម្រិតបរិញ្ញាបត្រ',
];

const actionLabels: Record<AcademicMajorAuditLog['action'], string> = {
  create: 'Created',
  update: 'Updated',
  activate: 'Activated',
  deactivate: 'Deactivated',
  delete: 'Deleted',
  bulk_import: 'Bulk imported',
};

function snapshotName(snapshot: AcademicMajor | null) {
  if (!snapshot) return '—';
  return `${snapshot.name_khmer} · ${snapshot.name_english}`;
}

function downloadTemplate() {
  const csv = [
    'academic_level,name_khmer,name_english,available_year_levels,is_active',
    'ផ្នែកអប់រំបច្ចេកទេស (៩+៣),បច្ចេកវិទ្យាមេកាត្រូនិក,Mechatronics Technology,"1,2,3",true',
    'កម្រិតបរិញ្ញាបត្ររង,បច្ចេកវិទ្យាកុំព្យូទ័រ,Computer Technology,"1,2",true',
  ].join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ksit-academic-majors-template.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export function AcademicMajorsManager({ majors, isWorking, onAddMajor, onEditMajor, onToggleMajor, onDeleteMajor, auditRefreshToken, onImportComplete }: Props) {
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [auditLogs, setAuditLogs] = useState<AcademicMajorAuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importMessage, setImportMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredMajors = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return majors.filter((major) => {
      const matchesQuery = !query || [major.academic_level, major.name_khmer, major.name_english].some((value) => value.toLocaleLowerCase().includes(query));
      const matchesLevel = !level || major.academic_level === level;
      const matchesStatus = status === 'all' || (status === 'active' ? major.is_active : !major.is_active);
      return matchesQuery && matchesLevel && matchesStatus;
    });
  }, [level, majors, search, status]);

  async function loadAuditLogs() {
    setAuditLoading(true);
    setAuditError('');
    const response = await majorsAPI.audit();
    setAuditLoading(false);
    if (response.success && response.data) setAuditLogs(response.data);
    else setAuditError(response.error?.message || 'Unable to load the academic-major history.');
  }

  useEffect(() => {
    void loadAuditLogs();
  }, [auditRefreshToken]);

  async function handleImport(file: File) {
    setImporting(true);
    setImportProgress(0);
    setImportMessage('');
    const body = new FormData();
    body.set('file', file);
    body.set('mode', 'upsert');
    const response = await majorsAPI.importFile(body, setImportProgress);
    setImporting(false);
    if (!response.success || !response.data) {
      setImportMessage(response.error?.message || 'The import could not be completed.');
      return;
    }
    const result = response.data;
    setImportMessage(`Imported ${result.total} rows: ${result.created} created, ${result.updated} updated.`);
    await onImportComplete(result);
    await loadAuditLogs();
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="border-t border-[#edf0ed] p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-[#20342a]">គ្រប់គ្រងកម្រិតសិក្សា និងជំនាញ</h3>
          <p className="mt-1 text-sm text-[#68736c]">Academic Programs & Majors configured for cascading registration and waterfall allocation.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onAddMajor} className="min-h-11 rounded-lg bg-[#0b5c2c] px-3 py-2 text-xs font-bold text-white hover:bg-[#084a23]">+ Add New Major (បន្ថែមជំនាញថ្មី)</button>
          <button type="button" onClick={downloadTemplate} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#dce3dc] bg-white px-3 py-2 text-xs font-bold text-[#31513d] hover:bg-[#f4f8f4]"><Download className="size-4" /> CSV template</button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 rounded-xl border border-[#e1e7e1] bg-[#fafcf9] p-4 lg:grid-cols-[1.6fr_1fr_0.8fr_auto] lg:items-end">
        <label className="block text-sm font-medium text-[#39473f]"><span className="inline-flex items-center gap-2">Search majors <Search className="size-4 text-[#5d7964]" /></span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Khmer, English, or level" className="mt-1.5 h-11 w-full rounded-xl border border-[#dce3dc] bg-white px-3 text-sm outline-none focus:border-[#5f9b6f]" /></label>
        <label className="block text-sm font-medium text-[#39473f]">Academic level<select value={level} onChange={(event) => setLevel(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-[#dce3dc] bg-white px-3 text-sm outline-none focus:border-[#5f9b6f]"><option value="">All levels</option>{levelOptions.map((option) => <option value={option} key={option}>{option}</option>)}</select></label>
        <label className="block text-sm font-medium text-[#39473f]">Status<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="mt-1.5 h-11 w-full rounded-xl border border-[#dce3dc] bg-white px-3 text-sm outline-none focus:border-[#5f9b6f]"><option value="all">All statuses</option><option value="active">Active only</option><option value="inactive">Inactive only</option></select></label>
        <button type="button" onClick={() => { setSearch(''); setLevel(''); setStatus('all'); }} className="min-h-11 rounded-lg border border-[#dce3dc] bg-white px-3 py-2 text-xs font-bold text-[#31513d] hover:bg-[#f4f8f4]">Clear filters</button>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#dce3dc] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3"><FileSpreadsheet className="mt-0.5 size-5 shrink-0 text-[#0b5c2c]" /><div><p className="font-bold text-[#223128]">Bulk import CSV or Excel</p><p className="mt-1 text-xs leading-5 text-[#68736c]">Use columns academic_level, name_khmer, name_english, available_year_levels, and is_active. Existing majors are safely updated by level and English name.</p></div></div>
        <label className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#b8cfba] bg-[#f5fbf5] px-3 py-2 text-xs font-bold text-[#0b5c2c] ${importing ? 'pointer-events-none opacity-60' : ''}`}><Upload className="size-4" />{importing ? `Uploading ${importProgress}%` : 'Choose CSV / Excel'}<input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.xlsm" className="sr-only" disabled={importing} onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleImport(file); }} /></label>
      </div>
      {importMessage && <p className="mt-3 rounded-lg bg-[#eef7ef] px-3 py-2 text-sm text-[#27613a]" role="status">{importMessage}</p>}

      <div className="mt-5 overflow-x-auto rounded-xl border border-[#e1e7e1]"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-[#f5f8f5] text-xs uppercase tracking-[0.06em] text-[#68736c]"><tr><th className="px-4 py-3">Level</th><th className="px-4 py-3">Khmer / English name</th><th className="px-4 py-3">Active years</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody>{filteredMajors.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-[#68736c]">No majors match the current search and filters.</td></tr> : filteredMajors.map((major) => <tr key={major.id} className="border-t border-[#edf0ed]"><td className="px-4 py-4 font-semibold text-[#2b4935]">{major.academic_level}</td><td className="px-4 py-4"><p className="font-semibold">{major.name_khmer}</p><p className="mt-1 text-xs text-[#68736c]">{major.name_english}</p></td><td className="px-4 py-4">{major.available_year_levels.map((year) => `Y${year}`).join(', ')}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${major.is_active ? 'bg-[#e6f4e8] text-[#16582b]' : 'bg-[#f1f2f1] text-[#6d766f]'}`}>{major.is_active ? 'Active' : 'Inactive'}</span></td><td className="px-4 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => onEditMajor(major)} className="min-h-10 rounded-lg border border-[#dce3dc] px-2.5 text-xs font-bold text-[#31513d]">Edit (កែប្រែ)</button><button type="button" disabled={isWorking} onClick={() => onToggleMajor(major)} className="min-h-10 rounded-lg border border-[#dce3dc] px-2.5 text-xs font-bold text-[#31513d]">{major.is_active ? 'Deactivate' : 'Activate'}</button><button type="button" disabled={isWorking} onClick={() => onDeleteMajor(major)} className="min-h-10 rounded-lg border border-[#f2cfca] px-2.5 text-xs font-bold text-[#ad4939]">Delete</button></div></td></tr>)}</tbody></table></div>
      <p className="mt-3 text-xs text-[#68736c]">Showing {filteredMajors.length} of {majors.length} configured majors.</p>

      <div className="mt-8 border-t border-[#edf0ed] pt-6"><div className="flex items-center gap-2"><History className="size-5 text-[#0b5c2c]" /><div><h4 className="font-bold text-[#223128]">Academic-major change history</h4><p className="mt-1 text-xs text-[#68736c]">Administrator actions are retained with sanitized before/after snapshots.</p></div></div>{auditError && <p className="mt-3 rounded-lg bg-[#fff3f1] px-3 py-2 text-sm text-[#ad4939]">{auditError}</p>}{auditLoading ? <p className="mt-4 text-sm text-[#68736c]">Loading audit history…</p> : <div className="mt-4 overflow-x-auto rounded-xl border border-[#e1e7e1]"><table className="w-full min-w-[980px] text-left text-xs"><thead className="bg-[#f5f8f5] uppercase tracking-[0.06em] text-[#68736c]"><tr><th className="px-4 py-3">Time</th><th className="px-4 py-3">Administrator</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Before</th><th className="px-4 py-3">After</th></tr></thead><tbody>{auditLogs.length === 0 ? <tr><td colSpan={5} className="px-4 py-6 text-[#68736c]">No academic-major changes have been recorded.</td></tr> : auditLogs.map((log) => <tr key={log.id} className="border-t border-[#edf0ed] align-top"><td className="whitespace-nowrap px-4 py-3 text-[#68736c]">{new Date(log.created_at).toLocaleString()}</td><td className="px-4 py-3"><p className="font-semibold text-[#2b4935]">{log.admin?.full_name_latin || log.admin?.full_name_khmer || 'Administrator'}</p><p className="mt-1 text-[#68736c]">{log.admin?.email || log.admin_user_id}</p></td><td className="px-4 py-3 font-semibold text-[#31513d]">{actionLabels[log.action]}<span className="mt-1 block font-normal text-[#68736c]">{log.source}</span></td><td className="max-w-[220px] px-4 py-3 text-[#68736c]">{snapshotName(log.before_data)}</td><td className="max-w-[220px] px-4 py-3 text-[#68736c]">{snapshotName(log.after_data)}</td></tr>)}</tbody></table></div>}</div>
    </div>
  );
}
