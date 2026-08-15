'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { BellRing, BookOpen, ChevronDown, LogIn, Mail, MapPin, Menu, Phone, Rocket, X } from 'lucide-react';

type PublicRoute = 'docs' | 'features' | 'changelog';

const aboutLinks: Array<{ href: PublicRoute; label: string; detail: string; icon: typeof BookOpen }> = [
  { href: 'docs', label: 'ឯកសារណែនាំប្រព័ន្ធ', detail: 'System Documentation', icon: BookOpen },
  { href: 'features', label: 'មុខងារស្នូលនៃប្រព័ន្ធ', detail: 'Core Features & Guides', icon: Rocket },
  { href: 'changelog', label: 'កំណត់ត្រាកំណែទម្រង់', detail: 'Changelog & Latest Updates', icon: BellRing },
];

export function PublicSiteChrome({ children, active }: { children: ReactNode; active?: PublicRoute }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8faf8] text-slate-800">
      <div className="border-b border-emerald-800 bg-[#147a5b] px-4 py-2 text-xs text-white sm:text-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <span className="font-semibold">ប្រព័ន្ធអន្តេវាសិកដ្ឋានឌីជីថល KSIT</span>
          <div className="hidden items-center gap-4 text-emerald-100 md:flex"><span className="flex items-center gap-1"><Phone className="size-3.5" /> 089 511 383 / 092 740 222</span><span className="flex items-center gap-1"><Mail className="size-3.5" /> info@ksit.edu.kh</span></div>
        </div>
      </div>
      <header className="border-b border-slate-100 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Image src="/ksit-logo.png" alt="KSIT Dormitory Management System" width={80} height={80} priority className="size-14 shrink-0 object-contain sm:size-20" />
            <span className="min-w-0"><span className="block truncate text-base font-extrabold leading-tight text-[#147a5b] sm:text-xl md:text-2xl">ប្រព័ន្ធគ្រប់គ្រងការស្នាក់នៅអន្តេវាសិកដ្ឋាននិស្សិត KSIT</span><span className="mt-0.5 block truncate text-[10px] font-bold tracking-[0.08em] text-[#147a5b] sm:text-sm">KSIT DORMITORY MANAGEMENT SYSTEM</span></span>
          </Link>
          <Link href="/login" className="hidden items-center gap-2 rounded-lg bg-[#147a5b] px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[#0f6047] md:flex"><LogIn className="size-4 text-emerald-200" /> ចូលប្រើប្រាស់</Link>
          <button type="button" aria-label={mobileOpen ? 'បិទម៉ឺនុយ' : 'បើកម៉ឺនុយ'} aria-expanded={mobileOpen} onClick={() => setMobileOpen((current) => !current)} className="rounded-lg p-2 text-[#147a5b] hover:bg-emerald-50 lg:hidden">{mobileOpen ? <X className="size-7" /> : <Menu className="size-7" />}</button>
        </div>
      </header>
      <nav aria-label="ម៉ឺនុយសាធារណៈ" className="sticky top-0 z-40 hidden bg-[#147a5b] text-white shadow-md lg:block">
        <div className="mx-auto flex max-w-7xl items-center">
          <Link href="/" className="px-5 py-3 text-sm font-bold hover:bg-[#0f6047]">ទំព័រដើម</Link>
          <div className="group relative">
            <button type="button" aria-haspopup="true" className={`flex items-center gap-1 px-5 py-3 text-sm font-bold ${active ? 'hover:bg-[#0f6047]' : 'bg-[#0f6047]'}`}>អំពីប្រព័ន្ធ <ChevronDown className="size-4 text-emerald-200" /></button>
            <div className="invisible absolute left-0 top-full w-80 border border-slate-200 bg-white py-2 text-slate-800 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              {aboutLinks.map((item) => { const Icon = item.icon; return <Link key={item.href} href={`/${item.href}`} className={`flex gap-3 px-4 py-3 hover:bg-emerald-50 ${active === item.href ? 'bg-emerald-50 text-[#147a5b]' : ''}`}><Icon className="mt-0.5 size-4 shrink-0 text-[#147a5b]" /><span><span className="block text-sm font-bold">{item.label}</span><span className="mt-0.5 block text-xs text-slate-500">{item.detail}</span></span></Link>; })}
            </div>
          </div>
          <Link href="/#contact" className="px-5 py-3 text-sm font-bold hover:bg-[#0f6047]">ទំនាក់ទំនង</Link>
        </div>
      </nav>
      {mobileOpen && <nav aria-label="ម៉ឺនុយសាធារណៈសម្រាប់ទូរស័ព្ទ" className="border-t border-emerald-600 bg-[#147a5b] px-4 py-3 text-sm font-semibold text-white lg:hidden"><div className="mx-auto max-w-7xl"><Link href="/" onClick={() => setMobileOpen(false)} className="block border-b border-emerald-700 py-2.5">ទំព័រដើម</Link><p className="mt-3 text-xs font-bold uppercase tracking-wider text-emerald-200">អំពីប្រព័ន្ធ</p>{aboutLinks.map((item) => <Link key={item.href} href={`/${item.href}`} onClick={() => setMobileOpen(false)} className={`block border-b border-emerald-700 py-2.5 ${active === item.href ? 'text-amber-300' : ''}`}>{item.label}<span className="ml-2 text-xs text-emerald-200">{item.detail}</span></Link>)}<Link href="/#contact" onClick={() => setMobileOpen(false)} className="block border-b border-emerald-700 py-2.5">ទំនាក់ទំនង</Link><Link href="/login" onClick={() => setMobileOpen(false)} className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 py-3 font-bold text-slate-950"><LogIn className="size-4" /> ចូលប្រើប្រាស់ប្រព័ន្ធ</Link></div></nav>}
      <main>{children}</main>
      <footer id="contact" className="bg-slate-900 px-4 py-12 text-xs text-slate-400 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-2 lg:grid-cols-3"><div><div className="flex items-center gap-2"><Image src="/ksit-logo.png" alt="KSIT Logo" width={36} height={36} className="object-contain" /><h2 className="text-sm font-bold text-white">ប្រព័ន្ធអន្តេវាសិកដ្ឋាន KSIT</h2></div><p className="mt-3 max-w-md leading-6">ទំព័រឯកសារ និងកំណត់ត្រាកំណែទម្រង់សម្រាប់ប្រព័ន្ធគ្រប់គ្រងការស្នាក់នៅអន្តេវាសិកដ្ឋាននិស្សិត KSIT។</p><p className="mt-3">© 2026 Kampong Speu Institute of Technology (KSIT).</p></div><div><h2 className="text-sm font-bold text-white">ទំនាក់ទំនងផ្លូវការ</h2><p className="mt-3 flex items-start gap-2"><MapPin className="size-4 shrink-0 text-emerald-400" /> ផ្លូវជាតិលេខ ៤៤ ស្រុកថ្ពង ខេត្តកំពង់ស្ពឺ</p><p className="mt-2 flex items-center gap-2"><Phone className="size-4 text-emerald-400" /> 089 511 383 / 092 740 222</p><p className="mt-2 flex items-center gap-2"><Mail className="size-4 text-emerald-400" /> info@ksit.edu.kh</p></div><div><h2 className="text-sm font-bold text-white">រុករកបន្ថែម</h2><div className="mt-3 space-y-2 leading-5"><Link href="/docs" className="block hover:text-emerald-300">ឯកសារណែនាំប្រព័ន្ធ</Link><Link href="/features" className="block hover:text-emerald-300">មុខងារស្នូលនៃប្រព័ន្ធ</Link><Link href="/changelog" className="block hover:text-emerald-300">កំណត់ត្រាកំណែទម្រង់</Link><Link href="/login" className="block font-bold text-emerald-300 hover:text-emerald-200">ចូលទៅកាន់ Login</Link></div></div></div></footer>
    </div>
  );
}
