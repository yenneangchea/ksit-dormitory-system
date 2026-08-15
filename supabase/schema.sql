-- ==============================================================================
-- KAMPONG SPEU INSTITUTE OF TECHNOLOGY (KSIT) - DORMITORY MANAGEMENT SYSTEM
-- COMPLETE POSTGRESQL DATABASE SCHEMA (DDL)
-- Target Database: PostgreSQL 14+
-- Author: Senior Full-Stack Architect
-- ==============================================================================

-- 1. EXTENSIONS & CUSTOM ENUM TYPES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('admin', 'manager', 'teacher', 'student');
CREATE TYPE gender_type AS ENUM ('male', 'female');
CREATE TYPE building_gender_type AS ENUM ('male', 'female', 'mixed');
CREATE TYPE application_status AS ENUM ('draft', 'form_completed', 'pending_signed_doc', 'under_review', 'approved', 'rejected', 'correction_needed', 'assigned', 'submitted');
CREATE TYPE room_status AS ENUM ('available', 'full', 'maintenance');
CREATE TYPE bill_status AS ENUM ('unpaid', 'paid', 'overdue');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'leave');
CREATE TYPE maintenance_category AS ENUM ('electricity', 'plumbing', 'furniture', 'door_lock', 'internet', 'other');
CREATE TYPE maintenance_urgency AS ENUM ('low', 'medium', 'high', 'emergency');
CREATE TYPE maintenance_status AS ENUM ('open', 'in_progress', 'resolved', 'cancelled');

-- ------------------------------------------------------------------------------
-- 2. USERS TABLE
-- Stores credentials and user profile information across Admin, Manager, Teacher, Student
-- ------------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id VARCHAR(50) UNIQUE,
    role user_role NOT NULL DEFAULT 'student',
    full_name_khmer VARCHAR(255) NOT NULL,
    full_name_latin VARCHAR(255) NOT NULL,
    gender gender_type NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_gender ON users(gender);

-- ------------------------------------------------------------------------------
-- 3. ACADEMIC PROFILES TABLE
-- Stores detailed Khmer Application Document fields (Family, Birthplace, Student ID, Guarantor)
-- ------------------------------------------------------------------------------
CREATE TABLE academic_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    student_id_card VARCHAR(50) NOT NULL UNIQUE,
    major VARCHAR(150) NOT NULL,
    academic_year INT NOT NULL CHECK (academic_year BETWEEN 1 AND 4),
    class_section VARCHAR(50),
    scholarship_type VARCHAR(100) DEFAULT 'Full Scholarship',
    date_of_birth DATE NOT NULL,
    place_of_birth TEXT NOT NULL,
    national_id_number VARCHAR(50),
    current_address TEXT NOT NULL,
    
    -- Father Information
    father_name VARCHAR(255) NOT NULL,
    father_age INT,
    father_occupation VARCHAR(255),
    father_phone VARCHAR(20),
    father_address TEXT,
    
    -- Mother Information
    mother_name VARCHAR(255) NOT NULL,
    mother_age INT,
    mother_occupation VARCHAR(255),
    mother_phone VARCHAR(20),
    mother_address TEXT,
    
    -- Guarantor / Emergency Contact
    guarantor_name VARCHAR(255) NOT NULL,
    guarantor_relation VARCHAR(100) NOT NULL,
    guarantor_phone VARCHAR(20) NOT NULL,
    guarantor_address TEXT,

    -- Extended official application form fields
    ethnicity VARCHAR(100) DEFAULT 'ខ្មែរ',
    nationality VARCHAR(100) DEFAULT 'កម្ពុជា',
    marital_status VARCHAR(50) DEFAULT 'នៅលីវ',
    spouse_name VARCHAR(255),
    spouse_occupation VARCHAR(255),
    siblings_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    education_history_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    emergency_contacts_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_academic_profiles_major ON academic_profiles(major);
CREATE INDEX idx_academic_profiles_year ON academic_profiles(academic_year);

-- ------------------------------------------------------------------------------
-- 4. BUILDINGS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE buildings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    gender_restriction building_gender_type NOT NULL DEFAULT 'male',
    total_floors INT NOT NULL DEFAULT 1,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 5. ROOMS TABLE
