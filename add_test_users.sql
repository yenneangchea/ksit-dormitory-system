-- ============================================================
-- KSIT Dormitory - Test Users
-- Run this in Supabase SQL Editor to create test users
-- ============================================================

-- Admin User
INSERT INTO users (role, full_name_khmer, full_name_latin, gender, phone, email, password_hash)
VALUES (
    'admin',
    'អ្នកគ្រប់គ្រងប្រព័ន្ធ',
    'System Administrator',
    'male',
    '012-345-678',
    'admin@ksit.edu.kh',
    'mock_password_hash'
)
ON CONFLICT (email) DO NOTHING;

-- Manager User
INSERT INTO users (role, full_name_khmer, full_name_latin, gender, phone, email, password_hash)
VALUES (
    'manager',
    'អ្នកគ្រប់គ្រងអន្តេវាសិកដ្ឋាន',
    'Dormitory Manager',
    'female',
    '012-345-679',
    'manager@ksit.edu.kh',
    'mock_password_hash'
)
ON CONFLICT (email) DO NOTHING;

-- Teacher User
INSERT INTO users (role, full_name_khmer, full_name_latin, gender, phone, email, password_hash)
VALUES (
    'teacher',
    'គ្រូបង្រៀន សូម៉ា',
    'Teacher Soma',
    'male',
    '012-345-680',
    'teacher@ksit.edu.kh',
    'mock_password_hash'
)
ON CONFLICT (email) DO NOTHING;

-- Student User
INSERT INTO users (role, full_name_khmer, full_name_latin, gender, phone, email, password_hash)
VALUES (
    'student',
    'និស្សិត វិចិត្រ',
    'Student Vichit',
    'male',
    '012-345-681',
    'student@ksit.edu.kh',
    'mock_password_hash'
)
ON CONFLICT (email) DO NOTHING;

-- Additional Student User (Female)
INSERT INTO users (role, full_name_khmer, full_name_latin, gender, phone, email, password_hash)
VALUES (
    'student',
    'និស្សិត សុភា',
    'Student Sophia',
    'female',
    '012-345-682',
    'sophia@ksit.edu.kh',
    'mock_password_hash'
)
ON CONFLICT (email) DO NOTHING;

-- Verify users created
SELECT
    role,
    full_name_latin,
    email,
    created_at
FROM users
ORDER BY role, created_at;
