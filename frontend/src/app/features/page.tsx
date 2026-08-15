'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';
import { PublicNavigation } from '@/components/public-navigation';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  FileText,
  GraduationCap,
  LogIn,
  Mail,
  MapPin,
  Phone,
  QrCode,
  Receipt,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react';

const benefits = [
  { title: 'លុបបំបាត់ការប្រើប្រាស់ក្រដាសស្នាម', detail: 'ព័ត៌មានស្នើសុំបន្ទប់ និងឯកសារស្នាក់នៅត្រូវបានគ្រប់គ្រងជាឌីជីថល ដើម្បីកាត់បន្ថយការបាត់បង់ឯកសារ និងពេលវេលាស្វែងរក។', icon: FileText, style: 'bg-emerald-50 text-[#147a5b]' },
  { title: 'ការបែងចែកបន្ទប់មានតម្លាភាព និងយុត្តិធម៌', detail: 'Waterfall algorithm ពិនិត្យលក្ខខណ្ឌ កម្រិតសិក្សា ភេទ និងសមត្ថភាពបន្ទប់ ដើម្បីបែងចែកតាមគោលការណ៍ច្បាស់លាស់។', icon: Building2, style: 'bg-amber-50 text-amber-700' },
  { title: 'គណនាថ្លៃទឹកភ្លើងច្បាស់លាស់តាម KHQR', detail: 'ប្រព័ន្ធបែងចែកថ្លៃសេវាតាមកុងទ័រ និងចំនួនអ្នកស្នាក់នៅសកម្ម ហើយបង្កើតលេខយោងសម្រាប់ការទូទាត់។', icon: CreditCard, style: 'bg-sky-50 text-sky-700' },
  { title: 'ស្រង់វត្តមានយប់សុក្រឹត', detail: 'Magic QR ជួយឱ្យការកត់ត្រាវត្តមាននៅបន្ទប់មានល្បឿន លម្អិត និងកាត់បន្ថយការកត់ត្រាមិនត្រឹមត្រូវ។', icon: QrCode, style: 'bg-violet-50 text-violet-700' },
  { title: 'រាយការណ៍ជួសជុលទាន់ពេលវេលា', detail: 'និស្សិតអាចផ្ញើសំណើជួសជុល ខណៈ Manager អាចតាមដានស្ថានភាព Open, In Progress និង Resolved បានជាក់ស្តែង។', icon: Wrench, style: 'bg-rose-50 text-rose-700' },
];

const roles = [
  { no: '01', name: 'ADMIN PORTAL', title: 'គ្រប់គ្រងប្រព័ន្ធ និងរចនាសម្ព័ន្ធអគារ', steps: ['គ្រប់គ្រងគណនីបុគ្គលិក និងកំណត់ Role', 'បង្កើតអគារ និងកំណត់បន្ទប់ស្នាក់នៅ', 'តាមដានរបាយការណ៍រួម និងស្ថិតិស្នាក់នៅ'], icon: ShieldCheck, card: 'border-emerald-300 bg-emerald-950 text-white', accent: 'bg-emerald-400 text-emerald-950' },
  { no: '02', name: 'MANAGER PORTAL', title: 'ដឹកនាំប្រតិបត្តិការអន្តេវាសិកដ្ឋាន', steps: ['អនុម័ត ឬបដិសេធពាក្យស្នើសុំស្នាក់នៅ', 'ដំណើរការ Waterfall Room Assignment', 'បញ្ចូលកុងទ័រទឹកភ្លើង និងបង្កើត KHQR Split Bill'], icon: Building2, card: 'border-amber-200 bg-amber-50 text-slate-800', accent: 'bg-amber-400 text-amber-950' },
  { no: '03', name: 'TEACHER PORTAL', title: 'កត់ត្រាវត្តមានពេលយប់ និងតាមដានវិន័យ', steps: ['ស្កេន Magic QR នៅតាមទ្វារបន្ទប់', 'កត់ត្រា មានវត្តមាន / អវត្តមាន / សុំច្បាប់', 'តាមដានប្រវត្តិវត្តមាន និងអនុម័តច្បាប់ឈប់សម្រាក'], icon: QrCode, card: 'border-sky-200 bg-sky-50 text-slate-800', accent: 'bg-sky-400 text-sky-950' },
  { no: '04', name: 'STUDENT PORTAL', title: 'ស្នើសុំបន្ទប់ និងគ្រប់គ្រងសេវា', steps: ['ដាក់ពាក្យស្នាក់នៅតាមឌីជីថល និងភ្ជាប់ឯកសារគាំទ្រ', 'ពិនិត្យបន្ទប់ និងបញ្ជីឈ្មោះអ្នករួមបន្ទប់', 'ស្កេនបង់ប្រាក់ KHQR និងដាក់សំណើជួសជុលបន្ទប់'], icon: Receipt, card: 'border-rose-200 bg-rose-50 text-slate-800', accent: 'bg-rose-400 text-rose-950' },
];

