'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, FileText, Filter, GraduationCap, RefreshCw, UsersRound } from 'lucide-react';
import { academicAnalyticsAPI, type AcademicAnalyticsReport } from '@/lib/api';
import type { UserRole } from '@/types';

type Filters = { academic_level: string; major_id: string; academic_year: string };

const roleCopy: Record<Extract<UserRole, 'admin' | 'manager' | 'teacher'>, { eyebrow: string; description: string }> = {
  admin: {
    eyebrow: 'Catalog stewardship and enrollment oversight',
    description: 'Review academic enrollment, export reports, and manage the official academic catalog below.',
  },
  manager: {
    eyebrow: 'Room allocation insight',
    description: 'Review student distribution by academic program, major, and year before allocation decisions.',
  },
  teacher: {
    eyebrow: 'Student welfare and attendance insight',
    description: 'Review the academic distribution of students for welfare follow-up and attendance planning.',
  },
};

function filtersForRequest(filters: Filters) {
  return {
    academic_level: filters.academic_level || undefined,
    major_id: filters.major_id || undefined,
    academic_year: filters.academic_year ? Number(filters.academic_year) : undefined,
  };
}

export function AcademicAnalyticsPanel({ role, adminControls }: { role: Extract<UserRole, 'admin' | 'manager' | 'teacher'>; adminControls?: React.ReactNode }) {
  const [filters, setFilters] = useState<Filters>({ academic_level: '', major_id: '', academic_year: '' });
  const [report, setReport] = useState<AcademicAnalyticsReport | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<'xlsx' | 'pdf' | null>(null);

  const levels = useMemo(() => [...new Set((report?.majors || []).map((major) => major.academic_level))], [report?.majors]);
  const availableMajors = useMemo(() => (report?.majors || []).filter((major) => !filters.academic_level || major.academic_level === filters.academic_level), [filters.academic_level, report?.majors]);
  const totalStudents = report?.students.length || 0;
  const configuredStudents = report?.students.filter((student) => student.is_configured_major).length || 0;
  const legacyStudents = totalStudents - configuredStudents;

  async function load() {
    setLoading(true);
    setError('');
    const response = await academicAnalyticsAPI.get(filtersForRequest(filters));
    setLoading(false);
    if (response.success && response.data) {
      setReport(response.data);
      return;
    }
    setError(response.error?.message || 'Unable to load academic enrollment data.');
  }

  useEffect(() => {
    void load();
  }, [filters.academic_level, filters.major_id, filters.academic_year]);

  async function exportReport(format: 'xlsx' | 'pdf') {
    setDownloading(format);
    setNotice('');
    const response = format === 'xlsx'
      ? await academicAnalyticsAPI.downloadExcel(filtersForRequest(filters))
      : await academicAnalyticsAPI.downloadPdf(filtersForRequest(filters));
    setDownloading(null);
    setNotice(response.success ? response.message || 'Report downloaded.' : response.error?.message || 'Unable to download the report.');
  }

  const copy = roleCopy[role];
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-[#dfe6df] pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.13em] text-[#147a5b]"><GraduationCap className="size-4" /> Academic & Majors</div>
          <h1 className="mt-2 text-2xl font-extrabold text-[#18231d] sm:text-3xl">កម្រិតសិក្សា និងជំនាញ</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#68736c]">{copy.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void exportReport('xlsx')} disabled={downloading !== null} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#0b5c2c] px-4 py-2 text-sm font-bold text-white hover:bg-[#084a23] disabled:opacity-60"><FileSpreadsheet className="size-4" />{downloading === 'xlsx' ? 'Preparing Excel…' : 'Export Excel (.xlsx)'}</button>
          <button type="button" onClick={() => void exportReport('pdf')} disabled={downloading !== null} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#b9d2bf] bg-white px-4 py-2 text-sm font-bold text-[#0b5c2c] hover:bg-[#edf7ee] disabled:opacity-60"><FileText className="size-4" />{downloading === 'pdf' ? 'Preparing PDF…' : 'Export PDF'}</button>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-[#e1e7e1] bg-[#fafcf9] p-4 lg:grid-cols-[1.25fr_1fr_0.8fr_auto] lg:items-end">
        <label className="block text-sm font-semibold text-[#39473f]">Academic program<select value={filters.academic_level} onChange={(event) => setFilters({ academic_level: event.target.value, major_id: '', academic_year: filters.academic_year })} className="mt-1.5 h-11 w-full rounded-lg border border-[#dce3dc] bg-white px-3 text-sm text-[#24332a]"><option value="">All academic programs</option>{levels.map((level) => <option value={level} key={level}>{level}</option>)}</select></label>
        <label className="block text-sm font-semibold text-[#39473f]">Major<select value={filters.major_id} onChange={(event) => setFilters({ ...filters, major_id: event.target.value })} className="mt-1.5 h-11 w-full rounded-lg border border-[#dce3dc] bg-white px-3 text-sm text-[#24332a]"><option value="">All majors</option>{availableMajors.map((major) => <option value={major.id} key={major.id}>{major.name_khmer} · {major.name_english}</option>)}</select></label>
        <label className="block text-sm font-semibold text-[#39473f]">Year level<select value={filters.academic_year} onChange={(event) => setFilters({ ...filters, academic_year: event.target.value })} className="mt-1.5 h-11 w-full rounded-lg border border-[#dce3dc] bg-white px-3 text-sm text-[#24332a]"><option value="">All years</option>{[1, 2, 3, 4].map((year) => <option value={year} key={year}>ឆ្នាំទី {year} · Year {year}</option>)}</select></label>
        <div className="flex gap-2"><button type="button" onClick={() => setFilters({ academic_level: '', major_id: '', academic_year: '' })} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#dce3dc] bg-white px-3 text-xs font-bold text-[#31513d] hover:bg-[#f4f8f4]"><Filter className="size-4" />Clear</button><button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#dce3dc] bg-white px-3 text-xs font-bold text-[#31513d] hover:bg-[#f4f8f4]"><RefreshCw className="size-4" />Refresh</button></div>
      </div>

      {notice && <p className="rounded-lg bg-[#edf7ee] px-4 py-3 text-sm font-medium text-[#16582b]" role="status">{notice}</p>}
      {error && <p className="rounded-lg bg-[#fff3f1] px-4 py-3 text-sm font-medium text-[#ad4939]" role="alert">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <article className="ksit-card p-5"><p className="text-xs font-bold uppercase tracking-[0.1em] text-[#68736c]">Students in selection</p><p className="mt-2 text-3xl font-extrabold text-[#0b5c2c]">{loading ? '—' : totalStudents}</p><p className="mt-1 text-xs text-[#68736c]">Filtered student academic profiles</p></article>
        <article className="ksit-card p-5"><p className="text-xs font-bold uppercase tracking-[0.1em] text-[#68736c]">Configured catalog profiles</p><p className="mt-2 text-3xl font-extrabold text-[#0b5c2c]">{loading ? '—' : configuredStudents}</p><p className="mt-1 text-xs text-[#68736c]">Linked to active major catalog records</p></article>
        <article className="ksit-card p-5"><p className="text-xs font-bold uppercase tracking-[0.1em] text-[#68736c]">Legacy / unspecified profiles</p><p className="mt-2 text-3xl font-extrabold text-[#8a6a22]">{loading ? '—' : legacyStudents}</p><p className="mt-1 text-xs text-[#68736c]">Visible for data-cleanup follow-up</p></article>
      </div>

      <div className="ksit-card overflow-hidden"><div className="flex items-start justify-between gap-4 border-b border-[#edf0ed] p-5"><div><h2 className="font-extrabold text-[#20342a]">Major enrollment statistics</h2><p className="mt-1 text-sm text-[#68736c]">Count of student records, including each configured year level.</p></div><span className="inline-flex items-center gap-2 text-xs font-bold text-[#526058]"><UsersRound className="size-4" />{report?.summaries.length || 0} major groups</span></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-[#f6f9f6] text-xs uppercase tracking-[0.06em] text-[#68736c]"><tr><th className="px-5 py-3">Program & Major</th><th className="px-4 py-3 text-center">Total</th><th className="px-4 py-3 text-center">Y1</th><th className="px-4 py-3 text-center">Y2</th><th className="px-4 py-3 text-center">Y3</th><th className="px-4 py-3 text-center">Y4</th></tr></thead><tbody>{loading ? <tr><td colSpan={6} className="px-5 py-8 text-[#68736c]">Loading academic enrollment data…</td></tr> : !report?.summaries.length ? <tr><td colSpan={6} className="px-5 py-8 text-[#68736c]">No academic profiles match the current filters.</td></tr> : report.summaries.map((summary) => <tr key={summary.major_id || `${summary.academic_level}-${summary.major_name_english}`} className="border-t border-[#edf0ed]"><td className="px-5 py-4"><p className="font-bold text-[#2b4935]">{summary.major_name_khmer}</p><p className="mt-1 text-xs text-[#68736c]">{summary.major_name_english} · {summary.academic_level}</p></td><td className="px-4 py-4 text-center font-extrabold text-[#0b5c2c]">{summary.total_students}</td>{[1, 2, 3, 4].map((year) => <td className="px-4 py-4 text-center" key={year}>{summary.by_year[year as 1 | 2 | 3 | 4]}</td>)}</tr>)}</tbody></table></div></div>

      <div className="ksit-card overflow-hidden"><div className="border-b border-[#edf0ed] p-5"><h2 className="font-extrabold text-[#20342a]">Filtered student list</h2><p className="mt-1 text-sm text-[#68736c]">Authorized staff can export the complete filtered list. This table shows the first 200 records.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-[#f6f9f6] text-xs uppercase tracking-[0.06em] text-[#68736c]"><tr><th className="px-5 py-3">Student</th><th className="px-4 py-3">Academic program</th><th className="px-4 py-3">Major</th><th className="px-4 py-3">Year</th><th className="px-4 py-3">Catalog link</th></tr></thead><tbody>{loading ? <tr><td colSpan={5} className="px-5 py-8 text-[#68736c]">Loading student records…</td></tr> : !report?.students.length ? <tr><td colSpan={5} className="px-5 py-8 text-[#68736c]">No students match the current filters.</td></tr> : report.students.slice(0, 200).map((student) => <tr className="border-t border-[#edf0ed]" key={student.user_id}><td className="px-5 py-4"><p className="font-bold text-[#2b4935]">{student.full_name_khmer || student.full_name_latin || 'Unnamed student'}</p><p className="mt-1 text-xs text-[#68736c]">{student.full_name_latin}{student.email ? ` · ${student.email}` : ''}</p></td><td className="px-4 py-4">{student.academic_level}</td><td className="px-4 py-4"><p className="font-semibold">{student.major_name_khmer}</p><p className="mt-1 text-xs text-[#68736c]">{student.major_name_english}</p></td><td className="px-4 py-4">{student.academic_year ? `Year ${student.academic_year}` : '—'}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${student.is_configured_major ? 'bg-[#e6f4e8] text-[#16582b]' : 'bg-[#f9f2df] text-[#886b21]'}`}>{student.is_configured_major ? 'Configured' : 'Legacy'}</span></td></tr>)}</tbody></table></div></div>
      {adminControls}
    </section>
  );
}
