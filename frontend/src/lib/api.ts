import type {
  AcademicMajor,
  Attendance,
  Building,
  MaintenanceRequest,
  Room,
  RoomAssignment,
  RoomApplication,
  StudentBill,
  User,
  UserRole,
  UtilityBill,
  PublicMajorsCatalog,
} from '@/types';

// The production API is deployed as a Vercel Function in this same project.
// Relative requests guarantee that authentication, cookies, CORS, and deployments
// stay on the official KSIT domain rather than an independently deployed backend.
export const API_BASE_URL = '';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  user?: User;
  token?: string;
  error?: { message: string; stack?: string };
}

export interface DashboardSummary {
  buildings: number;
  rooms_in_service: number;
  rooms_total: number;
  total_capacity: number;
  occupied_beds: number;
  vacant_beds: number;
  occupancy_percent: number;
  pending_maintenance: number;
  pending_applications: number;
  attendance_today: number;
}

export interface DashboardAnalytics {
  applications: Record<string, number>;
  occupancy: { occupied: number; capacity: number };
  attendance: Record<string, number>;
  attendance_days: { date: string; present?: number; absent?: number; leave?: number }[];
  billing: Record<string, number> & { total_khr: number };
}

export interface PasswordResetRequest {
  id: string;
  user_id: string;
  email: string;
  reason: string | null;
  status: 'pending' | 'resolved' | 'rejected';
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}
export interface AcademicMajorAuditLog {
  id: string;
  major_id: string | null;
  admin_user_id: string;
  action: 'create' | 'update' | 'activate' | 'deactivate' | 'delete' | 'bulk_import';
  source: 'admin_ui' | 'bulk_import' | 'system';
  before_data: AcademicMajor | null;
  after_data: AcademicMajor | null;
  created_at: string;
  admin?: Pick<User, 'id' | 'full_name_khmer' | 'full_name_latin' | 'email'> | null;
}
export interface AcademicMajorImportResult {
  created: number;
  updated: number;
  total: number;
  majors: AcademicMajor[];
}

export interface AcademicAnalyticsStudent {
  user_id: string;
  full_name_khmer: string;
  full_name_latin: string;
  email: string;
  gender: string;
  academic_level: string;
  major_id: string | null;
  major_name_khmer: string;
  major_name_english: string;
  academic_year: number | null;
  is_configured_major: boolean;
}

export interface AcademicEnrollmentSummary {
  academic_level: string;
  major_id: string | null;
  major_name_khmer: string;
  major_name_english: string;
  total_students: number;
  by_year: Record<1 | 2 | 3 | 4, number>;
}

export interface AcademicAnalyticsReport {
  filters: { academic_level: string | null; major_id: string | null; academic_year: number | null };
  students: AcademicAnalyticsStudent[];
  summaries: AcademicEnrollmentSummary[];
  majors: AcademicMajor[];
}

export interface AssignmentBoardStudent {
  id: string;
  user_id: string;
  academic_year_applied: string;
  status: 'approved' | 'assigned';
  users?: Pick<User, 'id' | 'full_name_latin' | 'full_name_khmer' | 'email' | 'gender'> | null;
  academic_profiles?: { major?: string; academic_year?: number } | { major?: string; academic_year?: number }[] | null;
}

export interface AssignmentBoardResident extends Pick<RoomAssignment, 'id' | 'application_id' | 'student_id' | 'bed_number' | 'academic_year' | 'assigned_at'> {
  users?: Pick<User, 'id' | 'full_name_latin' | 'full_name_khmer' | 'email' | 'gender'> | null;
  room_applications?: AssignmentBoardStudent | AssignmentBoardStudent[] | null;
}

export interface AssignmentBoardRoom extends Room {
  buildings?: { code?: string; name?: string } | null;
  residents: AssignmentBoardResident[];
}

export interface AssignmentBoard {
  rooms: AssignmentBoardRoom[];
  unassigned_students: AssignmentBoardStudent[];
}

function getSessionToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('ksit_session_token');
}

type ApplicationDocumentType = 'student_photo' | 'national_id' | 'family_book' | 'signed_application' | 'prefilled_pdf';

