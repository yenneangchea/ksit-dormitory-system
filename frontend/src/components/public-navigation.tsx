'use client';

import Link from 'next/link';
import { ChevronDown, LogIn } from 'lucide-react';

type PublicRoute = 'about' | 'docs' | 'features' | 'changelog';

const systemLinks: Array<{ href: PublicRoute; label: string; detail: string }> = [
  { href: 'docs', label: '📖 ឯកសារណែនាំប្រព័ន្ធ', detail: 'System Documentation' },
  { href: 'features', label: '🚀 មុខងារស្នូលនៃប្រព័ន្ធ', detail: 'Core Features & Guides' },
  { href: 'changelog', label: '📢 កំណត់ត្រាកំណែទម្រង់', detail: 'Changelog & Latest Updates' },
];

export function PublicNavigation({ active }: { active?: PublicRoute }) {
  return (
    <nav aria-label="ម៉ឺនុយសាធារណៈ" className="sticky top-0 z-40 bg-[#147a5b] text-white shadow-md font-sans">
      <div className="scrollbar-none mx-auto flex max-w-7xl items-center overflow-x-auto whitespace-nowrap px-4 py-2.5 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0 rounded-lg px-3 py-2 text-sm font-bold hover:bg-[#0f6047]">ទំព័រដើម</Link>
        <Link href="/about" className={`shrink-0 rounded-lg px-3 py-2 text-sm font-bold hover:bg-[#0f6047] ${active === 'about' ? 'bg-[#0f6047]' : ''}`}>អំពីវិទ្យាស្ថាន</Link>
        <a href="https://ksit.edu.kh/category/scholarship/" target="_blank" rel="noreferrer" className="shrink-0 rounded-lg px-3 py-2 text-sm font-bold hover:bg-[#0f6047]">កម្មវិធីសិក្សា និងអាហារូបករណ៍</a>
        <details className="group relative shrink-0">
          <summary className="flex cursor-pointer list-none items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold hover:bg-[#0f6047] [&::-webkit-details-marker]:hidden">អំពីប្រព័ន្ធ <ChevronDown className="size-4 text-emerald-200 transition-transform group-open:rotate-180" /></summary>
          <div className="absolute left-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-emerald-800 bg-white text-slate-800 shadow-xl">
            {systemLinks.map((item) => <Link key={item.href} href={`/${item.href}`} className={`block border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-emerald-50 ${active === item.href ? 'bg-emerald-50 text-[#147a5b]' : ''}`}><span className="block text-sm font-bold">{item.label}</span><span className="mt-0.5 block text-xs text-slate-500">{item.detail}</span></Link>)}
          </div>
        </details>
        <Link href="/#contact" className="shrink-0 rounded-lg px-3 py-2 text-sm font-bold hover:bg-[#0f6047]">ទំនាក់ទំនង</Link>
        <Link href="/login" className="ml-2 inline-flex shrink-0 items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 shadow-sm hover:bg-amber-500"><LogIn className="size-4" /> ចូលប្រើប្រាស់</Link>
      </div>
    </nav>
  );
}

