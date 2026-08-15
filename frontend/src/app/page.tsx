"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Award,
  BellRing,
  Building2,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  LogIn,
  Mail,
  MapPin,
  Menu,
  Phone,
  QrCode,
  Receipt,
  ShieldCheck,
  Users,
  Wrench,
  X,
} from "lucide-react";

const roles = [
  { name: "Admin", detail: "គ្រប់គ្រងទូទៅ និងចាត់បន្ទប់", tone: "text-emerald-300" },
  { name: "Manager", detail: "វត្តមាន និងកុងទ័រទឹកភ្លើង", tone: "text-amber-300" },
  { name: "Teacher", detail: "តាមដានវត្តមាន និងអនុម័ត", tone: "text-sky-300" },
  { name: "Student", detail: "ស្នើសុំបន្ទប់ និងបង់ KHQR", tone: "text-pink-300" },
];

const roleWalkthrough = [
  { role: 'Admin', title: 'គ្រប់គ្រងប្រព័ន្ធ និងសមាជិក', summary: 'Admin គ្រប់គ្រងគណនីអ្នកប្រើ សិទ្ធិចូលប្រើ អគារ បន្ទប់ និងមាតិកាគេហទំព័រ។', steps: ['បង្កើត ឬកែសម្រួលគណនី', 'កំណត់តួនាទី Admin / Manager / Teacher / Student', 'គ្រប់គ្រងអគារ បន្ទប់ និង Magic QR'], icon: ShieldCheck, tone: 'border-emerald-300 bg-emerald-950 text-emerald-50', badge: 'bg-emerald-400 text-emerald-950' },
  { role: 'Manager', title: 'ដឹកនាំប្រតិបត្តិការអន្តេវាសិកដ្ឋាន', summary: 'Manager ពិនិត្យពាក្យស្នើសុំ ចាត់បន្ទប់ស្វ័យប្រវត្តិ និងគណនាវិក្កយបត្រទឹកភ្លើង។', steps: ['អនុម័ត ឬបដិសេធពាក្យស្នើសុំ', 'ដំណើរការ Waterfall Room Assignment', 'បង្កើត Split Bill និងលេខយោង KHQR'], icon: Building2, tone: 'border-amber-300 bg-amber-50 text-slate-800', badge: 'bg-amber-400 text-amber-950' },
  { role: 'Teacher', title: 'កត់ត្រាវត្តមានពេលយប់', summary: 'Teacher ស្កេន Magic QR របស់បន្ទប់ ដើម្បីគ្រប់គ្រង roster និងកត់ត្រាវត្តមាន។', steps: ['ស្កេន Magic QR នៅបន្ទប់', 'កត់ត្រា មានវត្តមាន / អវត្តមាន / សុំច្បាប់', 'តាមដានប្រវត្តិវត្តមានតាមកាលបរិច្ឆេទ'], icon: QrCode, tone: 'border-sky-300 bg-sky-50 text-slate-800', badge: 'bg-sky-400 text-sky-950' },
  { role: 'Student', title: 'ស្នើសុំបន្ទប់ និងគ្រប់គ្រងសេវារបស់ខ្លួន', summary: 'Student មើលបន្ទប់ បង់វិក្កយបត្រ KHQR ដាក់ពាក្យស្នើសុំ និងរាយការណ៍ការជួសជុល។', steps: ['ដាក់ពាក្យស្នាក់នៅតាមឌីជីថល', 'ពិនិត្យបន្ទប់ និងអ្នករួមបន្ទប់', 'បញ្ជាក់ការបង់ KHQR និងដាក់សំណើជួសជុល'], icon: Receipt, tone: 'border-rose-300 bg-rose-50 text-slate-800', badge: 'bg-rose-400 text-rose-950' },
];

