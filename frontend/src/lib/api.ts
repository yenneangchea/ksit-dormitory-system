import type {
  Attendance,
  Building,
  MaintenanceRequest,
  Room,
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

export const authAPI = {
  login: (credentials: { identifier: string; password: string }) =>
    fetchAPI<never>('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }, false),
  loginWithTelegram: (initData: string) =>
    fetchAPI<never>('/api/auth/telegram', { method: 'POST', body: JSON.stringify({ initData }) }, false),
  logout: () => fetchAPI<never>('/api/auth/logout', { method: 'POST' }),
  getCurrentUser: () => fetchAPI<never>('/api/auth/me'),
};

export const dashboardAPI = {
  summary: () => fetchAPI<DashboardSummary>('/api/dashboard/summary'),
};

export const usersAPI = {
  list: (filters?: { role?: UserRole }) => fetchAPI<User[]>(`/api/users${queryString(filters)}`),
  updateRole: (userId: string, role: UserRole) => fetchAPI<User>(`/api/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
};

export const buildingsAPI = {
  list: () => fetchAPI<Building[]>('/api/buildings'),
  create: (payload: Omit<Building, 'id' | 'created_at'>) => fetchAPI<Building>('/api/buildings', { method: 'POST', body: JSON.stringify(payload) }),
};

export const roomsAPI = {
  list: (filters?: { buildingId?: string; status?: string }) => fetchAPI<Room[]>(`/api/rooms${queryString(filters)}`),
  create: (payload: Partial<Room> & { building_id: string; room_number: string; gender: 'male' | 'female' }) => fetchAPI<Room>('/api/rooms', { method: 'POST', body: JSON.stringify(payload) }),
};

export const applicationsAPI = {
  list: (filters?: { status?: string; userId?: string }) => fetchAPI<RoomApplication[]>(`/api/applications${queryString(filters)}`),
  submit: (payload: Record<string, unknown>) => fetchAPI<RoomApplication>('/api/applications', { method: 'POST', body: JSON.stringify(payload) }),
  review: (applicationId: string, payload: { status: 'under_review' | 'approved' | 'rejected'; rejection_reason?: string }) => fetchAPI<RoomApplication>(`/api/applications/${applicationId}/review`, { method: 'PATCH', body: JSON.stringify(payload) }),
  autoAssign: (applicationId: string) => fetchAPI(`/api/applications/${applicationId}/auto-assign`, { method: 'POST' }),
};

export const billingAPI = {
  listUtility: (filters?: { roomId?: string; month?: string }) => fetchAPI<UtilityBill[]>(`/api/utility-bills${queryString(filters)}`),
  createUtility: (payload: Record<string, unknown>) => fetchAPI('/api/utility-bills', { method: 'POST', body: JSON.stringify(payload) }),
  listStudent: (filters?: { studentId?: string; status?: string }) => fetchAPI<StudentBill[]>(`/api/student-bills${queryString(filters)}`),
  markPaid: (studentBillId: string, payload: { transaction_ref: string; payment_method?: string }) => fetchAPI<StudentBill>(`/api/student-bills/${studentBillId}/payment`, { method: 'PATCH', body: JSON.stringify(payload) }),
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
