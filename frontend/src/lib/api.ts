import type {
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
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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

async function uploadAPI<T>(endpoint: string, body: FormData): Promise<ApiResponse<T>> {
  try {
    const token = getSessionToken();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body,
    });
    const data = (await response.json()) as ApiResponse<T>;
    if (!response.ok) return { success: false, error: { message: data.error?.message || 'The file upload could not be completed.' } };
    return data;
  } catch (error) {
    return { success: false, error: { message: error instanceof Error ? error.message : 'An unknown upload error occurred.' } };
  }
}

export const authAPI = {
  login: (credentials: { identifier: string; password: string }) =>
    fetchAPI<never>('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }, false),
  registerWithTelegram: (payload: { initData: string; full_name_khmer: string; full_name_latin: string; email: string; phone: string; gender: 'male' | 'female'; password: string }) =>
    fetchAPI<never>('/api/auth/telegram/register', { method: 'POST', body: JSON.stringify(payload) }, false),
  loginWithTelegram: (initData: string) =>
    fetchAPI<never>('/api/auth/telegram', { method: 'POST', body: JSON.stringify({ initData }) }, false),
  logout: () => fetchAPI<never>('/api/auth/logout', { method: 'POST' }),
  getCurrentUser: () => fetchAPI<never>('/api/auth/me'),
};

export const dashboardAPI = {
  summary: () => fetchAPI<DashboardSummary>('/api/dashboard/summary'),
  analytics: () => fetchAPI<DashboardAnalytics>('/api/dashboard/analytics'),
};

export const usersAPI = {
  list: (filters?: { role?: UserRole }) => fetchAPI<User[]>(`/api/users${queryString(filters)}`),
  create: (payload: Pick<User, 'full_name_khmer' | 'full_name_latin' | 'email' | 'phone' | 'gender' | 'role'> & { password: string }) => fetchAPI<User>('/api/users', { method: 'POST', body: JSON.stringify(payload) }),
  update: (userId: string, payload: Partial<Pick<User, 'full_name_khmer' | 'full_name_latin' | 'email' | 'phone' | 'gender' | 'role'>> & { password?: string }) => fetchAPI<User>(`/api/users/${userId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  remove: (userId: string) => fetchAPI<{ id: string }>(`/api/users/${userId}`, { method: 'DELETE' }),
  updateRole: (userId: string, role: UserRole) => fetchAPI<User>(`/api/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
};

export const buildingsAPI = {
  list: () => fetchAPI<Building[]>('/api/buildings'),
  create: (payload: Omit<Building, 'id' | 'created_at'>) => fetchAPI<Building>('/api/buildings', { method: 'POST', body: JSON.stringify(payload) }),
  update: (buildingId: string, payload: Partial<Omit<Building, 'id' | 'created_at'>>) => fetchAPI<Building>(`/api/buildings/${buildingId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  remove: (buildingId: string) => fetchAPI<{ id: string }>(`/api/buildings/${buildingId}`, { method: 'DELETE' }),
};

export const roomsAPI = {
  list: (filters?: { buildingId?: string; status?: string }) => fetchAPI<Room[]>(`/api/rooms${queryString(filters)}`),
  create: (payload: Partial<Room> & { building_id: string; room_number: string; gender: 'male' | 'female' }) => fetchAPI<Room>('/api/rooms', { method: 'POST', body: JSON.stringify(payload) }),
  update: (roomId: string, payload: Partial<Room> & { regenerate_magic_qr?: boolean }) => fetchAPI<Room>(`/api/rooms/${roomId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  remove: (roomId: string) => fetchAPI<{ id: string }>(`/api/rooms/${roomId}`, { method: 'DELETE' }),
};

export const applicationsAPI = {
  list: (filters?: { status?: string; userId?: string }) => fetchAPI<RoomApplication[]>(`/api/applications${queryString(filters)}`),
  submit: (payload: Record<string, unknown>) => fetchAPI<RoomApplication>('/api/applications', { method: 'POST', body: JSON.stringify(payload) }),
  review: (applicationId: string, payload: { status: 'under_review' | 'approved' | 'rejected'; rejection_reason?: string }) => fetchAPI<RoomApplication>(`/api/applications/${applicationId}/review`, { method: 'PATCH', body: JSON.stringify(payload) }),
  autoAssign: (applicationId: string) => fetchAPI(`/api/applications/${applicationId}/auto-assign`, { method: 'POST' }),
  saveDraft: (payload: { academic_year_applied: string; form_data: Record<string, unknown> }) => fetchAPI<RoomApplication>('/api/applications/save-draft', { method: 'POST', body: JSON.stringify(payload) }),
  uploadReference: (applicationId: string, documentType: 'student_photo' | 'national_id' | 'family_book', file: File) => {
    const form = new FormData();
    form.set('file', file);
    return uploadAPI<RoomApplication>(`/api/applications/${applicationId}/references/${documentType}`, form);
  },
  submitForm: (payload: { application_id: string; profile: Record<string, unknown>; form_data: Record<string, unknown> }) => fetchAPI<RoomApplication>('/api/applications/submit-form', { method: 'POST', body: JSON.stringify(payload) }),
  uploadSigned: (applicationId: string, file: File) => {
    const form = new FormData();
    form.set('application_id', applicationId);
    form.set('file', file);
    return uploadAPI<RoomApplication>('/api/applications/upload-signed', form);
  },
  mine: (academicYear?: string) => fetchAPI<RoomApplication | null>(`/api/applications/my-application${queryString({ academic_year: academicYear })}`),
  prefilledPdf: (applicationId: string) => fetchAPI<{ url: string; expires_in_seconds: number }>(`/api/applications/${applicationId}/prefilled-pdf`),
  managerList: (filters?: { status?: string }) => fetchAPI<RoomApplication[]>(`/api/manager/applications${queryString(filters)}`),
  managerReview: (applicationId: string, payload: { action: 'approve' | 'request_correction' | 'reject'; manager_notes?: string }) => fetchAPI<RoomApplication>(`/api/manager/applications/${applicationId}/review`, { method: 'PATCH', body: JSON.stringify(payload) }),
};

export const roomAssignmentsAPI = {
  board: () => fetchAPI<AssignmentBoard>('/api/room-assignment-board'),
  manualMove: (payload: { application_id: string; target_room_id: string }) => fetchAPI('/api/room-assignments/manual-move', { method: 'POST', body: JSON.stringify(payload) }),
};

export const billingAPI = {
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
  list: (filters?: { date?: string; roomId?: string; studentId?: string }) => fetchAPI<Attendance[]>(`/api/attendance${queryString(filters)}`),
};

export const maintenanceAPI = {
  list: (filters?: { status?: string; roomId?: string }) => fetchAPI<MaintenanceRequest[]>(`/api/maintenance${queryString(filters)}`),
  create: (payload: Record<string, unknown>) => fetchAPI<MaintenanceRequest>('/api/maintenance', { method: 'POST', body: JSON.stringify(payload) }),
  update: (maintenanceId: string, payload: { status: 'open' | 'in_progress' | 'resolved' | 'cancelled'; resolution_notes?: string }) => fetchAPI<MaintenanceRequest>(`/api/maintenance/${maintenanceId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
};

export const healthCheck = () => fetchAPI<never>('/health', { method: 'GET' }, false);