-- Stores rooms with capacity, assigned gender, and door Magic QR payloads
-- ------------------------------------------------------------------------------
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    room_number VARCHAR(50) NOT NULL UNIQUE,
    floor_number INT NOT NULL DEFAULT 1,
    capacity INT NOT NULL DEFAULT 4 CHECK (capacity > 0),
    occupied_count INT NOT NULL DEFAULT 0 CHECK (occupied_count <= capacity),
    gender gender_type NOT NULL,
    assigned_major VARCHAR(150),
    assigned_year INT CHECK (assigned_year BETWEEN 1 AND 4),
    magic_qr_code VARCHAR(255) NOT NULL UNIQUE,
    status room_status NOT NULL DEFAULT 'available',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rooms_building ON rooms(building_id);
CREATE INDEX idx_rooms_gender_status ON rooms(gender, status);
CREATE INDEX idx_rooms_magic_qr ON rooms(magic_qr_code);

-- ------------------------------------------------------------------------------
-- 6. ROOM APPLICATIONS TABLE
-- Yearly dormitory stay applications with attached document verification checks
-- ------------------------------------------------------------------------------
CREATE TABLE room_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    academic_year_applied VARCHAR(20) NOT NULL DEFAULT '2025-2026',
    status application_status NOT NULL DEFAULT 'submitted',
    
    -- Mandatory attached document verification (Word Doc requirements)
    photo_4x6_attached BOOLEAN NOT NULL DEFAULT FALSE,
    contract_signed BOOLEAN NOT NULL DEFAULT FALSE,
    parent_guarantee_attached BOOLEAN NOT NULL DEFAULT FALSE,
    family_book_attached BOOLEAN NOT NULL DEFAULT FALSE,
    id_card_attached BOOLEAN NOT NULL DEFAULT FALSE,

    -- Five-stage digital application, printable PDF, and signed-document evidence
    prefilled_pdf_url TEXT,
    prefilled_pdf_generated_at TIMESTAMPTZ,
    student_photo_url TEXT,
    national_id_doc_url TEXT,
    family_book_doc_url TEXT,
    signed_application_doc_url TEXT,
    document_metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    form_data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    manager_notes TEXT,
    submission_step INT NOT NULL DEFAULT 1 CHECK (submission_step BETWEEN 1 AND 5),
    submitted_for_review_at TIMESTAMPTZ,
    
    rejection_reason TEXT,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id)
);

CREATE INDEX idx_applications_user ON room_applications(user_id);
CREATE INDEX idx_applications_status ON room_applications(status);

-- ------------------------------------------------------------------------------
-- 7. ROOM ASSIGNMENTS TABLE
-- Stores active and historical bed allocations produced by Waterfall Auto-Assign or Manager
-- ------------------------------------------------------------------------------
CREATE TABLE room_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES room_applications(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    bed_number INT NOT NULL CHECK (bed_number >= 1),
    academic_year VARCHAR(20) NOT NULL DEFAULT '2025-2026',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    vacated_at TIMESTAMPTZ,
    UNIQUE(room_id, bed_number, academic_year, is_active)
);

CREATE INDEX idx_assignments_student ON room_assignments(student_id);
CREATE INDEX idx_assignments_room_active ON room_assignments(room_id, is_active);

-- ------------------------------------------------------------------------------
-- 8. UTILITY BILLS TABLE (Room Total Billing)
-- Stores monthly meter readings and total costs per room
-- ------------------------------------------------------------------------------
CREATE TABLE utility_bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    billing_month VARCHAR(7) NOT NULL, -- Format YYYY-MM (e.g. '2026-08')
    prev_electric_reading NUMERIC(10,2) NOT NULL DEFAULT 0,
    curr_electric_reading NUMERIC(10,2) NOT NULL DEFAULT 0,
    electric_rate_khr NUMERIC(10,2) NOT NULL DEFAULT 800.00, -- 800 KHR / kWh
    prev_water_reading NUMERIC(10,2) NOT NULL DEFAULT 0,
    curr_water_reading NUMERIC(10,2) NOT NULL DEFAULT 0,
    water_rate_khr NUMERIC(10,2) NOT NULL DEFAULT 1500.00, -- 1500 KHR / m3
    trash_fee_khr NUMERIC(10,2) NOT NULL DEFAULT 10000.00,
    
    total_electric_cost_khr NUMERIC(10,2) GENERATED ALWAYS AS ((curr_electric_reading - prev_electric_reading) * electric_rate_khr) STORED,
    total_water_cost_khr NUMERIC(10,2) GENERATED ALWAYS AS ((curr_water_reading - prev_water_reading) * water_rate_khr) STORED,
    total_amount_khr NUMERIC(10,2) GENERATED ALWAYS AS (((curr_electric_reading - prev_electric_reading) * electric_rate_khr) + ((curr_water_reading - prev_water_reading) * water_rate_khr) + trash_fee_khr) STORED,
    
    active_students_count INT NOT NULL DEFAULT 1,
    split_amount_per_student_khr NUMERIC(10,2) NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, billing_month)
);

