'use client';

import { useEffect, useMemo, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { majorsAPI } from '@/lib/api';
import type { AcademicMajor, PublicMajorsCatalog } from '@/types';

export type AcademicProgramValue = {
  academic_level: string;
  academic_major_id: string;
  academic_year: string;
};

const YEAR_LABELS: Record<number, string> = {
  1: 'ឆ្នាំទី ១ (Year 1)',
  2: 'ឆ្នាំទី ២ (Year 2)',
  3: 'ឆ្នាំទី ៣ (Year 3)',
  4: 'ឆ្នាំទី ៤ (Year 4)',
};

export function AcademicProgramFields({ value, onChange, required = false, compact = false }: { value: AcademicProgramValue; onChange: (next: AcademicProgramValue) => void; required?: boolean; compact?: boolean }) {
  const [catalog, setCatalog] = useState<PublicMajorsCatalog>({ majors: [], grouped_by_level: {} });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    void majorsAPI.public().then((response) => {
      if (!active) return;
      if (response.success && response.data) {
        setCatalog(response.data);
      } else {
        setNotice(response.error?.message || 'Academic programs could not be loaded.');
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const levels = useMemo(() => Object.keys(catalog.grouped_by_level || {}), [catalog]);
  const levelMajors = useMemo<AcademicMajor[]>(() => value.academic_level ? catalog.grouped_by_level?.[value.academic_level] || [] : [], [catalog, value.academic_level]);
  const selectedMajor = useMemo(() => levelMajors.find((major) => major.id === value.academic_major_id) || null, [levelMajors, value.academic_major_id]);
  const availableYears = useMemo(() => {
    const source = selectedMajor ? selectedMajor.available_year_levels : levelMajors.flatMap((major) => major.available_year_levels || []);
    return [...new Set(source)].sort((a, b) => a - b);
  }, [levelMajors, selectedMajor]);
  const muted = loading || levels.length === 0;
  const columns = compact ? 'gap-3' : 'grid gap-4 md:grid-cols-3';

  function chooseLevel(academic_level: string) {
    onChange({ academic_level, academic_major_id: '', academic_year: '' });
  }

  function chooseMajor(academic_major_id: string) {
    const major = levelMajors.find((item) => item.id === academic_major_id);
    const stillValidYear = major?.available_year_levels.includes(Number(value.academic_year)) ? value.academic_year : '';
    onChange({ ...value, academic_major_id, academic_year: stillValidYear });
  }

  return <div className={columns} aria-busy={loading}>
    <label className="block text-sm font-medium text-[#39473f]">កម្រិតសិក្សា (Academic level)<select value={value.academic_level} onChange={(event) => chooseLevel(event.target.value)} required={required} disabled={muted} className="mt-1.5 h-11 w-full rounded-xl border border-[#dce3dc] bg-white px-3 text-sm outline-none focus:border-[#5f9b6f] disabled:bg-[#f2f5f2]"><option value="">{loading ? 'Loading programs…' : 'ជ្រើសរើសកម្រិតសិក្សា'}</option>{levels.map((level) => <option key={level} value={level}>{level}</option>)}</select></label>
    <label className="block text-sm font-medium text-[#39473f]">ជំនាញ (Major)<select value={value.academic_major_id} onChange={(event) => chooseMajor(event.target.value)} required={required} disabled={!value.academic_level || muted} className="mt-1.5 h-11 w-full rounded-xl border border-[#dce3dc] bg-white px-3 text-sm outline-none focus:border-[#5f9b6f] disabled:bg-[#f2f5f2]"><option value="">ជ្រើសរើសជំនាញ</option>{levelMajors.map((major) => <option key={major.id} value={major.id}>{major.name_khmer} · {major.name_english}</option>)}</select></label>
    <label className="block text-sm font-medium text-[#39473f]">ឆ្នាំសិក្សា (Year level)<select value={value.academic_year} onChange={(event) => onChange({ ...value, academic_year: event.target.value })} required={required} disabled={!value.academic_level || muted} className="mt-1.5 h-11 w-full rounded-xl border border-[#dce3dc] bg-white px-3 text-sm outline-none focus:border-[#5f9b6f] disabled:bg-[#f2f5f2]"><option value="">ជ្រើសរើសឆ្នាំសិក្សា</option>{availableYears.map((year) => <option key={year} value={String(year)}>{YEAR_LABELS[year]}</option>)}</select></label>
    {loading && <p className={`${compact ? '' : 'md:col-span-3'} flex items-center gap-2 text-xs text-[#68736c]`}><LoaderCircle className="size-3.5 animate-spin" />Loading configured academic programs…</p>}
    {notice && <p className={`${compact ? '' : 'md:col-span-3'} text-xs leading-5 text-[#a4382a]`}>{notice}</p>}
  </div>;
}
