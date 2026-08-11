/**
 * Type definitions for KSIT Dormitory Management System
 * Based on the PostgreSQL schema in system_design.md
 */

export type UserRole = 'admin' | 'manager' | 'teacher' | 'student';
export type Gender = 'male' | 'female';
export type BuildingGenderType = 'male' | 'female' | 'mixed';
export type ApplicationStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'assigned';
export type RoomStatus = 'available' | 'full' | 'maintenance';
export type BillStatus = 'unpaid' | 'paid' | 'overdue';
export type AttendanceStatus = 'present' | 'absent' | 'leave';
export type MaintenanceCategory = 'electricity' | 'plumbing' | 'furniture' | 'door_lock' | 'internet' | 'other';
export type MaintenanceUrgency = 'low' | 'medium' | 'high' | 'emergency';
export type MaintenanceStatus = 'open' | 'in_progress' | 'resolved' | 'cancelled';

export interface User {
  id: string;
  telegram_id?: string;
  role: UserRole;
  full_name_khmer: string;
  full_name_latin: string;
  gender: Gender;
  phone: string;
  email: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface AcademicProfile {
  id: string;
  user_id: string;
  student_id_card: string;
  major: string;
  academic_year: number;
  class_section?: string;
  scholarship_type?: string;
  date_of_birth: string;
  place_of_birth: string;
  national_id_number?: string;
  current_address: string;
  father_name: string;
  father_age?: number;
  father_occupation?: string;
  father_phone?: string;
  father_address?: string;
  mother_name: string;
  mother_age?: number;
  mother_occupation?: string;
  mother_phone?: string;
  mother_address?: string;
  guarantor_name: string;
  guarantor_relation: string;
  guarantor_phone: string;
  guarantor_address?: string;
  created_at: string;
}

export interface Building {
  id: string;
  code: string;
  name: string;
  gender_restriction: BuildingGenderType;
  total_floors: number;
  description?: string;
  created_at: string;
}

export interface Room {
  id: string;
  building_id: string;
  room_number: string;
  floor_number: number;
  capacity: number;
  occupied_count: number;
  gender: Gender;
  assigned_major?: string;
  assigned_year?: number;
  magic_qr_code: string;
  status: RoomStatus;
  created_at: string;
}

export interface RoomApplication {
  id: string;
  user_id: string;
  academic_year_applied: string;
  status: ApplicationStatus;
  photo_4x6_attached: boolean;
  contract_signed: boolean;
  parent_guarantee_attached: boolean;
  family_book_attached: boolean;
  id_card_attached: boolean;
  rejection_reason?: string;
  applied_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export interface RoomAssignment {
  id: string;
  application_id: string;
  student_id: string;
  room_id: string;
  bed_number: number;
  academic_year: string;
  is_active: boolean;
  assigned_at: string;
  vacated_at?: string;
}

export interface UtilityBill {
  id: string;
  room_id: string;
  billing_month: string;
  prev_electric_reading: number;
  curr_electric_reading: number;
  electric_rate_khr: number;
  prev_water_reading: number;
  curr_water_reading: number;
  water_rate_khr: number;
  trash_fee_khr: number;
  total_electric_cost_khr: number;
  total_water_cost_khr: number;
  total_amount_khr: number;
  active_students_count: number;
  split_amount_per_student_khr: number;
  created_by?: string;
  created_at: string;
}

export interface StudentBill {
  id: string;
  utility_bill_id: string;
  student_id: string;
  room_id: string;
  billing_month: string;
  amount_khr: number;
  amount_usd: number;
  khqr_string: string;
  khqr_md5?: string;
  bill_status: BillStatus;
  payment_method?: string;
  transaction_ref?: string;
  paid_at?: string;
  created_at: string;
}

export interface Attendance {
  id: string;
  room_id: string;
  student_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  leave_reason?: string;
  recorded_by: string;
  created_at: string;
}

export interface MaintenanceRequest {
  id: string;
  room_id: string;
  reported_by_student_id: string;
  category: MaintenanceCategory;
  title: string;
  description: string;
  urgency: MaintenanceUrgency;
  status: MaintenanceStatus;
  photo_url?: string;
  resolution_notes?: string;
  resolved_by?: string;
  created_at: string;
  updated_at: string;
}