const features = [
  {
    title: "ការចាត់បន្ទប់ស្វ័យប្រវត្តិ",
    detail: "បែងចែកនិស្សិតតាមកម្រិតសិក្សា ជំនាញ ភេទ និងសមត្ថភាពបន្ទប់ ដើម្បីគ្រប់គ្រងការស្នាក់នៅយ៉ាងមានរបៀប។",
    icon: Building2,
    iconStyle: "bg-emerald-100 text-[#147a5b]",
  },
  {
    title: "ស្រង់វត្តមាន Magic QR",
    detail: "ស្កេន QR Code នៅបន្ទប់ ដើម្បីកត់ត្រាវត្តមានយប់បានរហ័ស និងផ្តល់ទិន្នន័យច្បាស់លាស់។",
    icon: QrCode,
    iconStyle: "bg-amber-100 text-amber-700",
  },
  {
    title: "Smart Split Bill (KHQR)",
    detail: "គណនាថ្លៃទឹកភ្លើងពីកុងទ័រ ចែកតម្លៃតាមអ្នកស្នាក់នៅសកម្ម និងបង្កើតលេខយោង KHQR។",
    icon: Receipt,
    iconStyle: "bg-sky-100 text-sky-700",
  },
  {
    title: "រាយការណ៍ជួសជុលបន្ទប់",
    detail: "និស្សិតអាចដាក់សំណើសម្រាប់ឧបករណ៍ខូច ខណៈអ្នកគ្រប់គ្រងតាមដាន និងដោះស្រាយបានទាន់ពេល។",
    icon: Wrench,
    iconStyle: "bg-rose-100 text-rose-700",
  },
];

const homepageDefaults = {
  ticker: { text: "ដំណឹងអាហារូបករណ៍ ឆ្នាំសិក្សា ២០២៥–២០២៦", link: "https://ksit.edu.kh/category/scholarship/" },
  deadline: { title: "📢 សេចក្តីជូនដំណឹងសំខាន់៖ ការទទួលពាក្យសុំស្នាក់នៅអន្តេវាសិកដ្ឋាននិស្សិត ឆ្នាំសិក្សា ២០២៦-២០២៧ នឹងត្រូវផុតកំណត់នៅថ្ងៃទី ៣១ ខែសីហា ឆ្នាំ២០២៦ វេលាម៉ោង ១៧:០០ ជាកំហិត!", badge: "នៅសល់ ១៧ ថ្ងៃទៀត · កំណត់ត្រឹម ៣១ សីហា ២០២៦ · ១៧:០០", deadline_at: "2026-08-31T17:00:00+07:00" },
  hero: { title: 'ប្រព័ន្ធគ្រប់គ្រងការស្នាក់នៅអន្តេវាសិកដ្ឋាននិស្សិត KSIT', subtitle: 'គ្រប់គ្រងការដាក់ពាក្យស្នើសុំបន្ទប់ ការចាត់បន្ទប់ស្វ័យប្រវត្តិ ថ្លៃទឹកភ្លើងតាម KHQR វត្តមានតាម Magic QR និងសំណើជួសជុល នៅក្នុងប្រព័ន្ធឌីជីថលតែមួយ។', background: '', primary_cta_label: 'ចូលប្រើប្រាស់ប្រព័ន្ធ', primary_cta_url: '/login', secondary_cta_label: 'ស្វែងយល់ពីមុខងារ', secondary_cta_url: '#features' },
  footer: { address: 'ផ្លូវជាតិលេខ ៤៤ ស្រុកថ្ពង ខេត្តកំពង់ស្ពឺ', phones: '089 511 383 / 092 740 222', email: 'info@ksit.edu.kh', quick_links: [{ label: 'គេហទំព័រផ្លូវការ KSIT', url: 'https://ksit.edu.kh/' }, { label: 'ដំណឹងអាហារូបករណ៍', url: 'https://ksit.edu.kh/category/scholarship/' }, { label: 'ចូលប្រើប្រាស់ប្រព័ន្ធអន្តេវាសិកដ្ឋាន', url: '/login' }] },
};

type PublicNewsPost = { id: string; title: string; body: string; image_url?: string | null; external_url?: string | null; published_at: string };

