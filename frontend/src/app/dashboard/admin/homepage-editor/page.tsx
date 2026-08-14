'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Save, Settings2 } from 'lucide-react';
import { PortalShell } from '@/components/portal-shell';
import { DashboardRoleGuardLoading, useRoleGuard } from '@/components/role-guard';

type Settings = Record<string, unknown>;
type NewsPost = { id: string; title: string; body: string; image_url?: string | null; external_url?: string | null; is_visible: boolean; published_at: string };
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function request(path: string, init?: RequestInit) {
  const token = window.localStorage.getItem('ksit_session_token');
  const response = await fetch(`${apiUrl}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers || {}) } });
  return response.json();
}

export default function HomepageEditor() {
  const { isAuthorized, isChecking } = useRoleGuard('admin');
  const [settings, setSettings] = useState<Settings>({});
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await request('/api/announcements');
    if (response.success) { setSettings(response.data.settings || {}); setPosts(response.data.news_posts || []); }
  }
  useEffect(() => {
    if (!isAuthorized) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [isAuthorized]);

  async function save(formData: FormData) {
    setBusy(true);
    try {
      const response = await request('/api/announcements/settings', { method: 'PUT', body: JSON.stringify({
        top_ticker: { text: String(formData.get('ticker_text') || ''), link: String(formData.get('ticker_link') || '') },
        registration_deadline: { title: String(formData.get('deadline_title') || ''), badge: String(formData.get('deadline_badge') || ''), deadline_at: new Date(String(formData.get('deadline_at'))).toISOString() },
        homepage_hero: JSON.parse(String(formData.get('homepage_hero') || '{}')),
        homepage_features: JSON.parse(String(formData.get('homepage_features') || '[]')),
        footer_contact: JSON.parse(String(formData.get('footer_contact') || '{}')),
      }) });
      setNotice(response.success ? 'Homepage settings saved. Refresh the public homepage to review them.' : response.error?.message || 'Unable to save settings.');
      if (response.success) await load();
    } catch { setNotice('Check the JSON fields before saving.'); }
    setBusy(false);
  }
  async function submitNews(formData: FormData) {
    setBusy(true);
    const response = await request('/api/announcements/news', { method: 'POST', body: JSON.stringify({ title: String(formData.get('title') || ''), body: String(formData.get('body') || ''), image_url: String(formData.get('image_url') || ''), external_url: String(formData.get('external_url') || ''), is_visible: formData.get('is_visible') === 'on', published_at: new Date().toISOString() }) });
    setNotice(response.success ? 'News post created.' : response.error?.message || 'Unable to create news post.');
    if (response.success) { formData.set('title', ''); await load(); }
    setBusy(false);
  }
  async function toggle(post: NewsPost) { const response = await request(`/api/announcements/news/${post.id}`, { method: 'PATCH', body: JSON.stringify({ is_visible: !post.is_visible }) }); setNotice(response.success ? 'News visibility updated.' : response.error?.message || 'Unable to update post.'); if (response.success) await load(); }
  async function remove(post: NewsPost) { if (!window.confirm(`Delete “${post.title}”?`)) return; const response = await request(`/api/announcements/news/${post.id}`, { method: 'DELETE' }); setNotice(response.success ? 'News post deleted.' : response.error?.message || 'Unable to delete post.'); if (response.success) await load(); }

  if (isChecking) return <DashboardRoleGuardLoading />;
  if (!isAuthorized) return null;
  const ticker = (settings.top_ticker || {}) as { text?: string; link?: string };
  const deadline = (settings.registration_deadline || {}) as { title?: string; badge?: string; deadline_at?: string };
  return <PortalShell role="admin"><section className="min-h-[calc(100vh-156px)]"><div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2 text-[#0b5c2c]"><Settings2 className="size-5" /><span className="text-xs font-bold uppercase tracking-wide">Homepage CMS</span></div><h1 className="mt-2 text-[29px] font-extrabold">🎨 Edit Homepage / កែប្រែគេហទំព័រ</h1><p className="mt-1.5 text-sm text-[#68736c]">Manage public content while preserving the existing KSIT design system.</p></div><a href="/" target="_blank" className="inline-flex items-center gap-2 rounded-lg border border-[#dce3dc] px-3 py-2 text-xs font-bold text-[#31513d]"><ExternalLink className="size-4" />Open homepage</a></div>{notice && <p className="mb-5 rounded-xl bg-[#edf7ee] px-4 py-3 text-sm text-[#16582b]">{notice}</p>}<form action={save} className="grid gap-6 xl:grid-cols-2"><EditorCard title="Top ticker"><Field label="Ticker text" name="ticker_text" defaultValue={ticker.text} /><Field label="Ticker hyperlink" name="ticker_link" defaultValue={ticker.link} /></EditorCard><EditorCard title="Registration deadline"><Field label="Banner title" name="deadline_title" defaultValue={deadline.title} /><Field label="Deadline date/time" name="deadline_at" type="datetime-local" defaultValue={deadline.deadline_at ? new Date(deadline.deadline_at).toISOString().slice(0, 16) : ''} /><Field label="Status badge" name="deadline_badge" defaultValue={deadline.badge} /></EditorCard><JsonCard title="Hero section" name="homepage_hero" value={settings.homepage_hero} /><JsonCard title="Four feature cards" name="homepage_features" value={settings.homepage_features} /><JsonCard title="Contact, footer & quick links" name="footer_contact" value={settings.footer_contact} /><div className="xl:col-span-2 flex justify-end"><button disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-[#0b5c2c] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Save className="size-4" />{busy ? 'Saving…' : 'Save homepage settings'}</button></div></form><section className="ksit-card mt-8 p-6"><h2 className="text-lg font-bold">News & Posts Manager</h2><form action={submitNews} className="mt-5 grid gap-3 md:grid-cols-2"><Field label="Post title" name="title" required /><Field label="Image URL" name="image_url" /><Field label="External article link" name="external_url" /><label className="flex items-end gap-2 pb-2 text-sm"><input name="is_visible" type="checkbox" defaultChecked />Publish publicly</label><label className="md:col-span-2 text-sm font-medium">Description<textarea name="body" className="mt-1.5 min-h-24 w-full rounded-xl border border-[#dce3dc] p-3" /></label><button disabled={busy} className="w-fit rounded-lg bg-[#0b5c2c] px-4 py-2 text-sm font-bold text-white">Create news post</button></form><div className="mt-6 divide-y divide-[#edf0ed]">{posts.map((post) => <div className="flex flex-wrap items-center justify-between gap-4 py-4" key={post.id}><div><p className="font-semibold">{post.title}</p><p className="mt-1 text-xs text-[#68736c]">{post.is_visible ? 'Visible' : 'Hidden'} · {new Date(post.published_at).toLocaleDateString()}</p></div><div className="flex gap-2"><button onClick={() => void toggle(post)} className="rounded-lg border px-3 py-1.5 text-xs font-bold">{post.is_visible ? 'Hide' : 'Show'}</button><button onClick={() => void remove(post)} className="rounded-lg border border-[#f2cfca] px-3 py-1.5 text-xs font-bold text-[#ad4939]">Delete</button></div></div>)}</div></section></section></PortalShell>;
}

function EditorCard({ title, children }: { title: string; children: React.ReactNode }) { return <section className="ksit-card p-6"><h2 className="text-lg font-bold">{title}</h2><div className="mt-4 space-y-4">{children}</div></section>; }
function Field({ label, name, defaultValue, type = 'text', required }: { label: string; name: string; defaultValue?: string; type?: string; required?: boolean }) { return <label className="block text-sm font-medium">{label}<input name={name} type={type} defaultValue={defaultValue} required={required} className="mt-1.5 h-10 w-full rounded-xl border border-[#dce3dc] px-3" /></label>; }
function JsonCard({ title, name, value }: { title: string; name: string; value: unknown }) { return <EditorCard title={title}><label className="block text-xs text-[#68736c]">Structured CMS data (JSON)<textarea name={name} defaultValue={JSON.stringify(value || {}, null, 2)} className="mt-2 min-h-64 w-full rounded-xl border border-[#dce3dc] p-3 font-mono text-xs" /></label></EditorCard>; }
