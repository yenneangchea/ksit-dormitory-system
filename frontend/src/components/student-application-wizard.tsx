'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Download, FileText, Loader2, UploadCloud } from 'lucide-react';
import { applicationsAPI } from '@/lib/api';
import type { ApplicationEducation, ApplicationEmergencyContact, ApplicationSibling, RoomApplication } from '@/types';

type FormState = Record<string, string | boolean>;

const formSections = [
  { id: 1, title: '១. ពាក្យសុំចូលស្នាក់នៅ' },
  { id: 2, title: '២. ជីវប្រវត្តិសង្ខេប' },
  { id: 3, title: '៣. កិច្ចសន្យាសាមីជន' },
  { id: 4, title: '៤. លិខិតធានាអាណាព្យាបាល' },
];

const workflow = [
  { id: 1, label: 'បំពេញទម្រង់' },
  { id: 2, label: 'ឯកសារយោង' },
  { id: 3, label: 'ទាញ PDF' },
  { id: 4, label: 'ផ្ទុកឯកសារចុះហត្ថលេខា' },
  { id: 5, label: 'ស្ថានភាព' },
];

function firstProfile(application: RoomApplication | null) {
  const profile = application?.academic_profiles || application?.users?.academic_profiles;
  return Array.isArray(profile) ? profile[0] || null : profile || null;
}

function initialForm(application: RoomApplication | null): FormState {
  const profile = (firstProfile(application) || {}) as Record<string, unknown>;
  const user = application?.users;
  const stored = application?.form_data_json || {};
  const fields = ['student_id_card', 'major', 'academic_year', 'class_section', 'scholarship_type', 'date_of_birth', 'place_of_birth', 'national_id_number', 'current_address', 'father_name', 'father_age', 'father_occupation', 'father_phone', 'father_address', 'mother_name', 'mother_age', 'mother_occupation', 'mother_phone', 'mother_address', 'guarantor_name', 'guarantor_relation', 'guarantor_phone', 'guarantor_address', 'ethnicity', 'nationality', 'marital_status', 'spouse_name', 'spouse_occupation'];
  const output: FormState = { full_name_khmer: String(user?.full_name_khmer || ''), full_name_latin: String(user?.full_name_latin || ''), gender: String(user?.gender || ''), phone: String(user?.phone || ''), email: String(user?.email || ''), accept_conduct: Boolean(stored.accept_conduct), acknowledge_accuracy: Boolean(stored.acknowledge_accuracy), guardian_consent: Boolean(stored.guardian_consent) };
  fields.forEach((field) => { output[field] = String(stored[field] ?? profile[field] ?? ''); });
  if (!output.ethnicity) output.ethnicity = 'ខ្មែរ';
  if (!output.nationality) output.nationality = 'កម្ពុជា';
  if (!output.marital_status) output.marital_status = 'នៅលីវ';
  if (!output.academic_year) output.academic_year = '1';
  return output;
}

function initialSiblings(application: RoomApplication | null): ApplicationSibling[] {
  const stored = application?.form_data_json?.siblings_json;
  const profile = firstProfile(application)?.siblings_json;
  const value = Array.isArray(stored) ? stored : Array.isArray(profile) ? profile : [];
  return value.length ? value as ApplicationSibling[] : [{ name: '', gender: '', date_of_birth: '', occupation: '', address: '' }];
}

function initialEducation(application: RoomApplication | null): ApplicationEducation[] {
  const stored = application?.form_data_json?.education_history_json;
  const profile = firstProfile(application)?.education_history_json;
  const value = Array.isArray(stored) ? stored : Array.isArray(profile) ? profile : [];
  return value.length ? value as ApplicationEducation[] : [
    { level: 'បឋមសិក្សា', school: '', province: '', year: '', certificate: '', grade: '' },
    { level: 'មធ្យមសិក្សាបឋមភូមិ', school: '', province: '', year: '', certificate: '', grade: '' },
    { level: 'មធ្យមសិក្សាទុតិយភូមិ', school: '', province: '', year: '', certificate: '', grade: '' },
  ];
}

function initialContacts(application: RoomApplication | null): ApplicationEmergencyContact[] {
  const stored = application?.form_data_json?.emergency_contacts_json;
  const profile = firstProfile(application)?.emergency_contacts_json;
  const value = Array.isArray(stored) ? stored : Array.isArray(profile) ? profile : [];
  return value.length ? value as ApplicationEmergencyContact[] : [{ name: '', relation: '', phone: '', address: '' }, { name: '', relation: '', phone: '', address: '' }];
}

function stageFor(application: RoomApplication | null) {
  if (!application) return 1;
  if (application.status === 'pending_signed_doc') return 3;
  if (application.status === 'under_review' || application.status === 'approved' || application.status === 'rejected' || application.status === 'assigned') return 5;
  if (application.submission_step && application.submission_step >= 2) return 2;
  return 1;
}