export default function HomePage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [ticker, setTicker] = useState(homepageDefaults.ticker);
  const [deadline, setDeadline] = useState(homepageDefaults.deadline);
  const [newsPosts, setNewsPosts] = useState<PublicNewsPost[]>([]);
  const [hero, setHero] = useState(homepageDefaults.hero);
  const [featureCards, setFeatureCards] = useState(features);
  const [footer, setFooter] = useState(homepageDefaults.footer);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    void fetch(`${baseUrl}/api/public/announcements`).then((response) => response.ok ? response.json() : null).then((payload) => {
      const settings = payload?.data?.settings;
      if (settings?.top_ticker?.text) setTicker({ text: settings.top_ticker.text, link: settings.top_ticker.link || homepageDefaults.ticker.link });
      if (settings?.registration_deadline?.title && settings.registration_deadline?.deadline_at) setDeadline({ title: settings.registration_deadline.title, badge: settings.registration_deadline.badge || "", deadline_at: settings.registration_deadline.deadline_at });
      if (settings?.homepage_hero?.title) setHero({ ...homepageDefaults.hero, ...settings.homepage_hero });
      if (Array.isArray(settings?.homepage_features) && settings.homepage_features.length === 4) setFeatureCards(features.map((feature, index) => ({ ...feature, ...settings.homepage_features[index] })));
      if (settings?.footer_contact?.address) setFooter({ ...homepageDefaults.footer, ...settings.footer_contact });
      if (Array.isArray(payload?.data?.news_posts)) setNewsPosts(payload.data.news_posts);
    }).catch(() => undefined);
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const deadlineTime = new Date(deadline.deadline_at).getTime();
  const remainingDays = Math.max(0, Math.ceil((deadlineTime - now) / 86_400_000));
  const deadlineBadge = remainingDays > 0 ? `នៅសល់ ${remainingDays} ថ្ងៃទៀត` : deadline.badge || "កាលកំណត់បានផុត";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <div className="border-b border-emerald-800 bg-[#147a5b] px-4 py-2 text-xs text-white sm:text-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <a href={ticker.link} target="_blank" rel="noreferrer" className="font-semibold underline-offset-4 hover:underline">
            {ticker.text}
          </a>
          <div className="hidden items-center gap-4 text-xs text-emerald-100 md:flex">
            <span className="flex items-center gap-1"><Phone className="size-3.5" /> {footer.phones}</span>
            <span className="flex items-center gap-1"><Mail className="size-3.5" /> {footer.email}</span>
          </div>
        </div>
      </div>

      <header className="border-b border-slate-100 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Image src="/ksit-logo.png" alt="វិទ្យាស្ថានបច្ចេកវិទ្យាកំពង់ស្ពឺ" width={80} height={80} priority className="size-14 shrink-0 object-contain sm:size-20" />
            <span className="min-w-0">
              <span className="block truncate text-base font-extrabold leading-tight text-[#147a5b] sm:text-xl md:text-2xl">ប្រព័ន្ធគ្រប់គ្រងការស្នាក់នៅអន្តេវាសិកដ្ឋាននិស្សិត KSIT</span>
              <span className="mt-0.5 block truncate text-[10px] font-bold tracking-[0.08em] text-[#147a5b] sm:text-sm">KSIT DORMITORY MANAGEMENT SYSTEM</span>
            </span>
          </Link>
          <Link href="/login" className="hidden items-center gap-2 rounded-lg bg-[#147a5b] px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#0f6047] md:flex">
            <LogIn className="size-4 text-emerald-200" /> ចូលប្រើប្រាស់
          </Link>
          <button type="button" aria-label={mobileOpen ? "បិទម៉ឺនុយ" : "បើកម៉ឺនុយ"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)} className="rounded-lg p-2 text-[#147a5b] hover:bg-emerald-50 lg:hidden">
            {mobileOpen ? <X className="size-7" /> : <Menu className="size-7" />}
          </button>
        </div>
      </header>

      <nav aria-label="ម៉ឺនុយមេ" className="sticky top-0 z-40 hidden bg-[#147a5b] text-white shadow-md lg:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <ul className="flex items-center text-sm font-bold">
            <li><Link href="/" className="block px-5 py-3 hover:bg-[#0f6047]">ទំព័រដើម</Link></li>
            <li className="group relative">
              <button type="button" className="flex items-center gap-1 px-5 py-3 hover:bg-[#0f6047]">កម្មវិធីសិក្សា <ChevronDown className="size-4 text-emerald-200" /></button>
              <div className="invisible absolute left-0 top-full w-64 border border-slate-200 bg-white py-2 text-xs text-slate-800 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100">
                <a href="https://ksit.edu.kh/bachelor-2019/" target="_blank" rel="noreferrer" className="block px-4 py-2.5 hover:bg-emerald-50 hover:text-[#147a5b]">ថ្នាក់បរិញ្ញាបត្រ</a>
                <a href="https://ksit.edu.kh/form2018/" target="_blank" rel="noreferrer" className="block px-4 py-2.5 hover:bg-emerald-50 hover:text-[#147a5b]">ថ្នាក់បរិញ្ញាបត្ររង</a>
                <a href="https://ksit.edu.kh/category/scholarship/" target="_blank" rel="noreferrer" className="block px-4 py-2.5 hover:bg-emerald-50 hover:text-[#147a5b]">អាហារូបករណ៍</a>
              </div>
            </li>
            <li className="group relative">
              <button type="button" className="flex items-center gap-1 px-5 py-3 hover:bg-[#0f6047]">ព័ត៌មានសម្រាប់និស្សិត <ChevronDown className="size-4 text-emerald-200" /></button>
              <div className="invisible absolute left-0 top-full w-72 border border-slate-200 bg-white py-2 text-xs text-slate-800 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100">
                <Link href="/login" className="block bg-emerald-50 px-4 py-2.5 font-bold text-[#147a5b] hover:bg-emerald-100">ប្រព័ន្ធគ្រប់គ្រងអន្តេវាសិកដ្ឋាន</Link>
                <a href="https://ksit.edu.kh/category/scholarship/" target="_blank" rel="noreferrer" className="block px-4 py-2.5 hover:bg-emerald-50 hover:text-[#147a5b]">អាហារូបករណ៍ ១០០%</a>
              </div>
            </li>
            <li className="group relative">
              <button type="button" aria-haspopup="true" className="flex items-center gap-1 px-5 py-3 hover:bg-[#0f6047]">អំពីប្រព័ន្ធ <ChevronDown className="size-4 text-emerald-200" /></button>
              <div className="invisible absolute left-0 top-full w-80 border border-slate-200 bg-white py-2 text-xs text-slate-800 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                <Link href="/docs" className="block px-4 py-3 hover:bg-emerald-50 hover:text-[#147a5b]"><span className="font-bold">📖 ឯកសារណែនាំប្រព័ន្ធ</span><span className="mt-0.5 block text-slate-500">System Documentation</span></Link>
                <Link href="/features" className="block px-4 py-3 hover:bg-emerald-50 hover:text-[#147a5b]"><span className="font-bold">🚀 មុខងារស្នូលនៃប្រព័ន្ធ</span><span className="mt-0.5 block text-slate-500">Core Features &amp; Guides</span></Link>
                <Link href="/changelog" className="block px-4 py-3 hover:bg-emerald-50 hover:text-[#147a5b]"><span className="font-bold">📢 កំណត់ត្រាកំណែទម្រង់</span><span className="mt-0.5 block text-slate-500">Changelog &amp; Latest Updates</span></Link>
              </div>
            </li>
            <li><Link href="/features" className="block px-5 py-3 hover:bg-[#0f6047]">មុខងារប្រព័ន្ធ</Link></li>
            <li><a href="#contact" className="block px-5 py-3 hover:bg-[#0f6047]">ទំនាក់ទំនង</a></li>
          </ul>
        </div>
      </nav>

      {mobileOpen && (
        <nav aria-label="ម៉ឺនុយទូរស័ព្ទ" className="border-t border-emerald-600 bg-[#147a5b] px-4 py-3 text-sm font-semibold text-white lg:hidden">
          <div className="mx-auto max-w-7xl space-y-1">
            <Link href="/" onClick={() => setMobileOpen(false)} className="block border-b border-emerald-700 py-2.5">ទំព័រដើម</Link>
            <a href="https://ksit.edu.kh/category/scholarship/" target="_blank" rel="noreferrer" className="block border-b border-emerald-700 py-2.5">កម្មវិធីសិក្សា និងអាហារូបករណ៍</a>
            <Link href="/features" onClick={() => setMobileOpen(false)} className="block border-b border-emerald-700 py-2.5">មុខងារប្រព័ន្ធ</Link>
            <p className="pt-2 text-xs font-bold uppercase tracking-wider text-emerald-200">អំពីប្រព័ន្ធ</p>
            <Link href="/docs" onClick={() => setMobileOpen(false)} className="block border-b border-emerald-700 py-2.5">📖 ឯកសារណែនាំប្រព័ន្ធ</Link>
            <Link href="/features" onClick={() => setMobileOpen(false)} className="block border-b border-emerald-700 py-2.5">🚀 មុខងារស្នូលនៃប្រព័ន្ធ</Link>
            <Link href="/changelog" onClick={() => setMobileOpen(false)} className="block border-b border-emerald-700 py-2.5">📢 កំណត់ត្រាកំណែទម្រង់</Link>
            <a href="#contact" onClick={() => setMobileOpen(false)} className="block border-b border-emerald-700 py-2.5">ទំនាក់ទំនង</a>
            <Link href="/login" onClick={() => setMobileOpen(false)} className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 py-3 font-bold text-slate-950"><LogIn className="size-4" /> ចូលប្រើប្រាស់ប្រព័ន្ធ</Link>
          </div>
        </nav>
      )}

      <section style={hero.background ? { background: hero.background } : undefined} className="overflow-hidden bg-[radial-gradient(circle_at_75%_20%,rgba(255,255,255,0.16),transparent_25%),linear-gradient(135deg,#147a5b_0%,#0f6047_55%,#0f172a_100%)] px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-12">
          <div className="text-center lg:col-span-7 lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold text-amber-300"><Award className="size-4" /> គ្រឹះស្ថានឧត្តមសិក្សាសាធារណៈ សម្រាប់និស្សិត KSIT</div>
            <h1 className="mt-6 text-4xl font-black leading-tight sm:text-5xl xl:text-6xl">{hero.title}</h1>
            <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-emerald-100 sm:text-base lg:mx-0">{hero.subtitle}</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Link href={hero.primary_cta_url || '/login'} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-7 py-3.5 text-sm font-bold text-slate-950 shadow-lg hover:bg-amber-500 sm:text-base">{hero.primary_cta_label} <ChevronRight className="size-4" /></Link>
              <Link href="/features" className="rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-center text-sm font-semibold hover:bg-white/20 sm:text-base">{hero.secondary_cta_label}</Link>
            </div>
          </div>
          <aside aria-label="ការចូលប្រើប្រាស់តាមតួនាទី" className="rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-sm lg:col-span-5">
            <h2 className="flex items-center gap-2 border-b border-white/15 pb-3 text-base font-bold text-amber-300"><Users className="size-5" /> ការចូលប្រើប្រាស់តាមតួនាទី</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              {roles.map((role) => <Link key={role.name} href="/login" className="rounded-xl border border-white/15 bg-white/10 p-3.5 hover:bg-white/20"><span className={`block text-sm font-bold ${role.tone}`}>{role.name}</span><span className="mt-1 block leading-5 text-slate-200">{role.detail}</span></Link>)}
            </div>
          </aside>
        </div>
      </section>

      <section aria-label="សេចក្តីជូនដំណឹងអំពីថ្ងៃផុតកំណត់ដាក់ពាក្យ" className="border-b border-amber-200 bg-[linear-gradient(90deg,#fff8df,#fffef8,#f6fdf7)] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 rounded-2xl border border-amber-300/80 bg-white/80 p-4 shadow-sm backdrop-blur-sm lg:flex-row lg:items-center lg:p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-900"><BellRing className="size-5" /></span>
            <div>
              <p className="text-sm font-extrabold leading-6 text-slate-900">{deadline.title}</p>
              <span className="mt-2 inline-flex rounded-full bg-[#147a5b] px-3 py-1 text-xs font-bold text-white">{deadlineBadge}{deadline.badge ? ` · ${deadline.badge}` : ''}</span>
            </div>
          </div>
          <Link href="/login" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#147a5b] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0f6047]">ដាក់ពាក្យឥឡូវនេះ <ChevronRight className="size-4" /></Link>
        </div>
      </section>

      {newsPosts.length > 0 && <section aria-label="ព័ត៌មាន និងសេចក្តីជូនដំណឹង" className="border-b border-emerald-100 bg-white px-4 py-7 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="mb-4 flex items-center gap-2"><BellRing className="size-5 text-[#147a5b]" /><h2 className="font-serif text-xl font-extrabold text-slate-900">ព័ត៌មាន និងសេចក្តីជូនដំណឹង</h2></div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{newsPosts.map((post) => <article key={post.id} className="overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">{post.image_url && <img src={post.image_url} alt="" className="mb-3 h-32 w-full rounded-lg object-cover" />}<p className="text-[11px] font-bold uppercase tracking-wider text-[#147a5b]">{new Date(post.published_at).toLocaleDateString()}</p><h3 className="mt-2 text-sm font-extrabold text-slate-900">{post.title}</h3>{post.body && <p className="mt-2 text-xs leading-5 text-slate-600">{post.body}</p>}{post.external_url && <a href={post.external_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-bold text-[#147a5b] hover:underline">អានបន្ថែម →</a>}</article>)}</div></div></section>}

      <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center"><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#147a5b]">Smart Campus Features</span><h2 className="mt-4 font-serif text-3xl font-extrabold text-slate-900">មុខងារស្នូលនៃប្រព័ន្ធអន្តេវាសិកដ្ឋាន</h2><p className="mt-3 text-sm leading-6 text-slate-600">រចនាឡើងដើម្បីធ្វើឱ្យការគ្រប់គ្រង និងការរស់នៅរបស់និស្សិតមានភាពច្បាស់លាស់ សុវត្ថិភាព និងទាន់ពេល។</p></div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {featureCards.map((feature) => { const Icon = feature.icon; return <article key={feature.title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"><div className={`flex size-12 items-center justify-center rounded-lg ${feature.iconStyle}`}><Icon className="size-6" /></div><h3 className="mt-4 text-base font-bold text-slate-800">{feature.title}</h3><p className="mt-2 text-xs leading-5 text-slate-600">{feature.detail}</p></article>; })}
        </div>
        <div className="mt-16 border-t border-emerald-100 pt-14">
          <div className="max-w-3xl"><span className="rounded-full bg-[#147a5b] px-3 py-1 text-xs font-bold text-white">SYSTEM GUIDE</span><h2 className="mt-4 text-3xl font-extrabold text-slate-900">របៀបប្រើប្រាស់ប្រព័ន្ធតាមតួនាទី</h2><p className="mt-3 text-sm leading-6 text-slate-600">អូសផ្តេកដើម្បីមើលជំហានសំខាន់ៗសម្រាប់តួនាទីនីមួយៗ ឬប្រើ scroll bar ខាងក្រោម។</p></div>
          <div className="mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-5 [scrollbar-color:#147a5b_#e9f3eb] [scrollbar-width:thin]">
            {roleWalkthrough.map((slide, index) => { const Icon = slide.icon; return <article key={slide.role} className={`min-w-[min(88vw,440px)] snap-start rounded-3xl border p-7 shadow-sm ${slide.tone}`}><div className="flex items-center justify-between"><span className={`inline-flex size-11 items-center justify-center rounded-2xl font-black ${slide.badge}`}>0{index + 1}</span><Icon className="size-8" /></div><p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] opacity-70">{slide.role} Portal</p><h3 className="mt-3 text-2xl font-extrabold leading-tight">{slide.title}</h3><p className="mt-4 text-sm leading-7 opacity-85">{slide.summary}</p><ol className="mt-6 space-y-3">{slide.steps.map((step, stepIndex) => <li key={step} className="flex gap-3 text-sm leading-6"><span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${slide.badge}`}>{stepIndex + 1}</span>{step}</li>)}</ol><Link href="/login" className="mt-8 inline-flex items-center gap-2 text-sm font-bold underline underline-offset-4">ចូលប្រើប្រាស់ជា {slide.role} <ChevronRight className="size-4" /></Link></article>; })}
          </div>
        </div>
      </section>

      <section className="border-y border-emerald-100 bg-emerald-50 px-4 py-10 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3"><div className="flex items-start gap-3"><ShieldCheck className="mt-1 size-6 shrink-0 text-[#147a5b]" /><div><h2 className="font-bold text-slate-900">សិទ្ធិចូលប្រើប្រាស់ច្បាស់លាស់</h2><p className="mt-1 text-sm leading-6 text-slate-600">តួនាទី Admin, Manager, Teacher និង Student មានផ្ទាំងការងារសមស្របតាមភារកិច្ច។</p></div></div><div className="flex items-start gap-3"><GraduationCap className="mt-1 size-6 shrink-0 text-[#147a5b]" /><div><h2 className="font-bold text-slate-900">ផ្តោតលើនិស្សិត</h2><p className="mt-1 text-sm leading-6 text-slate-600">និស្សិតអាចតាមដានបន្ទប់ វិក្កយបត្រ និងសំណើជួសជុលរបស់ខ្លួនបានដោយផ្ទាល់។</p></div></div><div className="flex items-start gap-3"><Receipt className="mt-1 size-6 shrink-0 text-[#147a5b]" /><div><h2 className="font-bold text-slate-900">ការទូទាត់មានតម្លាភាព</h2><p className="mt-1 text-sm leading-6 text-slate-600">ការបែងចែកថ្លៃសេវាពឹងផ្អែកលើអ្នកស្នាក់នៅ និងការប្រើប្រាស់ជាក់ស្តែង។</p></div></div></div></section>

      <footer id="contact" className="bg-slate-900 px-4 py-12 text-xs text-slate-400 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-2 lg:grid-cols-3"><div><div className="flex items-center gap-2"><Image src="/ksit-logo.png" alt="KSIT Logo" width={36} height={36} className="object-contain" /><h2 className="text-sm font-bold text-white">វិទ្យាស្ថានបច្ចេកវិទ្យាកំពង់ស្ពឺ</h2></div><p className="mt-3 max-w-md leading-6">គ្រឹះស្ថានឧត្តមសិក្សាសាធារណៈ ស្ថិតក្រោមឱវាទក្រសួងអប់រំ យុវជន និងកីឡា។ ទំព័រនេះគាំទ្រប្រព័ន្ធគ្រប់គ្រងអន្តេវាសិកដ្ឋាននិស្សិត KSIT។</p><p className="mt-3">© 2026 Kampong Speu Institute of Technology (KSIT).</p></div><div><h2 className="text-sm font-bold text-white">ទំនាក់ទំនងផ្លូវការ</h2><p className="mt-3 flex items-start gap-2 leading-6"><MapPin className="mt-0.5 size-4 shrink-0 text-emerald-400" /> {footer.address}</p><p className="mt-2 flex items-center gap-2"><Phone className="size-4 text-emerald-400" /> {footer.phones}</p><p className="mt-2 flex items-center gap-2"><Mail className="size-4 text-emerald-400" /> {footer.email}</p></div><div><h2 className="text-sm font-bold text-white">តំណភ្ជាប់សំខាន់ៗ</h2><div className="mt-3 space-y-2 leading-5">{footer.quick_links.map((link) => <a key={`${link.label}-${link.url}`} href={link.url} target={link.url.startsWith('http') ? '_blank' : undefined} rel={link.url.startsWith('http') ? 'noreferrer' : undefined} className="block hover:text-emerald-300">{link.label}</a>)}</div></div></div></footer>
    </main>
  );
}