async function openProtectedApplicationDocument(applicationId: string, documentType: ApplicationDocumentType) {
  const token = getSessionToken();
  const response = await fetch(`${API_BASE_URL}/api/applications/${applicationId}/documents/${documentType}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error?.message || 'Unable to open the protected document.');
  }
  const blob = await response.blob();
  const filename = response.headers.get('content-disposition')?.match(/filename="?([^";]+)"?/i)?.[1];
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  if (filename) anchor.download = filename;
  else {
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
  }
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function queryString(params?: Record<string, string | number | undefined>) {
  if (!params) return '';
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  const value = query.toString();
  return value ? `?${value}` : '';
}

async function fetchAPI<T>(endpoint: string, options: RequestInit = {}, authenticated = true): Promise<ApiResponse<T>> {
  try {
    const token = authenticated ? getSessionToken() : null;
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...options,
    });

    const data = (await response.json()) as ApiResponse<T>;
    if (!response.ok) {
      return { success: false, error: { message: data.error?.message || 'The request could not be completed.' } };
    }
    return data;
  } catch (error) {
    return {
      success: false,
      error: { message: error instanceof Error ? error.message : 'An unknown network error occurred.' },
    };
  }
}

async function uploadAPI<T>(endpoint: string, body: FormData, onProgress?: (percent: number) => void): Promise<ApiResponse<T>> {
  return new Promise((resolve) => {
    const token = getSessionToken();
    const request = new XMLHttpRequest();
    request.open('POST', `${API_BASE_URL}${endpoint}`);
    if (token) request.setRequestHeader('Authorization', `Bearer ${token}`);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => resolve({ success: false, error: { message: 'A network error interrupted the file upload.' } });
    request.onload = () => {
      try {
        const data = JSON.parse(request.responseText || '{}') as ApiResponse<T>;
        if (request.status >= 200 && request.status < 300) resolve(data);
        else resolve({ success: false, error: { message: data.error?.message || 'The file upload could not be completed.' } });
      } catch {
        resolve({ success: false, error: { message: 'The file upload returned an invalid response.' } });
      }
    };
    request.send(body);
  });
}

async function downloadAuthenticatedFile(endpoint: string, fallbackFilename: string): Promise<ApiResponse<{ filename: string }>> {
  try {
    const token = getSessionToken();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      return { success: false, error: { message: body?.error?.message || 'The report could not be downloaded.' } };
    }
    const blob = await response.blob();
    const filename = response.headers.get('content-disposition')?.match(/filename="?([^";]+)"?/i)?.[1] || fallbackFilename;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return { success: true, data: { filename }, message: 'Academic report downloaded.' };
  } catch (error) {
    return { success: false, error: { message: error instanceof Error ? error.message : 'The report could not be downloaded.' } };
  }
}

export async function uploadFile(file: File, category: string): Promise<{ success: boolean; url?: string; error?: { message: string } }> {
  const body = new FormData();
  body.append('file', file);
  body.append('category', category);
  const response = await uploadAPI<{ url?: string }>('/api/storage/upload', body);
  return { success: response.success, url: response.data?.url, error: response.error };
}

export const storageAPI = {
  uploadApplicationDocument: (file: File, fieldKey: string, onProgress?: (percent: number) => void) => {
    const body = new FormData();
    body.append('file', file);
    body.append('document_type', fieldKey);
    return uploadAPI<{ path?: string; url?: string }>('/api/storage/upload', body, onProgress);
  },
  createSignedUrl: (bucket: string, path: string) => fetchAPI<{ signedUrl: string }>('/api/storage/signed-url', { method: 'POST', body: JSON.stringify({ bucket, path }) }),
};

export const authAPI = {
  login: (credentials: { identifier: string; password: string }) =>
    fetchAPI<never>('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }, false),
  registerWithTelegram: (payload: { initData: string; full_name_khmer: string; full_name_latin: string; email: string; phone: string; gender: 'male' | 'female'; academic_level: string; academic_major_id: string; academic_year: number; password: string }) =>
    fetchAPI<never>('/api/auth/telegram/register', { method: 'POST', body: JSON.stringify(payload) }, false),
  loginWithTelegram: (initData: string) =>
    fetchAPI<never>('/api/auth/telegram', { method: 'POST', body: JSON.stringify({ initData }) }, false),
  linkTelegram: (initData: string) =>
    fetchAPI<never>('/api/auth/telegram/link', { method: 'POST', body: JSON.stringify({ initData }) }),
  sendPhoneOtp: (phone: string) =>
    fetchAPI<{ resend_after_seconds: number }>('/api/auth/phone/send-otp', { method: 'POST', body: JSON.stringify({ phone }) }, false),
  verifyPhoneOtp: (payload: { phone: string; code: string }) =>
    fetchAPI<never>('/api/auth/phone/verify-otp', { method: 'POST', body: JSON.stringify(payload) }, false),
  logout: () => fetchAPI<never>('/api/auth/logout', { method: 'POST' }),
  getCurrentUser: () => fetchAPI<never>('/api/auth/me'),
  changePassword: (payload: { current_password: string; new_password: string; confirm_password: string }) => fetchAPI<never>('/api/auth/change-password', { method: 'POST', body: JSON.stringify(payload) }),
  requestPasswordReset: (payload: { identifier: string; reason?: string }) => fetchAPI<never>('/api/auth/request-password-reset', { method: 'POST', body: JSON.stringify(payload) }, false),
};

export const dashboardAPI = {
  summary: () => fetchAPI<DashboardSummary>('/api/dashboard/summary'),
  analytics: () => fetchAPI<DashboardAnalytics>('/api/dashboard/analytics'),
};

export const usersAPI = {
  list: (filters?: { role?: UserRole }) => fetchAPI<User[]>(`/api/users${queryString(filters)}`),
  create: (payload: Pick<User, 'full_name_khmer' | 'full_name_latin' | 'email' | 'phone' | 'gender' | 'role'> & { password: string; academic_level?: string; academic_major_id?: string; academic_year?: number }) => fetchAPI<User>('/api/users', { method: 'POST', body: JSON.stringify(payload) }),
  update: (userId: string, payload: Partial<Pick<User, 'full_name_khmer' | 'full_name_latin' | 'email' | 'phone' | 'gender' | 'role'>> & { password?: string; academic_level?: string; academic_major_id?: string; academic_year?: number }) => fetchAPI<User>(`/api/users/${userId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  remove: (userId: string) => fetchAPI<{ id: string }>(`/api/users/${userId}`, { method: 'DELETE' }),
  updateRole: (userId: string, role: UserRole) => fetchAPI<User>(`/api/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  resetPassword: (userId: string, password: string) => fetchAPI<User>(`/api/admin/users/${userId}/reset-password`, { method: 'POST', body: JSON.stringify({ password }) }),
  listPasswordResetRequests: (status: 'pending' | 'resolved' | 'rejected' | 'all' = 'pending') => fetchAPI<PasswordResetRequest[]>(`/api/admin/password-reset-requests${queryString({ status })}`),
  resolvePasswordResetRequest: (requestId: string, payload: { action: 'resolve' | 'reject'; password?: string }) => fetchAPI<PasswordResetRequest>(`/api/admin/password-reset-requests/${requestId}/resolve`, { method: 'POST', body: JSON.stringify(payload) }),
};

export const majorsAPI = {
  public: () => fetchAPI<PublicMajorsCatalog>('/api/public/majors', {}, false),
  listAdmin: (filters?: { search?: string; academic_level?: string; status?: 'active' | 'inactive' }) => fetchAPI<AcademicMajor[]>(`/api/admin/majors${queryString(filters)}`),
  create: (payload: Omit<AcademicMajor, 'id' | 'created_at' | 'updated_at'>) => fetchAPI<AcademicMajor>('/api/admin/majors', { method: 'POST', body: JSON.stringify(payload) }),
  update: (majorId: string, payload: Partial<Omit<AcademicMajor, 'id' | 'created_at' | 'updated_at'>>) => fetchAPI<AcademicMajor>(`/api/admin/majors/${majorId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  removeOrToggle: (majorId: string, mode: 'deactivate' | 'delete' = 'deactivate') => fetchAPI<AcademicMajor | { id: string; deleted: boolean }>(`/api/admin/majors/${majorId}?mode=${mode}`, { method: 'DELETE' }),
  importFile: (body: FormData, onProgress?: (percent: number) => void) => uploadAPI<AcademicMajorImportResult>('/api/admin/majors/import', body, onProgress),
  audit: (filters?: { majorId?: string; action?: AcademicMajorAuditLog['action'] }) => fetchAPI<AcademicMajorAuditLog[]>(`/api/admin/majors/audit${queryString(filters)}`),
};

export const academicAnalyticsAPI = {
  get: (filters?: { academic_level?: string; major_id?: string; academic_year?: number }) => fetchAPI<AcademicAnalyticsReport>(`/api/academic-analytics${queryString(filters)}`),
  downloadExcel: (filters?: { academic_level?: string; major_id?: string; academic_year?: number }) => downloadAuthenticatedFile(`/api/academic-analytics/export${queryString({ ...filters, format: 'xlsx' })}`, 'ksit-academic-major-enrollment.xlsx'),
  downloadPdf: (filters?: { academic_level?: string; major_id?: string; academic_year?: number }) => downloadAuthenticatedFile(`/api/academic-analytics/export${queryString({ ...filters, format: 'pdf' })}`, 'ksit-academic-major-enrollment.pdf'),
};

export const buildingsAPI = {
  list: () => fetchAPI<Building[]>('/api/buildings'),
  create: (payload: Omit<Building, 'id' | 'created_at'>) => fetchAPI<Building>('/api/buildings', { method: 'POST', body: JSON.stringify(payload) }),
  update: (buildingId: string, payload: Partial<Omit<Building, 'id' | 'created_at'>>) => fetchAPI<Building>(`/api/buildings/${buildingId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  remove: (buildingId: string) => fetchAPI<{ id: string }>(`/api/buildings/${buildingId}`, { method: 'DELETE' }),
};

export const roomsAPI = {
  getByQrCode: (qrCode: string) => fetchAPI<Room>(`/api/rooms/qr/${encodeURIComponent(qrCode)}`),
  list: (filters?: { buildingId?: string; status?: string }) => fetchAPI<Room[]>(`/api/rooms${queryString(filters)}`),
  create: (payload: Partial<Room> & { building_id: string; room_number: string; gender: 'male' | 'female' }) => fetchAPI<Room>('/api/rooms', { method: 'POST', body: JSON.stringify(payload) }),
  update: (roomId: string, payload: Partial<Room> & { regenerate_magic_qr?: boolean }) => fetchAPI<Room>(`/api/rooms/${roomId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  remove: (roomId: string) => fetchAPI<{ id: string }>(`/api/rooms/${roomId}`, { method: 'DELETE' }),
};

export const applicationsAPI = {
  list: (filters?: { status?: string; userId?: string }) => fetchAPI<RoomApplication[]>(`/api/applications${queryString(filters)}`),
  // Compatibility alias for the retained legacy dashboard routes.
  getAll: (filters?: Record<string, string | number | undefined>) => fetchAPI<RoomApplication[]>(`/api/applications${queryString(filters)}`),
  submit: (payload: Record<string, unknown>) => fetchAPI<RoomApplication>('/api/applications', { method: 'POST', body: JSON.stringify(payload) }),
  review: (applicationId: string, payload: { status: 'under_review' | 'approved' | 'rejected'; rejection_reason?: string }) => fetchAPI<RoomApplication>(`/api/applications/${applicationId}/review`, { method: 'PATCH', body: JSON.stringify(payload) }),
  autoAssign: (applicationId: string) => fetchAPI(`/api/applications/${applicationId}/auto-assign`, { method: 'POST' }),
  saveDraft: (payload: { academic_year_applied: string; step_progress?: number; form_data: Record<string, unknown> }) => fetchAPI<RoomApplication>('/api/applications/save-draft', { method: 'POST', body: JSON.stringify(payload) }),
  uploadReference: (applicationId: string, documentType: 'student_photo' | 'national_id' | 'family_book', file: File, onProgress?: (percent: number) => void) => {
    const form = new FormData();
    form.set('file', file);
    return uploadAPI<RoomApplication>(`/api/applications/${applicationId}/references/${documentType}`, form, onProgress);
  },
  submitForm: (payload: { application_id: string; profile: Record<string, unknown>; form_data: Record<string, unknown> }) => fetchAPI<RoomApplication>('/api/applications/submit-form', { method: 'POST', body: JSON.stringify(payload) }),
  uploadSigned: (applicationId: string, file: File, onProgress?: (percent: number) => void) => {
    const form = new FormData();
    form.set('application_id', applicationId);
    form.set('file', file);
    return uploadAPI<RoomApplication>('/api/applications/upload-signed', form, onProgress);
  },
  mine: (academicYear?: string) => fetchAPI<RoomApplication | null>(`/api/applications/my-application${queryString({ academic_year: academicYear })}`),
  prefilledPdf: (applicationId: string) => fetchAPI<{ url: string; expires_in_seconds: number }>(`/api/applications/${applicationId}/prefilled-pdf`),
  openDocument: openProtectedApplicationDocument,
  managerList: (filters?: { status?: string }) => fetchAPI<RoomApplication[]>(`/api/manager/applications${queryString(filters)}`),
  managerReview: (applicationId: string, payload: { action: 'approve' | 'request_correction' | 'reject'; manager_notes?: string }) => fetchAPI<RoomApplication>(`/api/manager/applications/${applicationId}/review`, { method: 'PATCH', body: JSON.stringify(payload) }),
};

export const roomAssignmentsAPI = {
  board: () => fetchAPI<AssignmentBoard>('/api/room-assignment-board'),
  manualMove: (payload: { application_id: string; target_room_id: string }) => fetchAPI('/api/room-assignments/manual-move', { method: 'POST', body: JSON.stringify(payload) }),
};

// Compatibility facades keep historical dashboard URLs buildable while the
// current role dashboards use the consolidated domain endpoints above.
export const assignmentsAPI = {
  getAll: (filters?: Record<string, string | number | boolean | undefined>) => fetchAPI<unknown[]>(`/api/room-assignments${queryString(filters as Record<string, string | number | undefined>)}`),
  create: (payload: Record<string, unknown>) => fetchAPI('/api/room-assignments', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, payload: Record<string, unknown>) => fetchAPI(`/api/room-assignments/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  remove: (id: string) => fetchAPI(`/api/room-assignments/${id}`, { method: 'DELETE' }),
};

export const attendancesAPI = {
  getAll: (filters?: Record<string, string | number | undefined>) => fetchAPI<Attendance[]>(`/api/attendance${queryString(filters)}`),
  create: (payload: Record<string, unknown>) => fetchAPI('/api/attendance/scan', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, payload: Record<string, unknown>) => fetchAPI(`/api/attendance/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  remove: (id: string) => fetchAPI(`/api/attendance/${id}`, { method: 'DELETE' }),
};

export const utilityBillsAPI = {
  getAll: (filters?: Record<string, string | number | undefined>) => fetchAPI<UtilityBill[]>(`/api/utility-bills${queryString(filters)}`),
  create: (payload: Record<string, unknown>) => fetchAPI('/api/utility-bills', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, payload: Record<string, unknown>) => fetchAPI(`/api/utility-bills/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  remove: (id: string) => fetchAPI(`/api/utility-bills/${id}`, { method: 'DELETE' }),
};

export const billingAPI = {
  exportToDrive: (month: string) => fetchAPI<{ month: string; records: number; url: string | null }>('/api/billing/export-drive', { method: 'POST', body: JSON.stringify({ month }) }),
  listUtility: (filters?: { roomId?: string; month?: string }) => fetchAPI<UtilityBill[]>(`/api/utility-bills${queryString(filters)}`),
  createUtility: (payload: Record<string, unknown>) => fetchAPI('/api/utility-bills', { method: 'POST', body: JSON.stringify(payload) }),
  listStudent: (filters?: { studentId?: string; status?: string }) => fetchAPI<StudentBill[]>(`/api/student-bills${queryString(filters)}`),
  markPaid: (studentBillId: string, payload: { transaction_ref: string; payment_method?: string }) => fetchAPI<StudentBill>(`/api/student-bills/${studentBillId}/payment`, { method: 'PATCH', body: JSON.stringify(payload) }),
};

export const residenceAPI = {
  mine: () => fetchAPI('/api/residence'),
};

export const magicQrAPI = {
  resolve: (magic_qr_code: string) => fetchAPI('/api/magic-qr/resolve', { method: 'POST', body: JSON.stringify({ magic_qr_code }) }),
  scanAttendance: (payload: { magic_qr_code: string; student_id: string; status?: 'present' | 'absent' | 'leave'; leave_reason?: string; attendance_date?: string }) => fetchAPI('/api/attendance/scan', { method: 'POST', body: JSON.stringify(payload) }),
};

export const attendanceAPI = {
  exportToDrive: (month: string) => fetchAPI<{ month: string; records: number; url: string | null }>('/api/attendances/export-drive', { method: 'POST', body: JSON.stringify({ month }) }),
  list: (filters?: { date?: string; roomId?: string; studentId?: string }) => fetchAPI<Attendance[]>(`/api/attendance${queryString(filters)}`),
};

export const maintenanceAPI = {
  list: (filters?: { status?: string; roomId?: string }) => fetchAPI<MaintenanceRequest[]>(`/api/maintenance${queryString(filters)}`),
  create: (payload: Record<string, unknown>) => fetchAPI<MaintenanceRequest>('/api/maintenance', { method: 'POST', body: JSON.stringify(payload) }),
  update: (maintenanceId: string, payload: { status: 'open' | 'in_progress' | 'resolved' | 'cancelled'; resolution_notes?: string }) => fetchAPI<MaintenanceRequest>(`/api/maintenance/${maintenanceId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
};

export const healthCheck = () => fetchAPI<never>('/health', { method: 'GET' }, false);