export default function FeaturesPage() {
  const sliderRef = useRef<HTMLDivElement>(null);
  const slide = (direction: 'left' | 'right') => sliderRef.current?.scrollBy({ left: direction === 'left' ? -420 : 420, behavior: 'smooth' });

  return (
    <main className="min-h-screen bg-[#f8faf8] text-slate-800">
      <div className="border-b border-emerald-800 bg-[#147a5b] px-4 py-2 text-xs text-white sm:text-sm"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><span className="font-semibold">ប្រព័ន្ធអន្តេវាសិកដ្ឋានឌីជីថល KSIT</span><div className="hidden items-center gap-4 text-emerald-100 md:flex"><span className="flex items-center gap-1"><Phone className="size-3.5" /> 089 511 383 / 092 740 222</span><span className="flex items-center gap-1"><Mail className="size-3.5" /> info@ksit.edu.kh</span></div></div></div>
      <header className="border-b border-slate-100 bg-white px-4 py-4 sm:px-6 lg:px-8"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><Link href="/" className="flex min-w-0 items-center gap-3 sm:gap-4"><Image src="/ksit-logo.png" alt="KSIT Dormitory Management System" width={80} height={80} priority className="size-14 shrink-0 object-contain sm:size-20" /><span className="min-w-0"><span className="block truncate text-base font-extrabold leading-tight text-[#147a5b] sm:text-xl md:text-2xl">ប្រព័ន្ធគ្រប់គ្រងការស្នាក់នៅអន្តេវាសិកដ្ឋាននិស្សិត KSIT</span><span className="mt-0.5 block truncate text-[10px] font-bold tracking-[0.08em] text-[#147a5b] sm:text-sm">KSIT DORMITORY MANAGEMENT SYSTEM</span></span></Link><Link href="/login" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#147a5b] px-3 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[#0f6047] sm:px-5"><LogIn className="size-4 text-emerald-200" /><span className="hidden sm:inline">ចូលប្រើប្រាស់</span></Link></div></header>
      <PublicNavigation active="features" />

      <section className="overflow-hidden bg-[radial-gradient(circle_at_85%_20%,rgba(255,255,255,0.18),transparent_28%),linear-gradient(135deg,#0b5c2c,#147a5b_54%,#0f172a)] px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-20"><div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-12"><div className="lg:col-span-8"><span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold text-amber-300"><GraduationCap className="size-4" /> អំពីប្រព័ន្ធអន្តេវាសិកដ្ឋានឌីជីថល</span><h1 className="mt-6 max-w-4xl text-4xl font-extrabold leading-tight sm:text-5xl">ប្រព័ន្ធគ្រប់គ្រងអន្តេវាសិកដ្ឋាន នៃវិទ្យាស្ថានបច្ចេកវិទ្យាកំពង់ស្ពឺ</h1><p className="mt-3 text-lg font-bold text-emerald-100">KSIT Dormitory Management System</p><p className="mt-6 max-w-3xl text-sm leading-8 text-emerald-50 sm:text-base">ប្រព័ន្ធឌីជីថលកណ្ដាលសម្រាប់គ្រប់គ្រងការស្នាក់នៅ ដែលត្រូវបានរចនាឡើងសម្រាប់និស្សិត គ្រូត្រួតពិនិត្យ អ្នកគ្រប់គ្រងអន្តេវាសិកដ្ឋាន និងអ្នកគ្រប់គ្រងប្រព័ន្ធរបស់ KSIT។</p><Link href="/login" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg hover:bg-amber-500">ចាប់ផ្តើមចូលប្រើប្រាស់ <ChevronRight className="size-4" /></Link></div><div className="hidden lg:col-span-4 lg:block"><div className="rounded-3xl border border-white/15 bg-white/10 p-7 backdrop-blur-sm"><Users className="size-10 text-amber-300" /><p className="mt-6 text-sm font-bold text-white">គ្រប់តួនាទីនៅក្នុងប្រព័ន្ធតែមួយ</p><p className="mt-2 text-sm leading-6 text-emerald-100">សម្របសម្រួលពីការដាក់ពាក្យ ដល់ការចាត់បន្ទប់ ការបង់ប្រាក់ វត្តមាន និងការជួសជុល។</p></div></div></div></section>

      <section className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="max-w-3xl"><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-[#147a5b]">ហេតុអ្វីចាំបាច់ត្រូវមានប្រព័ន្ធនេះ?</span><h2 className="mt-4 text-3xl font-extrabold text-slate-900">ពីការគ្រប់គ្រងលើក្រដាស ទៅស្វ័យប្រវត្តិកម្មដែលមានភាពច្បាស់លាស់</h2><p className="mt-4 text-sm leading-7 text-slate-600">ប្រព័ន្ធនេះជួយឱ្យ KSIT ផ្លាស់ប្ដូរដំណើរការដែលចំណាយពេល និងពិបាកតាមដាន ទៅជាការគ្រប់គ្រងមានទិន្នន័យពិត សិទ្ធិចូលប្រើច្បាស់លាស់ និងសេវារហ័សសម្រាប់និស្សិត។</p></div><div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{benefits.map((benefit) => { const Icon = benefit.icon; return <article key={benefit.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className={`flex size-11 items-center justify-center rounded-xl ${benefit.style}`}><Icon className="size-5" /></div><h3 className="mt-4 text-lg font-bold text-slate-900">{benefit.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{benefit.detail}</p></article>; })}</div></div></section>

      <section className="border-y border-emerald-100 bg-emerald-50/70 px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div className="max-w-3xl"><span className="rounded-full bg-[#147a5b] px-3 py-1 text-xs font-bold text-white">SYSTEM GUIDE</span><h2 className="mt-4 text-3xl font-extrabold text-slate-900">របៀបប្រើប្រាស់ប្រព័ន្ធតាមតួនាទី</h2><p className="mt-3 text-sm leading-6 text-slate-600">អូសផ្ដេកដើម្បីមើលជំហានសំខាន់ៗសម្រាប់តួនាទីនីមួយៗ ឬប្រើ scroll bar ខាងក្រោម។</p></div><div className="flex gap-2"><button type="button" onClick={() => slide('left')} aria-label="ស្លាយមុន" className="rounded-full border border-emerald-200 bg-white p-3 text-[#147a5b] hover:bg-emerald-100"><ArrowLeft className="size-4" /></button><button type="button" onClick={() => slide('right')} aria-label="ស្លាយបន្ទាប់" className="rounded-full bg-[#147a5b] p-3 text-white hover:bg-[#0f6047]"><ArrowRight className="size-4" /></button></div></div><div ref={sliderRef} className="mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-5 [scrollbar-color:#147a5b_#e9f3eb] [scrollbar-width:thin]">{roles.map((role) => { const Icon = role.icon; return <article key={role.no} className={`min-w-[min(88vw,430px)] snap-start rounded-3xl border p-7 shadow-sm ${role.card}`}><div className="flex items-center justify-between"><span className={`inline-flex size-11 items-center justify-center rounded-2xl font-black ${role.accent}`}>{role.no}</span><Icon className="size-8" /></div><p className="mt-8 text-xs font-bold tracking-[0.18em] opacity-70">{role.name}</p><h3 className="mt-3 text-2xl font-extrabold leading-tight">{role.title}</h3><ol className="mt-7 space-y-4">{role.steps.map((step, index) => <li key={step} className="flex gap-3 text-sm leading-6"><span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${role.accent}`}>{index + 1}</span>{step}</li>)}</ol><Link href="/login" className="mt-8 inline-flex items-center gap-2 text-sm font-bold underline underline-offset-4">ចូលប្រើប្រាស់ជា {role.name.replace(' PORTAL', '').replace('ADMIN', 'Admin').replace('MANAGER', 'Manager').replace('TEACHER', 'Teacher').replace('STUDENT', 'Student')} <ChevronRight className="size-4" /></Link></article>; })}</div></div></section>

      <section className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl rounded-3xl bg-[#0f6047] px-7 py-12 text-center text-white sm:px-12"><ClipboardCheck className="mx-auto size-10 text-amber-300" /><h2 className="mx-auto mt-5 max-w-3xl text-3xl font-extrabold">គ្រប់គ្រងអន្តេវាសិកដ្ឋានដោយតម្លាភាព ទំនើប និងផ្តោតលើនិស្សិត</h2><p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-emerald-100">KSIT អាចពង្រឹងអភិបាលកិច្ចឌីជីថលក្រោមវិស័យអប់រំ យុវជន និងកីឡា ដោយប្រើទិន្នន័យដែលអាចតាមដានបាន សម្រាប់សេវាស្នាក់នៅប្រកបដោយគុណភាព។</p><Link href="/login" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3.5 text-sm font-bold text-slate-950 hover:bg-amber-500">ចាប់ផ្តើមចូលប្រើប្រាស់ប្រព័ន្ធអន្តេវាសិកដ្ឋានថ្ងៃនេះ <ChevronRight className="size-4" /></Link></div></section>

      <footer id="contact" className="bg-slate-900 px-4 py-12 text-xs text-slate-400 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-2 lg:grid-cols-3"><div><div className="flex items-center gap-2"><Image src="/ksit-logo.png" alt="KSIT Logo" width={36} height={36} className="object-contain" /><h2 className="text-sm font-bold text-white">ប្រព័ន្ធអន្តេវាសិកដ្ឋាន KSIT</h2></div><p className="mt-3 max-w-md leading-6">ទំព័រណែនាំអំពីប្រព័ន្ធគ្រប់គ្រងការស្នាក់នៅអន្តេវាសិកដ្ឋាននិស្សិត KSIT។</p><p className="mt-3">© 2026 Kampong Speu Institute of Technology (KSIT).</p></div><div><h2 className="text-sm font-bold text-white">ទំនាក់ទំនងផ្លូវការ</h2><p className="mt-3 flex items-start gap-2"><MapPin className="size-4 shrink-0 text-emerald-400" /> ផ្លូវជាតិលេខ ៤៤ ស្រុកថ្ពង ខេត្តកំពង់ស្ពឺ</p><p className="mt-2 flex items-center gap-2"><Phone className="size-4 text-emerald-400" /> 089 511 383 / 092 740 222</p><p className="mt-2 flex items-center gap-2"><Mail className="size-4 text-emerald-400" /> info@ksit.edu.kh</p></div><div><h2 className="text-sm font-bold text-white">ចូលប្រើប្រាស់ប្រព័ន្ធ</h2><p className="mt-3 leading-6">Admin, Manager, Teacher និង Student អាចចូលប្រើតាមគណនីដែលបានអនុញ្ញាត។</p><Link href="/login" className="mt-4 inline-flex items-center gap-2 font-bold text-emerald-300 hover:text-emerald-200">ចូលទៅកាន់ Login <ChevronRight className="size-4" /></Link></div></div></footer>
    </main>
  );
}
