'use client';

import Image from 'next/image';
import Link from 'next/link';
import { type ReactNode } from 'react';
import { LogIn, Mail, MapPin, Phone } from 'lucide-react';
import { PublicNavigation } from '@/components/public-navigation';

type PublicRoute = 'about' | 'docs' | 'features' | 'changelog';

export function PublicSiteChrome({ children, active }: { children: ReactNode; active?: PublicRoute }) {
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
          <Link href="/login" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#147a5b] px-3 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[#0f6047] sm:px-5"><LogIn className="size-4 text-emerald-200" /><span className="hidden sm:inline">ចូលប្រើប្រាស់</span></Link>
        </div>
      </header>
      <PublicNavigation active={active} />
      <main>{children}</main>
      <footer id="contact" className="bg-slate-900 px-4 py-12 text-xs text-slate-400 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-2 lg:grid-cols-3"><div><div className="flex items-center gap-2"><Image src="/ksit-logo.png" alt="KSIT Logo" width={36} height={36} className="object-contain" /><h2 className="text-sm font-bold text-white">ប្រព័ន្ធអន្តេវាសិកដ្ឋាន KSIT</h2></div><p className="mt-3 max-w-md leading-6">ទំព័រឯកសារ និងកំណត់ត្រាកំណែទម្រង់សម្រាប់ប្រព័ន្ធគ្រប់គ្រងការស្នាក់នៅអន្តេវាសិកដ្ឋាននិស្សិត KSIT។</p><p className="mt-3">© 2026 Kampong Speu Institute of Technology (KSIT).</p></div><div><h2 className="text-sm font-bold text-white">ទំនាក់ទំនងផ្លូវការ</h2><p className="mt-3 flex items-start gap-2"><MapPin className="size-4 shrink-0 text-emerald-400" /> ផ្លូវជាតិលេខ ៤៤ ស្រុកថ្ពង ខេត្តកំពង់ស្ពឺ</p><p className="mt-2 flex items-center gap-2"><Phone className="size-4 text-emerald-400" /> 089 511 383 / 092 740 222</p><p className="mt-2 flex items-center gap-2"><Mail className="size-4 text-emerald-400" /> info@ksit.edu.kh</p></div><div><h2 className="text-sm font-bold text-white">រុករកបន្ថែម</h2><div className="mt-3 space-y-2 leading-5"><Link href="/docs" className="block hover:text-emerald-300">ឯកសារណែនាំប្រព័ន្ធ</Link><Link href="/features" className="block hover:text-emerald-300">មុខងារស្នូលនៃប្រព័ន្ធ</Link><Link href="/changelog" className="block hover:text-emerald-300">កំណត់ត្រាកំណែទម្រង់</Link><Link href="/login" className="block font-bold text-emerald-300 hover:text-emerald-200">ចូលទៅកាន់ Login</Link></div></div></div></footer>
    </div>
  );
}