export function StudentApplicationWizard({ applications, onUpdated }: { applications: RoomApplication[]; onUpdated: () => Promise<void> }) {
  const [application, setApplication] = useState<RoomApplication | null>(applications[0] || null);
  const [stage, setStage] = useState(stageFor(applications[0] || null));
  const [section, setSection] = useState(1);
  const [form, setForm] = useState<FormState>(() => initialForm(applications[0] || null));
  const [siblings, setSiblings] = useState<ApplicationSibling[]>(() => initialSiblings(applications[0] || null));
  const [education, setEducation] = useState<ApplicationEducation[]>(() => initialEducation(applications[0] || null));
  const [contacts, setContacts] = useState<ApplicationEmergencyContact[]>(() => initialContacts(applications[0] || null));
  const [files, setFiles] = useState<Record<string, File | null>>({ student_photo: null, national_id: null, family_book: null, signed_application: null });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const latest = applications[0] || null;
      setApplication(latest);
      setStage(stageFor(latest));
      setForm(initialForm(latest));
      setSiblings(initialSiblings(latest));
      setEducation(initialEducation(latest));
      setContacts(initialContacts(latest));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [applications]);

  const status = application?.status || 'draft';
  const profilePayload = useMemo(() => ({ ...form, academic_year: Number(form.academic_year || 0), father_age: form.father_age ? Number(form.father_age) : null, mother_age: form.mother_age ? Number(form.mother_age) : null, siblings_json: siblings.filter((row) => row.name?.trim()), education_history_json: education.filter((row) => row.level?.trim()), emergency_contacts_json: contacts.filter((row) => row.name?.trim()) }), [form, siblings, education, contacts]);

  const updateForm = (name: string, value: string | boolean) => setForm((current) => ({ ...current, [name]: value }));
  async function saveDraft(nextStage = 2) {
    setBusy(true);
    const response = await applicationsAPI.saveDraft({ academic_year_applied: String(form.academic_year_applied || '2025-2026'), form_data: { ...form, siblings_json: siblings, education_history_json: education, emergency_contacts_json: contacts } });
    setBusy(false);
    if (!response.success || !response.data) { setNotice(response.error?.message || 'Unable to save the application draft.'); return; }
    setApplication(response.data);
    setStage(nextStage);
    setNotice('ទិន្នន័យទម្រង់ត្រូវបានរក្សាទុកដោយសុវត្ថិភាព។');
    await onUpdated();
  }

  async function upload(type: 'student_photo' | 'national_id' | 'family_book') {
    if (!application) { setNotice('សូមរក្សាទុកទម្រង់ជាមុនសិន។'); return; }
    const file = files[type];
    if (!file) { setNotice('សូមជ្រើសរើសឯកសារមុនពេលផ្ទុកឡើង។'); return; }
    setBusy(true);
    const response = await applicationsAPI.uploadReference(application.id, type, file);
    setBusy(false);
    if (!response.success || !response.data) { setNotice(response.error?.message || 'Unable to upload the document.'); return; }
    setApplication(response.data);
    setNotice('ឯកសារយោងត្រូវបានផ្ទុកឡើងដោយសុវត្ថិភាព។');
    await onUpdated();
  }

  async function generatePdf() {
    if (!application) { setNotice('សូមរក្សាទុកទម្រង់ជាមុនសិន។'); return; }
    if (!form.accept_conduct || !form.acknowledge_accuracy || !form.guardian_consent) { setNotice('សូមទទួលយកកិច្ចសន្យា និងការទទួលខុសត្រូវទាំងអស់មុនបង្កើត PDF។'); return; }
    setBusy(true);
    const response = await applicationsAPI.submitForm({ application_id: application.id, profile: profilePayload, form_data: { ...form, siblings_json: siblings, education_history_json: education, emergency_contacts_json: contacts } });
    setBusy(false);
    if (!response.success || !response.data) { setNotice(response.error?.message || 'Unable to generate the official PDF.'); return; }
    setApplication(response.data);
    setStage(3);
    setNotice('PDF ផ្លូវការ ៤ ទំព័រ ត្រូវបានបង្កើតរួចរាល់។');
    await onUpdated();
  }

  async function downloadPdf() {
    if (!application) return;
    setBusy(true);
    const response = await applicationsAPI.prefilledPdf(application.id);
    setBusy(false);
    if (!response.success || !response.data?.url) { setNotice(response.error?.message || 'Unable to retrieve the generated PDF.'); return; }
    window.open(response.data.url, '_blank', 'noopener,noreferrer');
  }

  async function uploadSigned() {
    if (!application || !files.signed_application) { setNotice('សូមជ្រើសរើសឯកសារដែលបានចុះហត្ថលេខា និងផ្ដិតមេដៃ។'); return; }
    setBusy(true);
    const response = await applicationsAPI.uploadSigned(application.id, files.signed_application);
    setBusy(false);
    if (!response.success || !response.data) { setNotice(response.error?.message || 'Unable to submit the signed application.'); return; }
    setApplication(response.data);
    setStage(5);
    setNotice('ឯកសារដែលបានចុះហត្ថលេខាត្រូវបានបញ្ជូនទៅអ្នកគ្រប់គ្រងសម្រាប់ពិនិត្យ។');
    await onUpdated();
  }

  return <section className="space-y-6">
    <div className="ksit-card p-5 sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#287243]">KSIT Official Application</p><h2 className="mt-1 text-xl font-extrabold text-[#18231d]">ពាក្យសុំចូលស្នាក់នៅអន្តេវាសិកដ្ឋាន</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#68736c]">បំពេញទម្រង់ផ្លូវការ ៤ ផ្នែក ផ្ទុកឯកសារយោង ទាញយក PDF ចុះហត្ថលេខា/ផ្ដិតមេដៃ ហើយបញ្ជូនឱ្យអ្នកគ្រប់គ្រងពិនិត្យ។</p></div><StatusBadge status={status} /></div><ol className="mt-6 grid grid-cols-5 gap-2">{workflow.map((item) => <li key={item.id} className="min-w-0"><button type="button" disabled={item.id > stage || busy} onClick={() => setStage(item.id)} className={`flex w-full flex-col items-center gap-2 text-center text-[11px] font-bold disabled:cursor-default ${item.id === stage ? 'text-[#0b5c2c]' : item.id < stage ? 'text-[#5a8f67]' : 'text-[#9ba59e]'}`}><span className={`flex size-8 items-center justify-center rounded-full border text-xs ${item.id <= stage ? 'border-[#0b5c2c] bg-[#eaf6ec]' : 'border-[#d8dfd9] bg-white'}`}>{item.id < stage ? <CheckCircle2 className="size-4" /> : item.id}</span><span className="hidden leading-4 sm:block">{item.label}</span></button></li>)}</ol></div>
    {notice && <div className="rounded-xl border border-[#cfe0d1] bg-[#edf7ee] px-4 py-3 text-sm text-[#16582b]">{notice}</div>}
    {stage === 1 && <section className="ksit-card p-5 sm:p-6"><div className="flex flex-wrap gap-2 border-b border-[#edf0ed] pb-4">{formSections.map((item) => <button key={item.id} type="button" onClick={() => setSection(item.id)} className={`min-h-10 rounded-lg px-3 text-xs font-bold ${section === item.id ? 'bg-[#0b5c2c] text-white' : 'bg-[#f3f6f3] text-[#526058] hover:bg-[#e7efe8]'}`}>{item.title}</button>)}</div><div className="pt-5">{section === 1 && <SectionOne form={form} update={updateForm} />}{section === 2 && <SectionTwo form={form} update={updateForm} siblings={siblings} setSiblings={setSiblings} education={education} setEducation={setEducation} />}{section === 3 && <SectionThree form={form} update={updateForm} />}{section === 4 && <SectionFour form={form} update={updateForm} contacts={contacts} setContacts={setContacts} />}</div><div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-[#edf0ed] pt-5"><button type="button" disabled={section === 1} onClick={() => setSection((value) => Math.max(1, value - 1))} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-[#dce3dc] px-4 text-sm font-bold text-[#526058] disabled:opacity-50"><ChevronLeft className="size-4" />ផ្នែកមុន</button>{section < 4 ? <button type="button" onClick={() => setSection((value) => Math.min(4, value + 1))} className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-[#0b5c2c] px-4 text-sm font-bold text-white">ផ្នែកបន្ទាប់<ChevronRight className="size-4" /></button> : <button type="button" disabled={busy} onClick={() => void saveDraft(2)} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#0b5c2c] px-4 text-sm font-bold text-white disabled:opacity-60">{busy && <Loader2 className="size-4 animate-spin" />}រក្សាទុក និងបន្តទៅឯកសារ<ChevronRight className="size-4" /></button>}</div></section>}
    {stage === 2 && <UploadStage application={application} files={files} setFiles={setFiles} busy={busy} onUpload={upload} onBack={() => setStage(1)} onContinue={() => setStage(3)} />}
    {stage === 3 && <PdfStage application={application} busy={busy} onGenerate={generatePdf} onDownload={downloadPdf} onContinue={() => setStage(4)} onBack={() => setStage(2)} />}
    {stage === 4 && <SignedStage file={files.signed_application} setFile={(file) => setFiles((current) => ({ ...current, signed_application: file }))} busy={busy} onSubmit={uploadSigned} onBack={() => setStage(3)} />}
    {stage === 5 && <StatusStage application={application} onRestart={() => { setStage(1); setSection(1); }} />}
  </section>;
}

function SectionOne({ form, update }: { form: FormState; update: (name: string, value: string | boolean) => void }) { return <div className="space-y-5"><SectionHeading title="ពាក្យសុំចូលស្នាក់នៅ" description="ព័ត៌មានសិស្ស/និស្សិត និងព័ត៌មានមាតាបិតា តាមទម្រង់ផ្លូវការ។" /><div className="grid gap-4 md:grid-cols-2"><Field label="នាមត្រកូល និងនាមខ្លួន (ខ្មែរ)" name="full_name_khmer" form={form} update={update} disabled /><Field label="Full name (Latin)" name="full_name_latin" form={form} update={update} disabled /><Select label="ភេទ" name="gender" form={form} update={update} options={[['male', 'ប្រុស'], ['female', 'ស្រី']]} disabled /><Field label="លេខសម្គាល់សិស្ស/និស្សិត" name="student_id_card" form={form} update={update} required /><Field label="ជំនាញ" name="major" form={form} update={update} required /><Select label="ឆ្នាំទី" name="academic_year" form={form} update={update} options={[['1', 'ឆ្នាំទី ១'], ['2', 'ឆ្នាំទី ២'], ['3', 'ឆ្នាំទី ៣'], ['4', 'ឆ្នាំទី ៤']]} /><Field label="ថ្នាក់ / ក្រុម" name="class_section" form={form} update={update} /><Field label="ថ្ងៃខែឆ្នាំកំណើត" name="date_of_birth" type="date" form={form} update={update} required /><Field label="ទីកន្លែងកំណើត" name="place_of_birth" form={form} update={update} required /><Field label="លេខអត្តសញ្ញាណប័ណ្ណ" name="national_id_number" form={form} update={update} /><WideField label="ទីលំនៅបច្ចុប្បន្ន" name="current_address" form={form} update={update} required /></div><div className="grid gap-5 border-t border-[#edf0ed] pt-5 lg:grid-cols-2"><FamilyCard title="ព័ត៌មានឪពុក" prefix="father" form={form} update={update} /><FamilyCard title="ព័ត៌មានម្តាយ" prefix="mother" form={form} update={update} /></div></div>; }

function SectionTwo({ form, update, siblings, setSiblings, education, setEducation }: { form: FormState; update: (name: string, value: string | boolean) => void; siblings: ApplicationSibling[]; setSiblings: React.Dispatch<React.SetStateAction<ApplicationSibling[]>>; education: ApplicationEducation[]; setEducation: React.Dispatch<React.SetStateAction<ApplicationEducation[]>> }) { return <div className="space-y-6"><SectionHeading title="ជីវប្រវត្តិសង្ខេប" description="ព័ត៌មានផ្ទាល់ខ្លួន បងប្អូនបង្កើត និងប្រវត្តិការសិក្សា។" /><div className="grid gap-4 md:grid-cols-3"><Field label="ជនជាតិ" name="ethnicity" form={form} update={update} /><Field label="សញ្ជាតិ" name="nationality" form={form} update={update} /><Select label="ស្ថានភាពគ្រួសារ" name="marital_status" form={form} update={update} options={[['នៅលីវ', 'នៅលីវ'], ['មានគ្រួសារ', 'មានគ្រួសារ']]} /></div><DynamicSiblings rows={siblings} setRows={setSiblings} /><DynamicEducation rows={education} setRows={setEducation} /></div>; }

function SectionThree({ form, update }: { form: FormState; update: (name: string, value: string | boolean) => void }) { return <div className="space-y-5"><SectionHeading title="កិច្ចសន្យាសាមីជន" description="ការសន្យាគោរពបទបញ្ជាផ្ទៃក្នុងអន្តេវាសិកដ្ឋាន។" /><div className="space-y-3 rounded-xl border border-[#d9e8db] bg-[#f7fbf7] p-5 text-sm leading-7 text-[#334138]"><p>១. គោរពតាមបទបញ្ជាផ្ទៃក្នុងរបស់អន្តេវាសិកដ្ឋាន និងការណែនាំបន្ថែមរបស់គណៈកម្មការ។</p><p>២. មិនធ្វើសកម្មភាពនយោបាយផ្សេងៗនៅក្នុងអន្តេវាសិកដ្ឋាន។</p><p>៣. ក្រោយពេលបញ្ចប់ការសិក្សា ឬអស់ជីវភាពជាសិស្ស និស្សិត ត្រូវចាកចេញដោយមិនទាមទារលក្ខខណ្ឌអ្វីឡើយ។</p><p>៤. មិនបង្កបញ្ហា និងផលវិបាកផ្សេងៗដល់វិទ្យាស្ថាន។</p></div><Check label="ខ្ញុំទទួលស្គាល់ និងសន្យាគោរពបទបញ្ជាខាងលើ" name="accept_conduct" form={form} update={update} /><Check label="ខ្ញុំទទួលខុសត្រូវចំពោះភាពត្រឹមត្រូវនៃព័ត៌មានជីវប្រវត្តិ" name="acknowledge_accuracy" form={form} update={update} /></div>; }

function SectionFour({ form, update, contacts, setContacts }: { form: FormState; update: (name: string, value: string | boolean) => void; contacts: ApplicationEmergencyContact[]; setContacts: React.Dispatch<React.SetStateAction<ApplicationEmergencyContact[]>> }) { return <div className="space-y-6"><SectionHeading title="លិខិតធានាពីឪពុកម្តាយ ឬអាណាព្យាបាល" description="ព័ត៌មានអ្នកធានា និងមនុស្សសម្រាប់ទំនាក់ទំនងបន្ទាន់។" /><div className="grid gap-4 md:grid-cols-2"><Field label="ឈ្មោះអ្នកធានា" name="guarantor_name" form={form} update={update} required /><Field label="ត្រូវជា" name="guarantor_relation" form={form} update={update} required /><Field label="លេខទូរស័ព្ទអ្នកធានា" name="guarantor_phone" form={form} update={update} required /><WideField label="ទីលំនៅបច្ចុប្បន្នអ្នកធានា" name="guarantor_address" form={form} update={update} /></div><DynamicContacts rows={contacts} setRows={setContacts} /><Check label="ឪពុកម្តាយ/អាណាព្យាបាលបានឃើញ និងឯកភាពចំពោះពាក្យសុំ" name="guardian_consent" form={form} update={update} /></div>; }

function UploadStage({ application, files, setFiles, busy, onUpload, onBack, onContinue }: { application: RoomApplication | null; files: Record<string, File | null>; setFiles: React.Dispatch<React.SetStateAction<Record<string, File | null>>>; busy: boolean; onUpload: (type: 'student_photo' | 'national_id' | 'family_book') => Promise<void>; onBack: () => void; onContinue: () => void }) { const refs: Array<{ type: 'student_photo' | 'national_id' | 'family_book'; label: string; hint: string; done?: boolean; accept: string }> = [{ type: 'student_photo', label: 'រូបថត ៤ × ៦', hint: 'PNG ឬ JPG · អតិបរមា 5 MB', done: application?.photo_4x6_attached, accept: 'image/png,image/jpeg' }, { type: 'national_id', label: 'អត្តសញ្ញាណប័ណ្ណ', hint: 'PDF, PNG ឬ JPG · អតិបរមា 8 MB', done: application?.id_card_attached, accept: 'application/pdf,image/png,image/jpeg' }, { type: 'family_book', label: 'សៀវភៅគ្រួសារ', hint: 'PDF, PNG ឬ JPG · អតិបរមា 8 MB', done: application?.family_book_attached, accept: 'application/pdf,image/png,image/jpeg' }]; return <section className="ksit-card p-5 sm:p-6"><SectionHeading title="ផ្ទុកឯកសារយោង" description="ឯកសារត្រូវបានរក្សាទុកក្នុងកន្លែងឯកជន ហើយអ្នកគ្រប់គ្រងមើលតាមតំណភ្ជាប់មានអាយុកាលកំណត់។" /><div className="mt-5 grid gap-4 lg:grid-cols-3">{refs.map((item) => <article key={item.type} className="rounded-xl border border-[#dfe7df] bg-[#fbfdfb] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-[#20342a]">{item.label}</p><p className="mt-1 text-xs text-[#68736c]">{item.hint}</p></div>{item.done && <CheckCircle2 className="size-5 text-[#188a47]" />}</div><input aria-label={item.label} type="file" accept={item.accept} onChange={(event) => setFiles((current) => ({ ...current, [item.type]: event.target.files?.[0] || null }))} className="mt-4 block w-full text-xs" /><p className="mt-2 truncate text-xs text-[#68736c]">{files[item.type]?.name || (item.done ? 'បានផ្ទុកឡើងរួច' : 'មិនទាន់ជ្រើសឯកសារ')}</p><button type="button" disabled={busy || !files[item.type]} onClick={() => void onUpload(item.type)} className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#0b5c2c] px-3 text-xs font-bold text-[#0b5c2c] disabled:opacity-50"><UploadCloud className="size-4" />ផ្ទុកឡើង</button></article>)}</div><div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-[#edf0ed] pt-5"><button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-[#dce3dc] px-4 text-sm font-bold text-[#526058]"><ChevronLeft className="size-4" />ត្រឡប់ក្រោយ</button><button type="button" disabled={busy || !application?.photo_4x6_attached || !application?.id_card_attached || !application?.family_book_attached} onClick={onContinue} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#0b5c2c] px-4 text-sm font-bold text-white disabled:opacity-50">បន្តបង្កើត PDF<ChevronRight className="size-4" /></button></div></section>; }

function PdfStage({ application, busy, onGenerate, onDownload, onContinue, onBack }: { application: RoomApplication | null; busy: boolean; onGenerate: () => Promise<void>; onDownload: () => Promise<void>; onContinue: () => void; onBack: () => void }) { const generated = Boolean(application?.document_urls?.prefilled_pdf || application?.prefilled_pdf_generated_at); return <section className="ksit-card p-5 sm:p-6"><SectionHeading title="ទាញយកពាក្យសុំ PDF ផ្លូវការ" description="PDF មាន ៤ ទំព័រ សម្រាប់បោះពុម្ព ចុះហត្ថលេខា និងផ្ដិតមេដៃស្តាំ។" /><div className="mt-5 rounded-xl border border-dashed border-[#aecab4] bg-[#f6fbf7] p-6 text-center"><FileText className="mx-auto size-10 text-[#0b5c2c]" /><p className="mt-3 font-bold">{generated ? 'PDF រួចរាល់សម្រាប់ទាញយក' : 'បង្កើត PDF ពីទិន្នន័យដែលបានបំពេញ'}</p><p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#68736c]">សូមពិនិត្យព័ត៌មានឱ្យបានត្រឹមត្រូវ បន្ទាប់មកបោះពុម្ព និងចុះហត្ថលេខា/ផ្ដិតមេដៃលើទំព័រដែលកំណត់។</p>{generated ? <button type="button" disabled={busy} onClick={() => void onDownload()} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#0b5c2c] px-4 text-sm font-bold text-white"><Download className="size-4" />ទាញយក PDF</button> : <button type="button" disabled={busy} onClick={() => void onGenerate()} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#0b5c2c] px-4 text-sm font-bold text-white disabled:opacity-50">{busy && <Loader2 className="size-4 animate-spin" />}បង្កើត PDF ផ្លូវការ</button>}</div><div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-[#edf0ed] pt-5"><button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-[#dce3dc] px-4 text-sm font-bold text-[#526058]"><ChevronLeft className="size-4" />ត្រឡប់ក្រោយ</button><button type="button" disabled={!generated} onClick={onContinue} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#0b5c2c] px-4 text-sm font-bold text-white disabled:opacity-50">ខ្ញុំបានបោះពុម្ពហើយ<ChevronRight className="size-4" /></button></div></section>; }

function SignedStage({ file, setFile, busy, onSubmit, onBack }: { file: File | null; setFile: (file: File | null) => void; busy: boolean; onSubmit: () => Promise<void>; onBack: () => void }) { return <section className="ksit-card p-5 sm:p-6"><SectionHeading title="ផ្ទុកឯកសារដែលបានចុះហត្ថលេខា និងផ្ដិតមេដៃ" description="រួមបញ្ចូលហត្ថលេខា/ស្នាមមេដៃស្តាំរបស់សិស្សលើទំព័រ ១, ២, ៣ និងឪពុកម្តាយ/អាណាព្យាបាលលើទំព័រ ៣, ៤។" /><label className="mt-5 flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#b7cfba] bg-[#f8fcf8] p-6 text-center"><UploadCloud className="size-9 text-[#0b5c2c]" /><span className="mt-3 text-sm font-bold">ជ្រើស PDF ឬរូបភាពដែលបានស្កេន</span><span className="mt-1 text-xs text-[#68736c]">PDF, PNG ឬ JPG · អតិបរមា 12 MB</span><input type="file" className="sr-only" accept="application/pdf,image/png,image/jpeg" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label><p className="mt-3 text-center text-xs text-[#68736c]">{file?.name || 'មិនទាន់ជ្រើសឯកសារ'}</p><div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-[#edf0ed] pt-5"><button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-[#dce3dc] px-4 text-sm font-bold text-[#526058]"><ChevronLeft className="size-4" />ត្រឡប់ក្រោយ</button><button type="button" disabled={busy || !file} onClick={() => void onSubmit()} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#0b5c2c] px-4 text-sm font-bold text-white disabled:opacity-50">{busy && <Loader2 className="size-4 animate-spin" />}បញ្ជូនឱ្យអ្នកគ្រប់គ្រងពិនិត្យ<ChevronRight className="size-4" /></button></div></section>; }

function StatusStage({ application, onRestart }: { application: RoomApplication | null; onRestart: () => void }) { const status = application?.status || 'draft'; const note = application?.manager_notes || application?.rejection_reason; const isCorrection = status === 'correction_needed'; return <section className="ksit-card p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#287243]">Application status</p><h3 className="mt-1 text-xl font-extrabold">{status.replaceAll('_', ' ')}</h3><p className="mt-2 text-sm leading-6 text-[#68736c]">{status === 'under_review' ? 'អ្នកគ្រប់គ្រងកំពុងពិនិត្យព័ត៌មាន ឯកសារយោង និងឯកសារដែលបានចុះហត្ថលេខារបស់អ្នក។' : status === 'approved' ? 'ពាក្យសុំត្រូវបានអនុម័ត។ អ្នកគ្រប់គ្រងអាចបន្តចាត់បន្ទប់ដោយស្វ័យប្រវត្តិ ឬដោយដៃ។' : status === 'assigned' ? 'អ្នកទទួលបានការចាត់បន្ទប់រួចហើយ។' : status === 'rejected' ? 'ពាក្យសុំមិនត្រូវបានអនុម័តទេ។ សូមអានកំណត់ចំណាំរបស់អ្នកគ្រប់គ្រង។' : 'សូមកែសម្រួលតាមកំណត់ចំណាំ ហើយបង្កើត/បញ្ជូនឯកសារជាថ្មី។'}</p></div><StatusBadge status={status} /></div>{note && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><strong>កំណត់ចំណាំពីអ្នកគ្រប់គ្រង៖</strong><br />{note}</div>}{isCorrection && <button type="button" onClick={onRestart} className="mt-5 min-h-11 rounded-lg bg-[#0b5c2c] px-4 text-sm font-bold text-white">កែសម្រួល និងបញ្ជូនម្ដងទៀត</button>}</section>; }

function StatusBadge({ status }: { status: string }) { const tone = status === 'approved' || status === 'assigned' ? 'bg-[#eaf6ec] text-[#1a6a37]' : status === 'rejected' ? 'bg-[#fff0ef] text-[#a73627]' : status === 'correction_needed' ? 'bg-amber-100 text-amber-900' : 'bg-[#f4f1e8] text-[#806525]'; return <span className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-bold capitalize ${tone}`}>{status.replaceAll('_', ' ')}</span>; }
function SectionHeading({ title, description }: { title: string; description: string }) { return <div><h3 className="text-lg font-extrabold text-[#20342a]">{title}</h3><p className="mt-1 text-sm leading-6 text-[#68736c]">{description}</p></div>; }
function Field({ label, name, form, update, type = 'text', required, disabled }: { label: string; name: string; form: FormState; update: (name: string, value: string | boolean) => void; type?: string; required?: boolean; disabled?: boolean }) { return <label className="block text-sm font-bold text-[#39473f]">{label}<input type={type} value={String(form[name] || '')} onChange={(event) => update(name, event.target.value)} required={required} disabled={disabled} className="mt-1.5 h-11 w-full rounded-xl border border-[#dce3dc] bg-white px-3 text-sm font-normal outline-none focus:border-[#5f9b6f] disabled:bg-[#f2f5f2]" /></label>; }
function WideField(props: React.ComponentProps<typeof Field>) { return <div className="md:col-span-2"><Field {...props} /></div>; }
function Select({ label, name, form, update, options, disabled }: { label: string; name: string; form: FormState; update: (name: string, value: string | boolean) => void; options: [string, string][]; disabled?: boolean }) { return <label className="block text-sm font-bold text-[#39473f]">{label}<select value={String(form[name] || '')} onChange={(event) => update(name, event.target.value)} disabled={disabled} className="mt-1.5 h-11 w-full rounded-xl border border-[#dce3dc] bg-white px-3 text-sm font-normal outline-none focus:border-[#5f9b6f] disabled:bg-[#f2f5f2]">{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>; }
function Check({ label, name, form, update }: { label: string; name: string; form: FormState; update: (name: string, value: string | boolean) => void }) { return <label className="flex min-h-12 items-center gap-3 rounded-xl border border-[#e1e7e1] p-3 text-sm font-bold text-[#39473f]"><input type="checkbox" checked={Boolean(form[name])} onChange={(event) => update(name, event.target.checked)} className="size-5 accent-[#0b5c2c]" />{label}</label>; }
function FamilyCard({ title, prefix, form, update }: { title: string; prefix: 'father' | 'mother'; form: FormState; update: (name: string, value: string | boolean) => void }) { return <div className="rounded-xl border border-[#e1e7e1] p-4"><h4 className="font-extrabold text-[#20342a]">{title}</h4><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="ឈ្មោះ" name={`${prefix}_name`} form={form} update={update} required /><Field label="អាយុ" name={`${prefix}_age`} type="number" form={form} update={update} /><Field label="មុខរបរ" name={`${prefix}_occupation`} form={form} update={update} /><Field label="លេខទូរស័ព្ទ" name={`${prefix}_phone`} form={form} update={update} /><div className="sm:col-span-2"><Field label="ទីលំនៅ" name={`${prefix}_address`} form={form} update={update} /></div></div></div>; }
function DynamicSiblings({ rows, setRows }: { rows: ApplicationSibling[]; setRows: React.Dispatch<React.SetStateAction<ApplicationSibling[]>> }) { const update = (index: number, key: keyof ApplicationSibling, value: string) => setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row)); return <div><div className="flex items-center justify-between gap-3"><h4 className="font-extrabold text-[#20342a]">បងប្អូនបង្កើត</h4><button type="button" onClick={() => setRows((current) => [...current, { name: '', gender: '', date_of_birth: '', occupation: '', address: '' }])} className="min-h-10 rounded-lg border border-[#0b5c2c] px-3 text-xs font-bold text-[#0b5c2c]">+ បន្ថែម</button></div><div className="mt-3 space-y-3">{rows.map((row, index) => <div key={index} className="grid gap-3 rounded-xl border border-[#e1e7e1] p-3 md:grid-cols-5"><Text label="ឈ្មោះ" value={row.name} onChange={(value) => update(index, 'name', value)} /><Text label="ភេទ" value={row.gender || ''} onChange={(value) => update(index, 'gender', value)} /><Text label="ថ្ងៃកំណើត" value={row.date_of_birth || ''} onChange={(value) => update(index, 'date_of_birth', value)} /><Text label="មុខរបរ" value={row.occupation || ''} onChange={(value) => update(index, 'occupation', value)} /><Text label="ទីលំនៅ" value={row.address || ''} onChange={(value) => update(index, 'address', value)} />{rows.length > 1 && <button type="button" onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))} className="md:col-span-5 text-left text-xs font-bold text-[#a73627]">លុបជួរនេះ</button>}</div>)}</div></div>; }
function DynamicEducation({ rows, setRows }: { rows: ApplicationEducation[]; setRows: React.Dispatch<React.SetStateAction<ApplicationEducation[]>> }) { const update = (index: number, key: keyof ApplicationEducation, value: string) => setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row)); return <div><h4 className="font-extrabold text-[#20342a]">ប្រវត្តិការសិក្សា</h4><div className="mt-3 space-y-3">{rows.map((row, index) => <div key={index} className="grid gap-3 rounded-xl border border-[#e1e7e1] p-3 md:grid-cols-3"><Text label="កម្រិតសិក្សា" value={row.level} onChange={(value) => update(index, 'level', value)} /><Text label="ឈ្មោះសាលា" value={row.school || ''} onChange={(value) => update(index, 'school', value)} /><Text label="ខេត្ត/រាជធានី" value={row.province || ''} onChange={(value) => update(index, 'province', value)} /><Text label="ឆ្នាំសិក្សា" value={row.year || ''} onChange={(value) => update(index, 'year', value)} /><Text label="សញ្ញាបត្រ" value={row.certificate || ''} onChange={(value) => update(index, 'certificate', value)} /><Text label="និទ្ទេសរួម" value={row.grade || ''} onChange={(value) => update(index, 'grade', value)} /></div>)}</div></div>; }
function DynamicContacts({ rows, setRows }: { rows: ApplicationEmergencyContact[]; setRows: React.Dispatch<React.SetStateAction<ApplicationEmergencyContact[]>> }) { const update = (index: number, key: keyof ApplicationEmergencyContact, value: string) => setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row)); return <div><h4 className="font-extrabold text-[#20342a]">ទំនាក់ទំនងបន្ទាន់</h4><div className="mt-3 grid gap-3 md:grid-cols-2">{rows.slice(0, 2).map((row, index) => <div key={index} className="grid gap-3 rounded-xl border border-[#e1e7e1] p-3"><Text label="ឈ្មោះ" value={row.name} onChange={(value) => update(index, 'name', value)} /><Text label="ត្រូវជា" value={row.relation || ''} onChange={(value) => update(index, 'relation', value)} /><Text label="លេខទូរស័ព្ទ" value={row.phone || ''} onChange={(value) => update(index, 'phone', value)} /><Text label="ទីលំនៅ/កន្លែងធ្វើការ" value={row.address || ''} onChange={(value) => update(index, 'address', value)} /></div>)}</div></div>; }
function Text({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block text-xs font-bold text-[#526058]">{label}<input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-[#dce3dc] px-2 text-sm font-normal outline-none focus:border-[#5f9b6f]" /></label>; }
