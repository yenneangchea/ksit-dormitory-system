'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { applicationsAPI, usersAPI, authAPI, storageAPI } from '@/lib/api';
import type { ApplicationDocumentType, StoredDocument } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ── File upload helper component ──────────────────────────────────────────────
function FileUploadField({
  label, description, fieldKey, uploadedDocument, onUploaded,
}: {
  label: string;
  description: string;
  fieldKey: ApplicationDocumentType;
  uploadedDocument: StoredDocument | null;
  onUploaded: (key: ApplicationDocumentType, document: StoredDocument) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [localPreviewUrl, setLocalPreviewUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only PDF, JPG, and PNG files are supported.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Files must be 5 MB or smaller.');
      return;
    }

    setError('');
    setProgress(0);
    setUploading(true);
    const result = await storageAPI.uploadApplicationDocument(file, fieldKey, setProgress);
    setUploading(false);

    if (result.success && result.data) {
      onUploaded(fieldKey, result.data);
      setLocalPreviewUrl(URL.createObjectURL(file));
      setProgress(100);
    } else {
      setError(result.error?.message || 'Document upload failed. Please try again.');
    }
    e.target.value = '';
  };

  const isAttached = Boolean(uploadedDocument);
  return (
    <div className={`flex items-start gap-3 p-4 border rounded-xl transition-colors ${isAttached ? 'border-green-300 bg-green-50/40' : 'border-gray-200 hover:bg-gray-50'}`}>
      <div className="mt-1" aria-hidden="true">
        {isAttached ? <span className="text-green-600 text-lg">✓</span> : <span className="text-gray-300 text-lg">○</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description} · PDF, JPG, or PNG · Maximum 5 MB</p>
        {uploadedDocument && (
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-green-700 font-semibold">
            <span className="truncate max-w-[240px]">Stored securely: {uploadedDocument.fileName}</span>
            {localPreviewUrl && <a href={localPreviewUrl} target="_blank" rel="noreferrer" className="underline">Preview</a>}
            <Badge className="bg-green-100 text-green-800 border-none">Uploaded</Badge>
          </div>
        )}
        {uploading && (
          <div className="mt-2" aria-live="polite">
            <div className="h-1.5 w-full max-w-xs rounded bg-blue-100 overflow-hidden"><div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} /></div>
            <p className="text-xs text-blue-700 mt-1">Uploading {progress}%</p>
          </div>
        )}
        {error && <p className="text-xs text-red-600 font-medium mt-1">{error}</p>}
      </div>
      <div className="shrink-0">
        <input ref={inputRef} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={handleFile} />
        <Button type="button" variant="outline" size="sm"
          className={isAttached ? 'border-green-300 text-green-700 text-xs' : 'text-xs'}
          onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? 'Uploading...' : isAttached ? 'Replace' : 'Upload'}
        </Button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ApplicationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [existingProfile, setExistingProfile] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Step 1 — Academic profile
  const [acadForm, setAcadForm] = useState({
    student_id_card: '', major: 'Computer Science', academic_year: 1,
    class_section: '', scholarship_type: 'Full Scholarship',
    date_of_birth: '', place_of_birth: '', national_id_number: '',
    current_address: '',
    father_name: '', father_age: '', father_occupation: '', father_phone: '', father_address: '',
    mother_name: '', mother_age: '', mother_occupation: '', mother_phone: '', mother_address: '',
    guarantor_name: '', guarantor_relation: '', guarantor_phone: '', guarantor_address: '',
  });

  // Step 3 — Supabase Storage document metadata (persisted with the application).
  const [fileDocuments, setFileDocuments] = useState<Record<ApplicationDocumentType, StoredDocument | null>>({
    photo_4x6: null, contract: null, parent_guarantee: null, family_book: null, id_card: null,
  });

  // Step 4 application year
  const [academicYearApplied, setAcademicYearApplied] = useState('2025-2026');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setPageLoading(true);
      const [userRes, acadRes, appsRes] = await Promise.all([
        authAPI.getCurrentUser(),
        usersAPI.getMyAcademicProfile(),
        applicationsAPI.getMyApplications(),
      ]);
      if (userRes.success && userRes.user) setUser(userRes.user);
      if (acadRes.success && acadRes.data) {
        setExistingProfile(acadRes.data);
        const p = acadRes.data;
        setAcadForm({
          student_id_card: p.student_id_card || '',
          major: p.major || 'Computer Science',
          academic_year: p.academic_year || 1,
          class_section: p.class_section || '',
          scholarship_type: p.scholarship_type || 'Full Scholarship',
          date_of_birth: p.date_of_birth || '',
          place_of_birth: p.place_of_birth || '',
          national_id_number: p.national_id_number || '',
          current_address: p.current_address || '',
          father_name: p.father_name || '', father_age: String(p.father_age || ''),
          father_occupation: p.father_occupation || '', father_phone: p.father_phone || '',
          father_address: p.father_address || '',
          mother_name: p.mother_name || '', mother_age: String(p.mother_age || ''),
          mother_occupation: p.mother_occupation || '', mother_phone: p.mother_phone || '',
          mother_address: p.mother_address || '',
          guarantor_name: p.guarantor_name || '', guarantor_relation: p.guarantor_relation || '',
          guarantor_phone: p.guarantor_phone || '', guarantor_address: p.guarantor_address || '',
        });
      }
      if (appsRes.success && appsRes.data?.length) {
        const cur = appsRes.data.find((a: any) => a.academic_year_applied === '2025-2026');
        if (cur) {
          setExistingApplication(cur);
          const existingDocuments = cur.document_metadata_json || {};
          setFileDocuments({
            photo_4x6: existingDocuments.photo_4x6 || null,
            contract: existingDocuments.contract || null,
            parent_guarantee: existingDocuments.parent_guarantee || null,
            family_book: existingDocuments.family_book || null,
            id_card: existingDocuments.id_card || null,
          });
        }
      }
    } catch (e) { console.error(e); }
    finally { setPageLoading(false); }
  };

  const handleFileUploaded = (key: ApplicationDocumentType, document: StoredDocument) => {
    setFileDocuments(prev => ({ ...prev, [key]: document }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Save / update academic profile first
      await usersAPI.updateMyAcademicProfile({
        ...acadForm,
        father_age: acadForm.father_age ? Number(acadForm.father_age) : undefined,
        mother_age: acadForm.mother_age ? Number(acadForm.mother_age) : undefined,
      });

      const appData = {
        academic_year_applied: academicYearApplied,
        photo_4x6_attached: !!fileDocuments.photo_4x6,
        contract_signed: !!fileDocuments.contract,
        parent_guarantee_attached: !!fileDocuments.parent_guarantee,
        family_book_attached: !!fileDocuments.family_book,
        id_card_attached: !!fileDocuments.id_card,
        document_metadata_json: fileDocuments,
        student_photo_url: fileDocuments.photo_4x6?.path || null,
        national_id_doc_url: fileDocuments.id_card?.path || null,
        family_book_doc_url: fileDocuments.family_book?.path || null,
        signed_application_doc_url: fileDocuments.contract?.path || null,
      };

      const res = existingApplication
        ? await applicationsAPI.update(existingApplication.id, appData)
        : await applicationsAPI.create(appData);

      if (res.success) {
        alert(existingApplication ? 'Application updated!' : 'Application submitted successfully!');
        router.push('/dashboard/student');
      } else {
        alert(res.error?.message || 'Failed to submit application');
      }
    } catch (e) { console.error(e); alert('Error submitting application'); }
    finally { setLoading(false); }
  };

  const statusColor: Record<string, string> = {
    draft: 'bg-gray-500', submitted: 'bg-blue-500', under_review: 'bg-yellow-500',
    approved: 'bg-green-500', rejected: 'bg-red-500', assigned: 'bg-purple-500',
  };

  if (pageLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading application...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Button variant="outline" onClick={() => router.push('/dashboard/student')} className="mb-4">
            ← Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Dormitory Application</h1>
          <p className="text-gray-600">Academic Year: {academicYearApplied} · {user?.full_name_latin}</p>
        </div>

        {existingApplication && (
          <Card className="mb-6 border-l-4 border-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span>Existing Application</span>
                <Badge className={statusColor[existingApplication.status]}>
                  {existingApplication.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </CardTitle>
              <CardDescription>Applied: {new Date(existingApplication.applied_at).toLocaleDateString()}</CardDescription>
            </CardHeader>
            {existingApplication.rejection_reason && (
              <CardContent>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-red-800">Rejection Reason:</p>
                  <p className="text-sm text-red-700">{existingApplication.rejection_reason}</p>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Step progress */}
        <div className="mb-8">
          <div className="flex items-center">
            {[1,2,3,4].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <button onClick={() => s < currentStep && setCurrentStep(s)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${currentStep >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {s}
                </button>
                {s < 4 && <div className={`flex-1 h-1 mx-1 ${currentStep > s ? 'bg-blue-600' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs font-semibold">
            {['Personal Info', 'Family & Guarantor', 'Documents', 'Review'].map((label, i) => (
              <span key={i} className={currentStep >= i+1 ? 'text-blue-600' : 'text-gray-400'}>{label}</span>
            ))}
          </div>
        </div>

        {/* ── STEP 1: Personal & Academic Info ── */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Personal & Academic Information</CardTitle>
              <CardDescription>Fill in your KSIT student details exactly as on your ID card</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">Name (Latin):</span> <span className="font-semibold">{user?.full_name_latin}</span></div>
                  <div><span className="text-gray-500">Name (Khmer):</span> <span className="font-semibold">{user?.full_name_khmer}</span></div>
                  <div><span className="text-gray-500">Email:</span> <span className="font-semibold">{user?.email}</span></div>
                  <div><span className="text-gray-500">Gender:</span> <span className="font-semibold capitalize">{user?.gender}</span></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><Label>Student ID Card *</Label>
                  <Input className="mt-1" placeholder="e.g. KSIT-2025-0042" value={acadForm.student_id_card}
                    onChange={e => setAcadForm({...acadForm, student_id_card: e.target.value})} required /></div>
                <div><Label>National ID Number</Label>
                  <Input className="mt-1" placeholder="e.g. 1234567890" value={acadForm.national_id_number}
                    onChange={e => setAcadForm({...acadForm, national_id_number: e.target.value})} /></div>
                <div><Label>Date of Birth *</Label>
                  <Input className="mt-1" type="date" value={acadForm.date_of_birth}
                    onChange={e => setAcadForm({...acadForm, date_of_birth: e.target.value})} required /></div>
                <div><Label>Place of Birth *</Label>
                  <Input className="mt-1" placeholder="Province / City" value={acadForm.place_of_birth}
                    onChange={e => setAcadForm({...acadForm, place_of_birth: e.target.value})} required /></div>
              </div>

              <div><Label>Current Address *</Label>
                <Input className="mt-1" placeholder="Village, Commune, District, Province" value={acadForm.current_address}
                  onChange={e => setAcadForm({...acadForm, current_address: e.target.value})} required /></div>

              <div className="grid grid-cols-2 gap-4">
                <div><Label>Major *</Label>
                  <Select value={acadForm.major} onValueChange={v => setAcadForm({...acadForm, major: v || acadForm.major})}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Computer Science">Computer Science</SelectItem>
                      <SelectItem value="Information Technology">Information Technology</SelectItem>
                      <SelectItem value="Civil Engineering">Civil Engineering</SelectItem>
                      <SelectItem value="Electrical Engineering">Electrical Engineering</SelectItem>
                      <SelectItem value="Business Administration">Business Administration</SelectItem>
                    </SelectContent>
                  </Select></div>
                <div><Label>Academic Year *</Label>
                  <Select value={String(acadForm.academic_year)} onValueChange={v => setAcadForm({...acadForm, academic_year: Number(v)})}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4].map(y => <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>)}
                    </SelectContent>
                  </Select></div>
                <div><Label>Class Section</Label>
                  <Input className="mt-1" placeholder="e.g. CS1-A" value={acadForm.class_section}
                    onChange={e => setAcadForm({...acadForm, class_section: e.target.value})} /></div>
                <div><Label>Scholarship Type</Label>
                  <Select value={acadForm.scholarship_type} onValueChange={v => setAcadForm({...acadForm, scholarship_type: v || acadForm.scholarship_type})}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full Scholarship">Full Scholarship</SelectItem>
                      <SelectItem value="Partial Scholarship">Partial Scholarship</SelectItem>
                      <SelectItem value="Self-funded">Self-funded</SelectItem>
                    </SelectContent>
                  </Select></div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => setCurrentStep(2)} className="bg-blue-600 hover:bg-blue-700">
                  Next: Family & Guarantor →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 2: Family & Guarantor ── */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Family & Guarantor Information</CardTitle>
              <CardDescription>Required for the official KSIT application document</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-sm uppercase tracking-widest text-gray-500 mb-3">Father's Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Father's Name *</Label>
                    <Input className="mt-1" value={acadForm.father_name} onChange={e => setAcadForm({...acadForm, father_name: e.target.value})} required /></div>
                  <div><Label>Age</Label>
                    <Input className="mt-1" type="number" value={acadForm.father_age} onChange={e => setAcadForm({...acadForm, father_age: e.target.value})} /></div>
                  <div><Label>Occupation</Label>
                    <Input className="mt-1" value={acadForm.father_occupation} onChange={e => setAcadForm({...acadForm, father_occupation: e.target.value})} /></div>
                  <div><Label>Phone</Label>
                    <Input className="mt-1" value={acadForm.father_phone} onChange={e => setAcadForm({...acadForm, father_phone: e.target.value})} /></div>
                  <div className="col-span-2"><Label>Address</Label>
                    <Input className="mt-1" value={acadForm.father_address} onChange={e => setAcadForm({...acadForm, father_address: e.target.value})} /></div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm uppercase tracking-widest text-gray-500 mb-3">Mother's Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Mother's Name *</Label>
                    <Input className="mt-1" value={acadForm.mother_name} onChange={e => setAcadForm({...acadForm, mother_name: e.target.value})} required /></div>
                  <div><Label>Age</Label>
                    <Input className="mt-1" type="number" value={acadForm.mother_age} onChange={e => setAcadForm({...acadForm, mother_age: e.target.value})} /></div>
                  <div><Label>Occupation</Label>
                    <Input className="mt-1" value={acadForm.mother_occupation} onChange={e => setAcadForm({...acadForm, mother_occupation: e.target.value})} /></div>
                  <div><Label>Phone</Label>
                    <Input className="mt-1" value={acadForm.mother_phone} onChange={e => setAcadForm({...acadForm, mother_phone: e.target.value})} /></div>
                  <div className="col-span-2"><Label>Address</Label>
                    <Input className="mt-1" value={acadForm.mother_address} onChange={e => setAcadForm({...acadForm, mother_address: e.target.value})} /></div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm uppercase tracking-widest text-gray-500 mb-3">Guarantor / Emergency Contact</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Guarantor Name *</Label>
                    <Input className="mt-1" value={acadForm.guarantor_name} onChange={e => setAcadForm({...acadForm, guarantor_name: e.target.value})} required /></div>
                  <div><Label>Relation *</Label>
                    <Input className="mt-1" placeholder="e.g. Uncle, Elder Brother" value={acadForm.guarantor_relation} onChange={e => setAcadForm({...acadForm, guarantor_relation: e.target.value})} required /></div>
                  <div><Label>Phone *</Label>
                    <Input className="mt-1" value={acadForm.guarantor_phone} onChange={e => setAcadForm({...acadForm, guarantor_phone: e.target.value})} required /></div>
                  <div><Label>Address</Label>
                    <Input className="mt-1" value={acadForm.guarantor_address} onChange={e => setAcadForm({...acadForm, guarantor_address: e.target.value})} /></div>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>← Back</Button>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setCurrentStep(3)}>Next: Documents →</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 3: Documents Upload ── */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Required Documents</CardTitle>
              <CardDescription>Upload scanned copies or photos of each required document</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <FileUploadField label="4x6 Photo" description="Recent passport-sized photo"
                fieldKey="photo_4x6" uploadedDocument={fileDocuments.photo_4x6} onUploaded={handleFileUploaded} />
              <FileUploadField label="Dormitory Contract (Signed)" description="Signed KSIT dormitory rules agreement"
                fieldKey="contract" uploadedDocument={fileDocuments.contract} onUploaded={handleFileUploaded} />
              <FileUploadField label="Parent Guarantee Letter" description="Signed guarantor letter from parent or guardian"
                fieldKey="parent_guarantee" uploadedDocument={fileDocuments.parent_guarantee} onUploaded={handleFileUploaded} />
              <FileUploadField label="Family Registration Book" description="Official family registration book copy"
                fieldKey="family_book" uploadedDocument={fileDocuments.family_book} onUploaded={handleFileUploaded} />
              <FileUploadField label="National ID Card" description="Clear photo or scan of your national ID card"
                fieldKey="id_card" uploadedDocument={fileDocuments.id_card} onUploaded={handleFileUploaded} />

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> If file upload is unavailable, you can still submit and bring physical copies to the dormitory office within 7 days.
                </p>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setCurrentStep(2)}>← Back</Button>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setCurrentStep(4)}>Next: Review →</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 4: Review & Submit ── */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 4: Review & Submit</CardTitle>
              <CardDescription>Confirm all information before final submission</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl text-sm">
                <div><span className="text-gray-500">Name:</span> <span className="font-semibold">{user?.full_name_latin}</span></div>
                <div><span className="text-gray-500">Student ID:</span> <span className="font-semibold">{acadForm.student_id_card || '—'}</span></div>
                <div><span className="text-gray-500">Major:</span> <span className="font-semibold">{acadForm.major}</span></div>
                <div><span className="text-gray-500">Year:</span> <span className="font-semibold">Year {acadForm.academic_year}</span></div>
                <div><span className="text-gray-500">Father:</span> <span className="font-semibold">{acadForm.father_name || '—'}</span></div>
                <div><span className="text-gray-500">Mother:</span> <span className="font-semibold">{acadForm.mother_name || '—'}</span></div>
                <div><span className="text-gray-500">Guarantor:</span> <span className="font-semibold">{acadForm.guarantor_name || '—'}</span></div>
                <div><span className="text-gray-500">Guarantor Phone:</span> <span className="font-semibold">{acadForm.guarantor_phone || '—'}</span></div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">Document Checklist</h4>
                <div className="space-y-1">
                  {[
                    {key:'photo_4x6', label:'4x6 Photo'},
                    {key:'contract', label:'Dormitory Contract'},
                    {key:'parent_guarantee', label:'Parent Guarantee Letter'},
                    {key:'family_book', label:'Family Registration Book'},
                    {key:'id_card', label:'National ID Card'},
                  ].map(d => (
                    <div key={d.key} className="flex justify-between text-sm py-1 border-b border-gray-100">
                      <span className="text-gray-600">{d.label}</span>
                      <span className={fileDocuments[d.key as ApplicationDocumentType] ? 'text-green-600 font-semibold' : 'text-red-500'}>
                        {fileDocuments[d.key as ApplicationDocumentType] ? '✓ Uploaded' : '✗ Not uploaded'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800 font-semibold mb-1">Declaration</p>
                <p className="text-xs text-blue-700">By submitting, I confirm that all information provided is accurate and I agree to abide by all KSIT dormitory rules, pay monthly utility bills on time, and submit any missing physical documents within 7 days of approval.</p>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setCurrentStep(3)} disabled={loading}>← Back</Button>
                <Button onClick={handleSubmit} disabled={loading} className="bg-green-600 hover:bg-green-700 font-bold min-w-[160px]">
                  {loading ? 'Submitting...' : existingApplication ? 'Update Application' : 'Submit Application'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