CREATE INDEX idx_utility_bills_room_month ON utility_bills(room_id, billing_month);

-- ------------------------------------------------------------------------------
-- 9. STUDENT BILLS TABLE (Individual KHQR Dynamic Bills)
-- Generated for each student in the room based on dynamic split bill logic
-- ------------------------------------------------------------------------------
CREATE TABLE student_bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    utility_bill_id UUID NOT NULL REFERENCES utility_bills(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    billing_month VARCHAR(7) NOT NULL,
    amount_khr NUMERIC(10,2) NOT NULL,
    amount_usd NUMERIC(10,2) NOT NULL,
    khqr_string TEXT NOT NULL, -- NBC Bakong EMVCo QR Payload
    khqr_md5 VARCHAR(64),
    bill_status bill_status NOT NULL DEFAULT 'unpaid',
    payment_method VARCHAR(50),
    transaction_ref VARCHAR(100),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_student_bills_student ON student_bills(student_id);
CREATE INDEX idx_student_bills_status ON student_bills(bill_status);

-- ------------------------------------------------------------------------------
-- 10. ATTENDANCES TABLE
-- Daily room attendance based on PDF sheet format recorded via door Magic QR scan
-- ------------------------------------------------------------------------------
CREATE TABLE attendances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status attendance_status NOT NULL DEFAULT 'present',
    leave_reason TEXT,
    recorded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, student_id, attendance_date)
);

CREATE INDEX idx_attendances_room_date ON attendances(room_id, attendance_date);
CREATE INDEX idx_attendances_student ON attendances(student_id);

-- ------------------------------------------------------------------------------
-- 11. MAINTENANCE REQUESTS TABLE
-- Maintenance tickets logged by students via Magic Door QR Code / Telegram Mini App
-- ------------------------------------------------------------------------------
CREATE TABLE maintenance_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    reported_by_student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category maintenance_category NOT NULL DEFAULT 'other',
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    urgency maintenance_urgency NOT NULL DEFAULT 'medium',
    status maintenance_status NOT NULL DEFAULT 'open',
    photo_url TEXT,
    resolution_notes TEXT,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_maintenance_room ON maintenance_requests(room_id);
CREATE INDEX idx_maintenance_status ON maintenance_requests(status);

-- ==============================================================================
-- AUTOMATIC TRIGGER: UPDATE ROOM OCCUPIED COUNT & STATUS
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_room_occupancy()
RETURNS TRIGGER AS $$
DECLARE
    curr_count INT;
    room_cap INT;
BEGIN
    -- Get current active assignments count
    SELECT COUNT(*), r.capacity INTO curr_count, room_cap
    FROM room_assignments ra
    JOIN rooms r ON r.id = COALESCE(NEW.room_id, OLD.room_id)
    WHERE ra.room_id = COALESCE(NEW.room_id, OLD.room_id) AND ra.is_active = TRUE
    GROUP BY r.capacity;

    curr_count := COALESCE(curr_count, 0);

    -- Update rooms table
    UPDATE rooms
    SET occupied_count = curr_count,
        status = CASE 
            WHEN curr_count >= room_cap THEN 'full'::room_status
            ELSE 'available'::room_status
        END
    WHERE id = COALESCE(NEW.room_id, OLD.room_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_room_occupancy
AFTER INSERT OR UPDATE OR DELETE ON room_assignments
FOR EACH ROW EXECUTE FUNCTION update_room_occupancy();
-- Apply this file in the Supabase SQL Editor before starting the API.
